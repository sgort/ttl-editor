import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import DMNTab from './DMNTab';

/**
 * The evaluation request body the tab prefills after a DMN is uploaded.
 *
 * Nobody types this JSON by hand: the tab reads the model's input variables and
 * proposes a plausible value and Operaton type for each, so Evaluate can be
 * pressed immediately. Getting a type wrong does not fail loudly — Operaton
 * accepts the request and returns something unexpected — so the mapping from DMN
 * to request body is worth pinning precisely.
 *
 * There are two sources, in priority order. An `inputValues` constraint on the
 * decision table column wins, because it lists values the model actually
 * accepts. Failing that, the input's `typeRef` decides, and for dates the
 * variable's *name* decides whether a birth date or a recent date is more
 * plausible — a request for a decision about age wants a date of birth, not
 * today.
 */

const defaultDmnData = {
  fileName: '',
  content: '',
  decisionKey: '',
  deployed: false,
  deploymentId: null,
  deployedAt: null,
  apiEndpoint: 'https://operaton.open-regels.nl/engine-rest',
  lastTestResult: null,
  lastTestTimestamp: null,
  testBody: null,
  importedDmnBlocks: null,
  isImported: false,
  validationStatus: 'not-validated',
  validatedBy: '',
  validatedAt: '',
  validationNote: '',
};

/**
 * A harness that owns dmnData.
 *
 * The tab reveals its evaluation controls only once a model is loaded, and it
 * reports that by calling setDmnData — so a vi.fn() setter leaves the Request
 * Body field unrendered no matter what is uploaded.
 */
function Harness() {
  const [dmnData, setDmnData] = useState(defaultDmnData);
  return <DMNTab dmnData={dmnData} setDmnData={setDmnData} setConcepts={vi.fn()} />;
}

const renderTab = () => render(<Harness />);

/**
 * A DMN document with the given input variables.
 *
 * `inputs` entries: { name, typeRef?, allowed? } — `allowed` becomes an
 * inputValues constraint on a matching decision-table column.
 */
const dmnWith = (inputs) => {
  const inputData = inputs
    .map(
      ({ name, typeRef }) =>
        `<inputData id="id_${name}" name="${name}">` +
        (typeRef ? `<variable name="${name}" typeRef="${typeRef}" />` : '') +
        `</inputData>`
    )
    .join('');

  const columns = inputs
    .filter((i) => i.allowed !== undefined)
    .map(
      ({ name, allowed }) =>
        `<input id="col_${name}"><inputExpression id="e_${name}"><text>${name}</text>` +
        `</inputExpression><inputValues id="v_${name}"><text>${allowed}</text></inputValues></input>`
    )
    .join('');

  return (
    `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">` +
    inputData +
    `<decision id="Bepaal" name="Bepaal"><decisionTable id="t">${columns}</decisionTable></decision>` +
    `</definitions>`
  );
};

/** Upload a model and return the prefilled request body, parsed. */
const bodyAfterUpload = async (xml) => {
  fireEvent.change(screen.getByLabelText('Choose a file'), {
    target: { files: [new File([xml], 'model.dmn', { type: 'text/xml' })] },
  });

  // The upload validates through the backend before the evaluation controls
  // appear, so the field has to be awaited rather than queried outright.
  const field = await screen.findByLabelText(/Request Body/);
  await waitFor(() => expect(field.value).not.toBe(''));
  return JSON.parse(field.value).variables;
};

/**
 * The upload path validates through the backend before it accepts a model, so
 * the tab only reveals its evaluation controls — the Request Body field among
 * them — once that call has come back clean.
 */
const emptyLayers = {
  base: { label: 'Base DMN', issues: [] },
  business: { label: 'Business Rules', issues: [] },
  execution: { label: 'Execution Rules', issues: [] },
  interaction: { label: 'Interaction Rules', issues: [] },
};

const okValidation = {
  valid: true,
  layers: emptyLayers,
  summary: { errors: 0, warnings: 0, infos: 0 },
};

const respond = (body) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});

beforeEach(() => {
  global.fetch = vi.fn((url) => {
    if (String(url).includes('/v1/dmns/validate'))
      return Promise.resolve(respond({ success: true, data: okValidation }));
    return Promise.resolve(respond({ success: true, data: {} }));
  });
});

describe('inputValues constraints take priority', () => {
  test('a quoted string is unwrapped', async () => {
    renderTab();

    const vars = await bodyAfterUpload(
      dmnWith([{ name: 'gemeente', typeRef: 'string', allowed: '"Almere","Lelystad"' }])
    );

    expect(vars.gemeente).toEqual({ value: 'Almere', type: 'String' });
  });

  test('a number is parsed and typed from the variable', async () => {
    renderTab();

    const vars = await bodyAfterUpload(
      dmnWith([{ name: 'leeftijd', typeRef: 'integer', allowed: '18,21,67' }])
    );

    expect(vars.leeftijd).toEqual({ value: 18, type: 'Integer' });
  });

  test('a decimal typeRef makes it a Double', async () => {
    renderTab();

    const vars = await bodyAfterUpload(
      dmnWith([{ name: 'inkomen', typeRef: 'decimal', allowed: '1234.5,999' }])
    );

    expect(vars.inkomen).toEqual({ value: 1234.5, type: 'Double' });
  });

  test('a boolean is coerced, not left as text', async () => {
    renderTab();

    const vars = await bodyAfterUpload(
      dmnWith([{ name: 'ingezetene', typeRef: 'boolean', allowed: 'true,false' }])
    );

    expect(vars.ingezetene).toEqual({ value: true, type: 'Boolean' });
  });

  test('false is honoured rather than treated as absent', async () => {
    renderTab();

    const vars = await bodyAfterUpload(
      dmnWith([{ name: 'ingezetene', typeRef: 'boolean', allowed: 'false,true' }])
    );

    expect(vars.ingezetene).toEqual({ value: false, type: 'Boolean' });
  });

  test('an unrecognised typeRef falls back to String', async () => {
    renderTab();

    const vars = await bodyAfterUpload(
      dmnWith([{ name: 'iets', typeRef: 'duration', allowed: '"x"' }])
    );

    expect(vars.iets).toEqual({ value: 'x', type: 'String' });
  });

  test('a single value with no comma is read whole', async () => {
    renderTab();

    const vars = await bodyAfterUpload(
      dmnWith([{ name: 'gemeente', typeRef: 'string', allowed: '"Almere"' }])
    );

    expect(vars.gemeente.value).toBe('Almere');
  });

  test('an empty constraint falls through to the type heuristics', async () => {
    // An inputValues element with nothing usable must not win over typeRef,
    // or the request body carries an empty string where a number belongs.
    renderTab();

    const vars = await bodyAfterUpload(
      dmnWith([{ name: 'leeftijd', typeRef: 'integer', allowed: '   ' }])
    );

    expect(vars.leeftijd).toEqual({ value: 0, type: 'Integer' });
  });
});

