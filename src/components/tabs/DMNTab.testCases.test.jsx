import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import DMNTab from './DMNTab';

/**
 * The test-case batch runner: upload a JSON file of cases, run them all against
 * the deployed model, and judge each one against its stated expectation.
 *
 * Two things make this worth pinning at the unit level even though the E2E
 * journeys drive the same tab. First, an Operaton `RestException` arrives with
 * HTTP 200 — the status line says nothing, so the body has to be read, and a
 * regression here would silently turn every engine error into a green run.
 * Second, one case must not be able to abort the batch: a file of thirty cases
 * where the fourth throws still owes the author the other twenty-six.
 *
 * Reaching any of it means walking the lifecycle first. The section does not
 * render until a deployment has succeeded in this session, and it starts
 * collapsed, so every test here uploads, deploys and expands before it can
 * touch the thing it means to test.
 */

const DECISION_KEY = 'BerekenLeeftijd';

const dmnXml =
  `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">` +
  `<decision id="${DECISION_KEY}" name="${DECISION_KEY}"></decision></definitions>`;

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

/** A fetch response whose body is `body`, serialised for both readers. */
const respond = (body, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  statusText: ok ? 'OK' : 'Internal Server Error',
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
});

/**
 * A fetch mock scripted per endpoint.
 *
 * `evaluate` receives the decision key and the request body of each call, so a
 * single test can give different answers to different cases in one batch —
 * which is the whole point of per-case routing.
 */
const mockBackend = ({ evaluate } = {}) => {
  const evaluated = [];
  const fetchMock = vi.fn((url, init) => {
    const href = String(url);
    if (href.includes('/v1/dmns/validate'))
      return Promise.resolve(respond({ success: true, data: okValidation }));
    if (href.includes('/v1/dmns/deploy'))
      return Promise.resolve(respond({ success: true, data: { deploymentId: 'dep-1' } }));
    if (href.includes('/v1/dmns/evaluate')) {
      const key = decodeURIComponent(href.split('/v1/dmns/evaluate/')[1]);
      evaluated.push({ key, body: JSON.parse(init.body) });
      return (evaluate ?? (() => Promise.resolve(respond([{ leeftijd: { value: 67 } }]))))(
        key,
        JSON.parse(init.body)
      );
    }
    return Promise.resolve(respond({}));
  });
  global.fetch = fetchMock;
  return { fetchMock, evaluated };
};

const renderTab = () => {
  const props = { dmnData: defaultDmnData, setDmnData: vi.fn(), setConcepts: vi.fn() };
  return { props, ...render(<DMNTab {...props} />) };
};

/**
 * Walk upload → deploy and open the Test Cases panel.
 *
 * The panel is gated on `deploymentStatus?.success`, which only a successful
 * deploy in this session sets — no prop can shortcut it — and it renders
 * collapsed, so the header has to be clicked before the upload control exists.
 */
const deployAndOpenTestCases = async () => {
  fireEvent.change(screen.getByLabelText('Choose a file'), {
    target: { files: [new File([dmnXml], 'model.dmn', { type: 'text/xml' })] },
  });
  await screen.findByText('model.dmn');

  fireEvent.click(screen.getByRole('button', { name: /Deploy to Operaton/ }));
  const header = await screen.findByRole('button', { name: /^Test Cases/ });
  fireEvent.click(header);
  await screen.findByText(/Upload test-cases.json/);
};

/** Hand the panel a test-cases file. */
const uploadTestCases = async (content, name = 'test-cases.json') => {
  fireEvent.change(screen.getByLabelText(/Upload test-cases.json/), {
    target: {
      files: [
        new File([typeof content === 'string' ? content : JSON.stringify(content)], name, {
          type: 'application/json',
        }),
      ],
    },
  });
};

/** Clear the Decision Key, leaving cases with no fallback to route to. */
const clearDecisionKey = () => {
  fireEvent.change(screen.getByLabelText('Decision Key'), { target: { value: '' } });
};

