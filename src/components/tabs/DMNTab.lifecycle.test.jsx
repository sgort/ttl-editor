import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import DMNTab from './DMNTab';

/**
 * The ways a DMN reaches this tab other than by being picked from a file
 * dialog, and the edges of the deploy/evaluate path once it has.
 *
 * There are three entrances. A file upload is the obvious one. `Load Example`
 * fetches a bundled model so a first-time visitor has something to deploy. And
 * a TTL import can arrive with `dmnData.content` already filled in — from a DSO
 * deep link handled in App, which never passes through the upload handlers at
 * all — leaving this tab to hydrate itself from a prop it did not set.
 *
 * A fourth case is not an entrance but a refusal: a TTL that already carried
 * DMN data is shown as preserved and read-only, because editing it here would
 * silently rewrite deployment ids and test results that belong to someone
 * else's production model.
 */

const withDecision =
  `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">` +
  `<inputData id="in_leeftijd" name="leeftijd"><variable name="leeftijd" typeRef="integer" /></inputData>` +
  `<decision id="Bepaal" name="Bepaal" /></definitions>`;

/** No decision to key on and no inputs to prefill: both fallbacks at once. */
const withoutDecision =
  `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">` +
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

const respond = (body, { ok = true, status = 200, statusText = 'OK' } = {}) => ({
  ok,
  status,
  statusText,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
});

const mockBackend = ({ example, deploy, evaluate } = {}) => {
  const fetchMock = vi.fn((url) => {
    const href = String(url);
    if (href.includes('/examples/'))
      return (example ?? (() => Promise.resolve(respond(withDecision))))();
    if (href.includes('/v1/dmns/validate'))
      return Promise.resolve(respond({ success: true, data: okValidation }));
    if (href.includes('/v1/dmns/deploy'))
      return (
        deploy ??
        (() => Promise.resolve(respond({ success: true, data: { deploymentId: 'dep-1' } })))
      )();
    if (href.includes('/v1/dmns/evaluate'))
      return (evaluate ?? (() => Promise.resolve(respond([{ leeftijd: { value: 67 } }]))))();
    return Promise.resolve(respond({}));
  });
  global.fetch = fetchMock;
  return { fetchMock };
};

const renderTab = (dmnData = {}) => {
  const props = {
    dmnData: { ...defaultDmnData, ...dmnData },
    setDmnData: vi.fn(),
    setConcepts: vi.fn(),
  };
  return { props, ...render(<DMNTab {...props} />) };
};

const uploadDmn = async (content = withDecision, name = 'model.dmn') => {
  fireEvent.change(screen.getByLabelText('Choose a file'), {
    target: { files: [new File([content], name, { type: 'text/xml' })] },
  });
  await screen.findByText(name);
};

const deploy = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Deploy to Operaton/ }));
  await waitFor(() => expect(screen.getByRole('button', { name: /Evaluate/ })).toBeEnabled());
};

afterEach(() => {
  vi.restoreAllMocks();
  delete global.fetch;
});

describe('a TTL that already carried DMN data', () => {
  test('is shown as preserved rather than offered for editing', () => {
    mockBackend();
    renderTab({ isImported: true, content: withDecision, fileName: 'van-elders.dmn' });

    expect(screen.getByText(/DMN Data Imported/)).toBeInTheDocument();
    // None of the normal machinery is reachable: no upload, no deploy, no
    // request body to accidentally re-evaluate against a production deployment.
    expect(screen.queryByLabelText('Choose a file')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Deploy to Operaton/ })).not.toBeInTheDocument();
    // And nothing was validated: the effect returns before it gets that far.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('can be discarded, which hands the tab back', () => {
    mockBackend();
    const { props } = renderTab({ isImported: true, content: withDecision });

    fireEvent.click(screen.getByRole('button', { name: /Clear Imported DMN Data/ }));

    expect(props.setDmnData).toHaveBeenCalledWith(
      expect.objectContaining({ isImported: false, content: '', deploymentId: null })
    );
  });
});

describe('content that arrives from outside the tab', () => {
  test('hydrates itself from the prop, keeping the name it came with', async () => {
    // A DSO deep-link import fills dmnData.content in App and never touches
    // these handlers. Without the hydration effect the model is present in the
    // TTL and unusable in the UI: deploy stays gated on a file that was never
    // chosen here.
    mockBackend();
    renderTab({ content: withDecision, fileName: 'ingelezen.dmn' });

    expect(await screen.findByText('ingelezen.dmn')).toBeInTheDocument();
    expect(screen.getByLabelText('Decision Key').value).toBe('Bepaal');
    expect(screen.getByLabelText(/Request Body/).value).toContain('leeftijd');
    expect(screen.getByRole('button', { name: /Deploy to Operaton/ })).toBeEnabled();
  });

  test('falls back to a placeholder name, and prefills nothing it cannot infer', async () => {
    mockBackend();
    renderTab({ content: withoutDecision });

    expect(await screen.findByText('imported.dmn')).toBeInTheDocument();
    expect(screen.getByLabelText('Decision Key').value).toBe('');
    expect(screen.getByLabelText(/Request Body/).value).toBe('');
  });
});

