import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import DMNTab from './DMNTab';

/**
 * A DRD is a graph of decisions, not a single table, and this tab has to make
 * sense of one: read every decision out of the XML, let the author pick which
 * to evaluate, and offer to run each sub-decision on its own.
 *
 * Two conventions do most of the work and neither is expressed in the DMN spec.
 * Decisions whose id starts with `p_` are constants, not decisions, and are
 * filtered out of everything the author sees — a model with fifteen `p_*`
 * parameters and two real decisions must not offer seventeen things to test.
 * And a decision's input variables come from its `informationRequirement`
 * links into `inputData`, with the decision table consulted only for the type.
 *
 * The intermediate runner beneath it exists because a failing DRD root says
 * nothing about which sub-decision broke. It classifies each call three ways,
 * and the distinction that matters is that an Operaton `RestException` arrives
 * with HTTP 200 — so `ok` is decided by the shape of the body, not the status.
 */

const drdXml =
  `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">` +
  `<inputData id="in_leeftijd" name="leeftijd" />` +
  // An inputData with no name at all: linked, but contributes no variable.
  `<inputData id="in_naamloos" />` +
  // A p_* constant: filtered out of the decision list entirely.
  `<decision id="p_norm" name="Norm" />` +
  // No name attribute, so the id has to stand in for one.
  `<decision id="BepaalLeeftijd">` +
  `<informationRequirement id="ir1"><requiredInput href="#in_leeftijd" /></informationRequirement>` +
  `<informationRequirement id="ir2"><requiredInput href="#in_naamloos" /></informationRequirement>` +
  // A requiredInput with no href at all, and one pointing at nothing.
  `<informationRequirement id="ir3"><requiredInput /></informationRequirement>` +
  `<informationRequirement id="ir4"><requiredInput href="#in_weg" /></informationRequirement>` +
  // A requirement with no requiredInput child (a requiredDecision link).
  `<informationRequirement id="ir5" />` +
  `<decisionTable id="t1">` +
  `<input label="leeftijd"><inputExpression id="e1" typeRef="integer"><text>leeftijd</text></inputExpression></input>` +
  `<input label="iets anders"><inputExpression id="e2" typeRef="string"><text>x</text></inputExpression></input>` +
  `<input id="e3" />` +
  `</decisionTable></decision>` +
  // No id: nothing can be evaluated against it, so it is not a decision here.
  `<decision name="Zonder id" />` +
  `<decision id="BepaalRecht" name="Bepaal recht"><decisionTable id="t2" /></decision>` +
  `</definitions>`;

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

const okValidation = {
  valid: true,
  layers: {
    base: { label: 'Base DMN', issues: [] },
    business: { label: 'Business Rules', issues: [] },
    execution: { label: 'Execution Rules', issues: [] },
    interaction: { label: 'Interaction Rules', issues: [] },
  },
  summary: { errors: 0, warnings: 0, infos: 0 },
};

const respond = (body, { ok = true } = {}) => ({
  ok,
  status: ok ? 200 : 500,
  statusText: ok ? 'OK' : 'Internal Server Error',
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
});

/** `evaluate` is called with the decision id, so one mock can answer per decision. */
const mockBackend = ({ evaluate } = {}) => {
  const fetchMock = vi.fn((url) => {
    const href = String(url);
    if (href.includes('/v1/dmns/validate'))
      return Promise.resolve(respond({ success: true, data: okValidation }));
    if (href.includes('/v1/dmns/deploy'))
      return Promise.resolve(respond({ success: true, data: { deploymentId: 'dep-1' } }));
    if (href.includes('/v1/dmns/evaluate')) {
      const key = decodeURIComponent(href.split('/v1/dmns/evaluate/')[1]);
      return (evaluate ?? (() => Promise.resolve(respond([{ leeftijd: { value: 67 } }]))))(key);
    }
    return Promise.resolve(respond({}));
  });
  global.fetch = fetchMock;
  return { fetchMock };
};

const renderTab = () => {
  const props = { dmnData: defaultDmnData, setDmnData: vi.fn(), setConcepts: vi.fn() };
  return { props, ...render(<DMNTab {...props} />) };
};

const uploadDrd = async () => {
  fireEvent.change(screen.getByLabelText('Choose a file'), {
    target: { files: [new File([drdXml], 'drd.dmn', { type: 'text/xml' })] },
  });
  await screen.findByText('drd.dmn');
};

/** Upload, deploy, and open the intermediate-tests panel. */
const openIntermediatePanel = async () => {
  await uploadDrd();
  fireEvent.click(screen.getByRole('button', { name: /Deploy to Operaton/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Intermediate Decision Tests/ }));
  return screen.findByRole('button', { name: /^Run Intermediate Tests/ });
};

afterEach(() => {
  vi.restoreAllMocks();
  delete global.fetch;
});