afterEach(() => {
  vi.restoreAllMocks();
  delete global.fetch;
});

describe('loading a test-cases file', () => {
  test('accepts the toeslagen shape: name, expected, requestBody', async () => {
    mockBackend();
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([
      {
        name: 'Alleenstaand, minimuminkomen',
        expected: 'recht = true',
        requestBody: { variables: { inkomen: { value: 12000, type: 'Integer' } } },
      },
    ]);

    expect(await screen.findByText('Alleenstaand, minimuminkomen')).toBeInTheDocument();
    expect(screen.getByText(/→ recht = true/)).toBeInTheDocument();
    // The control relabels itself with the file it is holding, so the author can
    // see which file the results below belong to.
    expect(screen.getByText(/test-cases.json \(1 cases\)/)).toBeInTheDocument();
  });

  test('accepts the DUO shape: testName, testResult, variables', async () => {
    mockBackend();
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([
      { testName: 'Voltijd, 18 jaar', testResult: 'basisbeurs = 300', variables: { leeftijd: 18 } },
    ]);

    expect(await screen.findByText('Voltijd, 18 jaar')).toBeInTheDocument();
    expect(screen.getByText(/→ basisbeurs = 300/)).toBeInTheDocument();
  });

  test('names an unnamed case after its position', async () => {
    mockBackend();
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([{ requestBody: { variables: {} } }, { variables: { leeftijd: 18 } }]);

    expect(await screen.findByText('TC1')).toBeInTheDocument();
    expect(screen.getByText('TC2')).toBeInTheDocument();
  });

  test('shows the decision a case routes itself to', async () => {
    mockBackend();
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([
      { name: 'Sub-decision case', decision: 'BepaalLeeftijd', requestBody: { variables: {} } },
    ]);

    expect(await screen.findByText('BepaalLeeftijd')).toBeInTheDocument();
  });

  test('rejects a file that is not a .json', async () => {
    mockBackend();
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases('[]', 'cases.txt');

    expect(await screen.findByText(/valid JSON file/)).toBeInTheDocument();
  });

  test('reports unparseable JSON rather than failing silently', async () => {
    mockBackend();
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases('{ not json');

    expect(await screen.findByText(/Failed to parse test cases/)).toBeInTheDocument();
  });

  test('rejects a JSON document that is not an array', async () => {
    mockBackend();
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases({ cases: [] });

    expect(await screen.findByText(/must contain a JSON array/)).toBeInTheDocument();
  });

  test('names the index of a case in neither accepted shape', async () => {
    // The author wrote a file; telling them only that it failed leaves them to
    // find the bad entry by eye.
    mockBackend();
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([
      { name: 'fine', requestBody: { variables: {} } },
      { name: 'not fine', input: { leeftijd: 18 } },
    ]);

    expect(
      await screen.findByText(/Test case at index 1 has an unrecognised format/)
    ).toBeInTheDocument();
  });
});

