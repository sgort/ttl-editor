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

/**
 * `dmnWith` always emits a <variable> child, which is what modern RONL exports
 * look like. Older models — the bundled SVB example among them — declare an
 * <inputData> with a name and nothing else, and the generator then has only the
 * name to go on. That fallback is a separate ladder from the typeRef switch
 * above and gets its own fixture.
 */
const dmnWithBareInputs = (names) =>
  `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">` +
  names.map((name) => `<inputData id="id_${name}" name="${name}" />`).join('') +
  `<decision id="Bepaal" name="Bepaal"><decisionTable id="t" /></decision></definitions>`;

describe('an inputData with no declared type', () => {
  test('a name that reads like a birth date gets a plausible birth date', async () => {
    renderTab();

    const vars = await bodyAfterUpload(dmnWithBareInputs(['geboortedatum']));

    expect(vars.geboortedatum.type).toBe('String');
    expect(new Date(vars.geboortedatum.value).getFullYear()).toBeLessThan(
      new Date().getFullYear() - 10
    );
  });

  test('any other date-ish name gets today', async () => {
    renderTab();

    const vars = await bodyAfterUpload(dmnWithBareInputs(['peildatum']));

    expect(vars.peildatum).toEqual({
      value: new Date().toISOString().split('T')[0],
      type: 'String',
    });
  });

  test('a name that reads like an amount becomes a numeric zero', async () => {
    // Four name fragments stand in for "this is a quantity": aantal, bedrag,
    // inkomen and norm. A String '' in one of these positions makes Operaton
    // reject the evaluation outright, so the guess matters.
    renderTab();

    const vars = await bodyAfterUpload(dmnWithBareInputs(['inkomen', 'aantalKinderen']));

    expect(vars.inkomen).toEqual({ value: 0, type: 'Integer' });
    expect(vars.aantalKinderen).toEqual({ value: 0, type: 'Integer' });
  });

  test('a name that suggests nothing at all stays an empty string', async () => {
    renderTab();

    const vars = await bodyAfterUpload(dmnWithBareInputs(['gemeente']));

    expect(vars.gemeente).toEqual({ value: '', type: 'String' });
  });
});

describe('the remaining typeRef spellings', () => {
  test('long and number under an inputValues constraint keep their own types', async () => {
    renderTab();

    const vars = await bodyAfterUpload(
      dmnWith([
        { name: 'teller', typeRef: 'long', allowed: '7,8' },
        { name: 'factor', typeRef: 'number', allowed: '0.5,1' },
        { name: 'ratio', typeRef: 'double', allowed: '2.5' },
      ])
    );

    expect(vars.teller).toEqual({ value: 7, type: 'Integer' });
    expect(vars.factor).toEqual({ value: 0.5, type: 'Double' });
    expect(vars.ratio).toEqual({ value: 2.5, type: 'Double' });
  });

  test('a string named for an application date, without the day, is still a date', async () => {
    // 'aanvraag' alone reaches the last clause of the date test — the one that
    // asks for 'aanvraag' and 'dag' together — and settles it.
    renderTab();

    const vars = await bodyAfterUpload(dmnWith([{ name: 'aanvraag', typeRef: 'string' }]));

    expect(vars.aanvraag).toEqual({ value: '', type: 'String' });
  });

  test('a string named for a birth date gets a birth date, not today', async () => {
    renderTab();

    const vars = await bodyAfterUpload(dmnWith([{ name: 'geboortedatum', typeRef: 'string' }]));

    expect(vars.geboortedatum.type).toBe('String');
    expect(new Date(vars.geboortedatum.value).getFullYear()).toBeLessThan(
      new Date().getFullYear() - 10
    );
  });
});

describe('an inputValues constraint the parser cannot make sense of', () => {
  test('an unterminated string literal is ignored rather than half-read', async () => {
    renderTab();

    const vars = await bodyAfterUpload(
      dmnWith([{ name: 'gemeente', typeRef: 'string', allowed: '"Almere' }])
    );

    // The constraint contributed nothing, so the typeRef heuristics decide.
    expect(vars.gemeente).toEqual({ value: '', type: 'String' });
  });

  test('a bare FEEL name is taken at face value', async () => {
    // Unquoted entries appear in models that treat the column as an enumeration
    // of symbols. There is nothing to parse, so the text itself is the example.
    renderTab();

    const vars = await bodyAfterUpload(
      dmnWith([{ name: 'gemeente', typeRef: 'string', allowed: 'Almere,Lelystad' }])
    );

    expect(vars.gemeente).toEqual({ value: 'Almere', type: 'String' });
  });
});