describe('reading the DRD', () => {
  test('counts the testable decisions and says the constants were skipped', async () => {
    mockBackend();
    renderTab();

    await uploadDrd();

    // p_norm and the id-less decision are both out; two remain.
    expect(await screen.findByText(/2 testable decisions detected/)).toBeInTheDocument();
    expect(screen.getByText(/p_\* constants filtered/)).toBeInTheDocument();
  });

  test('offers a picker listing every testable decision', async () => {
    mockBackend();
    renderTab();

    await uploadDrd();

    const picker = await screen.findByLabelText(/this file has 2 decisions/);
    // A decision with no name attribute is listed under its id alone; a named
    // one carries both, since the id is what actually gets evaluated.
    expect(screen.getByRole('option', { name: 'BepaalLeeftijd' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bepaal recht (BepaalRecht)' })).toBeInTheDocument();
    expect(picker.value).toBe('BepaalLeeftijd');
  });

  test('the picker shows nothing selected when the key is not one of the decisions', async () => {
    // The Decision Key field above is free text. Typing something the file does
    // not contain must leave the picker blank rather than silently keeping the
    // previous selection.
    mockBackend();
    renderTab();

    await uploadDrd();
    const picker = await screen.findByLabelText(/this file has 2 decisions/);

    fireEvent.change(screen.getByLabelText('Decision Key'), { target: { value: 'ZitErNietIn' } });

    expect(picker.value).toBe('');
  });

  test('picking a decision changes what will be evaluated', async () => {
    mockBackend();
    const { props } = renderTab();

    await uploadDrd();
    const picker = await screen.findByLabelText(/this file has 2 decisions/);
    fireEvent.change(picker, { target: { value: 'BepaalRecht' } });

    expect(picker.value).toBe('BepaalRecht');
    expect(props.setDmnData).toHaveBeenCalledWith(
      expect.objectContaining({ decisionKey: 'BepaalRecht' })
    );
  });

  test('a change event carrying no file is ignored', async () => {
    mockBackend();
    renderTab();

    fireEvent.change(screen.getByLabelText('Choose a file'), { target: { files: [] } });

    expect(screen.getByLabelText('Choose a file')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a model with a single decision names it in plain text instead', async () => {
    mockBackend();
    renderTab();

    fireEvent.change(screen.getByLabelText('Choose a file'), {
      target: {
        files: [
          new File(
            [
              `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">` +
                `<decision id="Enkel" name="Enkel" /></definitions>`,
            ],
            'single.dmn',
            { type: 'text/xml' }
          ),
        ],
      },
    });

    expect(await screen.findByText(/1 testable decision detected/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/pick the one to evaluate/)).not.toBeInTheDocument();
  });
});

describe('running each sub-decision on its own', () => {
  test('the panel appears only once the DRD is deployed', async () => {
    mockBackend();
    renderTab();

    await uploadDrd();
    expect(
      screen.queryByRole('button', { name: /Intermediate Decision Tests/ })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Deploy to Operaton/ }));

    expect(
      await screen.findByRole('button', { name: /Intermediate Decision Tests/ })
    ).toBeInTheDocument();
  });

  test('evaluates every decision and reports each one', async () => {
    const { fetchMock } = mockBackend();
    renderTab();

    fireEvent.click(await openIntermediatePanel());

    await waitFor(() => expect(screen.getAllByText(/✅ OK/)).toHaveLength(2));
    const evaluated = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((u) => u.includes('/evaluate/'))
      .map((u) => u.split('/evaluate/')[1]);
    expect(evaluated).toEqual(['BepaalLeeftijd', 'BepaalRecht']);
    expect(screen.getByText('2/2 passed')).toBeInTheDocument();
  });

  test('an engine exception is an error even though it arrives as HTTP 200', async () => {
    mockBackend({
      evaluate: (key) =>
        Promise.resolve(
          key === 'BepaalLeeftijd'
            ? respond('{"type":"RestException","message":"FEEL/SCALA-01008"}')
            : respond([{ recht: { value: true } }])
        ),
    });
    renderTab();

    fireEvent.click(await openIntermediatePanel());

    expect(await screen.findByText(/❌ ERROR/)).toBeInTheDocument();
    expect(screen.getByText(/✅ OK/)).toBeInTheDocument();
    expect(screen.getByText('1/2 passed')).toBeInTheDocument();
  });

  test('a body that is neither an exception nor a result set is flagged, not swallowed', async () => {
    // Something answered, and it was not Operaton. Reporting it as a pass would
    // be worse than reporting it as a failure.
    mockBackend({ evaluate: () => Promise.resolve(respond({ message: 'not a result set' })) });
    renderTab();

    fireEvent.click(await openIntermediatePanel());

    await waitFor(() => expect(screen.getAllByText(/⚠️ UNEXPECTED/)).toHaveLength(2));
  });

  test('a body that is not JSON at all is flagged too', async () => {
    mockBackend({ evaluate: () => Promise.resolve(respond('<html>502 Bad Gateway</html>')) });
    renderTab();

    fireEvent.click(await openIntermediatePanel());

    await waitFor(() => expect(screen.getAllByText(/⚠️ UNEXPECTED/)).toHaveLength(2));
  });

  test('a decision whose call throws is recorded with the reason', async () => {
    mockBackend({ evaluate: () => Promise.reject(new Error('Failed to fetch')) });
    renderTab();

    fireEvent.click(await openIntermediatePanel());

    await waitFor(() => expect(screen.getAllByText(/❌ ERROR/)).toHaveLength(2));
    fireEvent.click(screen.getAllByText('BepaalLeeftijd')[0]);
    expect(screen.getAllByText('Failed to fetch').length).toBeGreaterThan(0);
  });

  test('the panel collapses and reopens with its results intact', async () => {
    mockBackend();
    renderTab();

    fireEvent.click(await openIntermediatePanel());
    await waitFor(() => expect(screen.getAllByText(/✅ OK/)).toHaveLength(2));

    const header = screen.getByRole('button', { name: /Intermediate Decision Tests/ });
    fireEvent.click(header);
    expect(screen.queryByText(/✅ OK/)).not.toBeInTheDocument();

    fireEvent.click(header);
    expect(await screen.findAllByText(/✅ OK/)).toHaveLength(2);
  });

  test('the run button is unavailable while there is no request body', async () => {
    mockBackend();
    renderTab();

    const run = await openIntermediatePanel();
    expect(run).toBeEnabled();

    fireEvent.change(screen.getByLabelText(/Request Body/), { target: { value: '' } });

    expect(screen.getByRole('button', { name: /^Run Intermediate Tests/ })).toBeDisabled();
  });
});