describe('running the batch', () => {
  test('routes each case to its own decision, falling back to the selected key', async () => {
    const { evaluated } = mockBackend();
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([
      { name: 'own decision', decision: 'BepaalLeeftijd', requestBody: { variables: {} } },
      { name: 'selected key', requestBody: { variables: {} } },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: /Run All Test Cases/ }));

    await waitFor(() => expect(evaluated).toHaveLength(2));
    expect(evaluated.map((e) => e.key)).toEqual(['BepaalLeeftijd', DECISION_KEY]);
  });

  test('a case with no decision and no selected key is reported, not sent', async () => {
    const { evaluated } = mockBackend();
    const { props } = renderTab();
    await deployAndOpenTestCases();
    clearDecisionKey();

    // The DUO shape carries raw values rather than {value, type} pairs, so the
    // concept type has to be assumed.
    await uploadTestCases([{ testName: 'nowhere to send this', variables: { leeftijd: 18 } }]);
    fireEvent.click(await screen.findByRole('button', { name: /Run All Test Cases/ }));

    expect(await screen.findByText(/⚠️ ERROR/)).toBeInTheDocument();
    expect(evaluated).toHaveLength(0);
    fireEvent.click(screen.getByText('nowhere to send this'));
    expect(screen.getByText(/No decision to evaluate against/)).toBeInTheDocument();

    // Nothing was evaluated, but the request bodies still describe inputs — and
    // with no decision anywhere, none of them is attributed to one.
    await waitFor(() => expect(props.setConcepts).toHaveBeenCalled());
    const concepts = props.setConcepts.mock.calls.at(-1)[0];
    expect(concepts).toEqual([
      expect.objectContaining({ variableName: 'leeftijd', decisions: [] }),
    ]);
  });

  test('a change event carrying no file leaves the loaded cases alone', async () => {
    mockBackend();
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([{ name: 'still here', requestBody: { variables: {} } }]);
    await screen.findByText('still here');

    fireEvent.change(screen.getByLabelText(/test-cases.json \(1 cases\)/), {
      target: { files: [] },
    });

    expect(screen.getByText('still here')).toBeInTheDocument();
  });

  test('a RestException arriving with HTTP 200 is an error, not a result', async () => {
    // Operaton answers a bad evaluation with 200 and an exception body. Reading
    // the status line alone turns every engine error into a passing case.
    mockBackend({
      evaluate: () =>
        Promise.resolve(
          respond('{"type":"RestException","message":"DMN-01005 Invalid value for clause"}')
        ),
    });
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([
      { name: 'bad input', expected: 'leeftijd = 67', requestBody: { variables: {} } },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: /Run All Test Cases/ }));

    expect(await screen.findByText(/⚠️ ERROR/)).toBeInTheDocument();
    expect(screen.getByText(/0 passed \/ 1 failed/)).toBeInTheDocument();
  });

  test('one failing case does not abort the batch', async () => {
    let call = 0;
    mockBackend({
      evaluate: () => {
        call += 1;
        return call === 1
          ? Promise.reject(new Error('Failed to fetch'))
          : Promise.resolve(respond([{ leeftijd: { value: 67 } }]));
      },
    });
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([
      { name: 'network died', expected: 'leeftijd = 67', requestBody: { variables: {} } },
      { name: 'still runs', expected: 'leeftijd = 67', requestBody: { variables: {} } },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: /Run All Test Cases/ }));

    expect(await screen.findByText(/✅ PASS/)).toBeInTheDocument();
    expect(screen.getByText(/⚠️ ERROR/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('network died'));
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });

  test('a mismatch is named output by output', async () => {
    mockBackend({ evaluate: () => Promise.resolve(respond([{ leeftijd: { value: 66 } }])) });
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([
      { name: 'off by one', expected: 'leeftijd = 67', requestBody: { variables: {} } },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: /Run All Test Cases/ }));

    expect(await screen.findByText(/❌ FAIL/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('off by one'));
    expect(screen.getByText('Mismatches:')).toBeInTheDocument();
    expect(screen.getByText('67')).toBeInTheDocument();
    expect(screen.getByText('66')).toBeInTheDocument();
  });

  test('an expectation it cannot parse is called out rather than counted as a pass', async () => {
    mockBackend();
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([{ name: 'no expectation', requestBody: { variables: {} } }]);
    fireEvent.click(await screen.findByRole('button', { name: /Run All Test Cases/ }));

    expect(await screen.findByText(/OK \(unchecked\)/)).toBeInTheDocument();
    expect(screen.getByText(/1 unverified/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('no expectation'));
    expect(screen.getByText(/could not be parsed for an automatic check/)).toBeInTheDocument();
  });

  test('a single result object, rather than an array of rows, is still read', async () => {
    // The engine returns an array for a table and a bare object for a single
    // result; both have to reach the merged outputs.
    mockBackend({ evaluate: () => Promise.resolve(respond({ leeftijd: { value: 67 } })) });
    const { props } = renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([
      { name: 'single row', expected: 'leeftijd = 67', requestBody: { variables: {} } },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: /Run All Test Cases/ }));

    expect(await screen.findByText(/✅ PASS/)).toBeInTheDocument();
    await waitFor(() =>
      expect(props.setConcepts).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ variableName: 'leeftijd' })])
      )
    );
  });

  test('rows and outputs the engine did not fill in are skipped', async () => {
    mockBackend({
      evaluate: () =>
        Promise.resolve(respond([null, 'unexpected', { leeftijd: { type: 'Integer' } }])),
    });
    const { props } = renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([
      {
        name: 'sparse result',
        requestBody: { variables: { inkomen: { value: 1, type: 'Integer' } } },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: /Run All Test Cases/ }));

    await waitFor(() => expect(props.setConcepts).toHaveBeenCalled());
    // The input survives; the output with no `value` never becomes a concept.
    const concepts = props.setConcepts.mock.calls.at(-1)[0];
    expect(concepts.map((c) => c.variableName)).toEqual(['inkomen']);
  });

  test('concepts record every decision a variable appears in', async () => {
    mockBackend();
    const { props } = renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([
      {
        name: 'first',
        decision: 'BepaalLeeftijd',
        requestBody: { variables: { geboortedatum: { value: '1960-01-01', type: 'String' } } },
      },
      {
        name: 'second',
        decision: 'BepaalRecht',
        requestBody: { variables: { geboortedatum: { value: '1970-01-01', type: 'String' } } },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: /Run All Test Cases/ }));

    await waitFor(() => expect(props.setConcepts).toHaveBeenCalled());
    const concepts = props.setConcepts.mock.calls.at(-1)[0];
    const input = concepts.find((c) => c.variableName === 'geboortedatum');
    expect(input.decisions).toEqual(['BepaalLeeftijd', 'BepaalRecht']);
    // Two decisions produced results, and the run says so.
    expect(await screen.findByText(/2 decisions/)).toBeInTheDocument();
  });

  test('a run that produced nothing usable leaves the existing concepts alone', async () => {
    mockBackend({ evaluate: () => Promise.reject(new Error('Failed to fetch')) });
    const { props } = renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([{ name: 'empty', requestBody: { variables: {} } }]);
    fireEvent.click(await screen.findByRole('button', { name: /Run All Test Cases/ }));

    expect(await screen.findByText(/⚠️ ERROR/)).toBeInTheDocument();
    expect(props.setConcepts).not.toHaveBeenCalled();
  });

  test('the panel reports the tally and notes that concepts were refreshed', async () => {
    mockBackend({
      evaluate: (key) =>
        Promise.resolve(
          key === DECISION_KEY
            ? respond([{ leeftijd: { value: 67 } }])
            : respond([{ leeftijd: { value: 12 } }])
        ),
    });
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([
      { name: 'passes', expected: 'leeftijd = 67', requestBody: { variables: {} } },
      {
        name: 'fails',
        decision: 'BepaalIets',
        expected: 'leeftijd = 67',
        requestBody: { variables: {} },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: /Run All Test Cases/ }));

    expect(await screen.findByText(/1 passed \/ 1 failed/)).toBeInTheDocument();
    expect(screen.getByText(/Run complete/)).toBeInTheDocument();
    expect(screen.getByText(/NL-SBB concepts updated/)).toBeInTheDocument();
    // Both cases ran, so the header count reflects the results rather than the
    // number of cases loaded.
    expect(screen.getByText('1/2 passed')).toBeInTheDocument();
  });

  test('the panel collapses again without losing its results', async () => {
    mockBackend();
    renderTab();
    await deployAndOpenTestCases();

    await uploadTestCases([
      { name: 'a case', expected: 'leeftijd = 67', requestBody: { variables: {} } },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: /Run All Test Cases/ }));
    await screen.findByText(/✅ PASS/);

    fireEvent.click(screen.getByRole('button', { name: /^Test Cases/ }));
    expect(screen.queryByText(/✅ PASS/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Test Cases/ }));
    expect(await screen.findByText(/✅ PASS/)).toBeInTheDocument();
  });
});