describe('the bundled example', () => {
  test('loads, keys itself and prefills a request body', async () => {
    mockBackend();
    const { props } = renderTab();

    fireEvent.click(screen.getByRole('button', { name: 'Load Example' }));

    expect(await screen.findByText('RONL_BerekenLeeftijden_CPRMV.dmn')).toBeInTheDocument();
    await waitFor(() =>
      expect(props.setDmnData).toHaveBeenCalledWith(
        expect.objectContaining({ decisionKey: 'Bepaal' })
      )
    );
    expect(screen.getByLabelText(/Request Body/).value).toContain('leeftijd');
  });

  test('an example with nothing to infer still loads', async () => {
    mockBackend({ example: () => Promise.resolve(respond(withoutDecision)) });
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: 'Load Example' }));

    expect(await screen.findByText('RONL_BerekenLeeftijden_CPRMV.dmn')).toBeInTheDocument();
    expect(screen.getByLabelText('Decision Key').value).toBe('');
  });

  test('a missing example file says where it was expected', async () => {
    mockBackend({
      example: () =>
        Promise.resolve(respond('', { ok: false, status: 404, statusText: 'Not Found' })),
    });
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: 'Load Example' }));

    expect(
      await screen.findByText(/Failed to load example DMN file \(404 Not Found\)/)
    ).toBeInTheDocument();
    expect(screen.getByText(/public\/examples\/organizations\/svb/)).toBeInTheDocument();
  });

  test('a failure with nothing to report still reports something', async () => {
    mockBackend({ example: () => Promise.reject(new Error('')) });
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: 'Load Example' }));

    expect(await screen.findByText('Failed to load example DMN file')).toBeInTheDocument();
  });
});

describe('deploying a model with nothing to key on', () => {
  test('names the deployment after the file instead', async () => {
    const { fetchMock } = mockBackend();
    renderTab();

    await uploadDmn(withoutDecision, 'naamloos.dmn');
    fireEvent.click(screen.getByRole('button', { name: /Deploy to Operaton/ }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3001/v1/dmns/deploy',
        expect.objectContaining({ method: 'POST' })
      )
    );
    const body = JSON.parse(
      fetchMock.mock.calls.find(([url]) => String(url).includes('/deploy'))[1].body
    );
    expect(body.deploymentName).toBe('naamloos.dmn');
  });

  test('a refusal with no message falls back to the status line', async () => {
    mockBackend({
      deploy: () =>
        Promise.resolve(
          respond(
            { success: false },
            { ok: false, status: 500, statusText: 'Internal Server Error' }
          )
        ),
    });
    renderTab();

    await uploadDmn();
    fireEvent.click(screen.getByRole('button', { name: /Deploy to Operaton/ }));

    expect(await screen.findByText(/Deployment failed: Internal Server Error/)).toBeInTheDocument();
  });
});

describe('evaluating', () => {
  test('an empty request body is refused before the network is touched', async () => {
    const { fetchMock } = mockBackend();
    renderTab();

    await uploadDmn();
    await deploy();
    fireEvent.change(screen.getByLabelText(/Request Body/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Evaluate Decision/ }));

    expect(await screen.findByText('Please enter a request body')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('/evaluate'))).toHaveLength(0);
  });

  test('an empty result set is a legitimate answer, not an error', async () => {
    // A RULE ORDER table with no catch-all rule returns []. The concepts still
    // have to be populated, from the model's own declared outputs.
    mockBackend({ evaluate: () => Promise.resolve(respond([])) });
    const { props } = renderTab();

    await uploadDmn();
    await deploy();
    fireEvent.click(screen.getByRole('button', { name: /Evaluate Decision/ }));

    await waitFor(() => expect(props.setConcepts).toHaveBeenCalled());
    expect(screen.getByText('200 OK')).toBeInTheDocument();
  });

  test('a model with no decision key still evaluates and attributes nothing', async () => {
    mockBackend();
    const { props } = renderTab();

    await uploadDmn(withoutDecision, 'naamloos.dmn');
    await deploy();
    fireEvent.change(screen.getByLabelText(/Request Body/), {
      target: { value: '{"variables":{"leeftijd":{"value":67,"type":"Integer"}}}' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Evaluate Decision/ }));

    await waitFor(() => expect(props.setConcepts).toHaveBeenCalled());
    const concepts = props.setConcepts.mock.calls.at(-1)[0];
    // No key means no decision to attribute the variables to.
    expect(concepts.every((c) => c.decisions.length === 0)).toBe(true);
  });

  test('a deployed model with a successful test says it is ready to save', async () => {
    // Both halves are required: the deployment lives in dmnData, the test result
    // in local state, and the TTL export is only complete with both.
    mockBackend();
    renderTab({ deployed: true });

    await uploadDmn();
    await deploy();
    expect(screen.queryByText('Ready to Save')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Evaluate Decision/ }));

    expect(await screen.findByText('Ready to Save')).toBeInTheDocument();
  });
});

describe('clearing the file', () => {
  test('returns the tab to its empty state and empties the concepts with it', async () => {
    mockBackend();
    const { props } = renderTab();

    await uploadDmn();
    await deploy();
    fireEvent.click(screen.getByRole('button', { name: /Clear/ }));

    expect(screen.getByLabelText('Choose a file')).toBeInTheDocument();
    expect(screen.getByLabelText('Decision Key').value).toBe('');
    expect(props.setConcepts).toHaveBeenLastCalledWith([]);
    expect(props.setDmnData).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: '', deployed: false })
    );
  });
});