describe('falling back to the declared type', () => {
  test('boolean becomes false', async () => {
    renderTab();

    const vars = await bodyAfterUpload(dmnWith([{ name: 'ingezetene', typeRef: 'boolean' }]));

    expect(vars.ingezetene).toEqual({ value: false, type: 'Boolean' });
  });

  test('number, double and decimal all become a Double zero', async () => {
    renderTab();

    const vars = await bodyAfterUpload(
      dmnWith([
        { name: 'a', typeRef: 'number' },
        { name: 'b', typeRef: 'double' },
        { name: 'c', typeRef: 'decimal' },
      ])
    );

    for (const key of ['a', 'b', 'c']) {
      expect(vars[key]).toEqual({ value: 0.0, type: 'Double' });
    }
  });

  test('integer and long become an Integer zero', async () => {
    renderTab();

    const vars = await bodyAfterUpload(
      dmnWith([
        { name: 'a', typeRef: 'integer' },
        { name: 'b', typeRef: 'long' },
      ])
    );

    expect(vars.a).toEqual({ value: 0, type: 'Integer' });
    expect(vars.b).toEqual({ value: 0, type: 'Integer' });
  });

  test('an input with no name at all is skipped', async () => {
    renderTab();

    const xml =
      `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">` +
      `<inputData id="nameless" /><inputData id="id_leeftijd" name="leeftijd">` +
      `<variable typeRef="integer" /></inputData>` +
      `<decision id="Bepaal" name="Bepaal"><decisionTable id="t" /></decision></definitions>`;

    const vars = await bodyAfterUpload(xml);

    expect(Object.keys(vars)).toEqual(['leeftijd']);
  });
});

describe('dates are guessed from the variable name', () => {
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

  test('a date input named for a birth date gets a plausible one', async () => {
    // A decision about age needs someone old enough to have an age; today's
    // date would make every such model return the same uninteresting answer.
    renderTab();

    const vars = await bodyAfterUpload(dmnWith([{ name: 'geboortedatum', typeRef: 'date' }]));

    expect(vars.geboortedatum.type).toBe('Date');
    expect(vars.geboortedatum.value).toMatch(ISO_DATE);
    expect(new Date(vars.geboortedatum.value).getFullYear()).toBeLessThan(
      new Date().getFullYear() - 10
    );
  });

  test('the English spellings are recognised too', async () => {
    renderTab();

    const vars = await bodyAfterUpload(
      dmnWith([
        { name: 'birthDate', typeRef: 'date' },
        { name: 'dob', typeRef: 'date' },
      ])
    );

    expect(vars.birthDate.type).toBe('Date');
    expect(vars.dob.type).toBe('Date');
  });

  test('a date input that is not a birth date gets a recent one', async () => {
    renderTab();

    const vars = await bodyAfterUpload(dmnWith([{ name: 'peildatum', typeRef: 'date' }]));

    expect(vars.peildatum.type).toBe('Date');
    expect(new Date(vars.peildatum.value).getFullYear()).toBeGreaterThan(
      new Date().getFullYear() - 5
    );
  });

  test('a string input whose name reads like a date is treated as one', async () => {
    // RONL models routinely declare dates as strings; the name is the only
    // signal left that a bare '' would be useless.
    renderTab();

    const vars = await bodyAfterUpload(dmnWith([{ name: 'aanvraagdag', typeRef: 'string' }]));

    expect(vars.aanvraagdag.value).toMatch(ISO_DATE);
  });

  test('a plain string input stays empty', async () => {
    renderTab();

    const vars = await bodyAfterUpload(dmnWith([{ name: 'gemeente', typeRef: 'string' }]));

    expect(vars.gemeente).toEqual({ value: '', type: 'String' });
  });
});

describe('a model with nothing to fill in', () => {
  test('leaves the request body alone when there are no input variables', async () => {
    renderTab();

    const xml =
      `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">` +
      `<decision id="Bepaal" name="Bepaal"><decisionTable id="t" /></decision></definitions>`;

    fireEvent.change(screen.getByLabelText('Choose a file'), {
      target: { files: [new File([xml], 'model.dmn', { type: 'text/xml' })] },
    });

    expect(await screen.findByText(/model.dmn/)).toBeInTheDocument();
    // Nothing was proposed, rather than an empty variables object being written
    // over whatever the author had typed.
    expect(screen.getByLabelText(/Request Body/).value).not.toContain('"variables"');
  });
});
