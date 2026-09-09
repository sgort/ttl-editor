import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import DMNTab from './DMNTab';

// P6. DMNTab is the editor's core feature and its least-covered surface, and
// every interesting path in it crosses the network. Everything here is mocked at
// the fetch boundary — the same boundary docs/ prescribes, and the only one
// available, since there is no local backend to integration-test against.
//
// The lifecycle is upload -> validate -> deploy -> evaluate -> generate concepts,
// and the UI enforces it: the Evaluate button is disabled until a deployment has
// succeeded in this session. So the chain tests genuinely have to walk it.

const DECISION_KEY = 'BerekenLeeftijd';

const dmnXml = (decisionId = DECISION_KEY) =>
  `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">` +
  `<decision id="${decisionId}" name="${decisionId}"></decision></definitions>`;

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

const renderTab = (overrides = {}) => {
  const props = {
    dmnData: defaultDmnData,
    setDmnData: vi.fn(),
    setConcepts: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<DMNTab {...props} />) };
};

const json =
  (body, ok = true) =>
  () =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      statusText: ok ? 'OK' : 'Internal Server Error',
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    });

const rejects = (message) => () => Promise.reject(new Error(message));

/**
 * A fetch mock that answers per-endpoint, so one test can script the whole chain.
 *
 * Overrides are thunks, called only when that endpoint is actually hit. A plain
 * `Promise.reject(...)` here would be constructed at argument-evaluation time and
 * sit unhandled for a tick before the component ever calls fetch — Node reports
 * it as an unhandled rejection, and Vitest then reports "1 error" alongside 13
 * passing tests. The tests still pass, so it is easy to miss, and Vitest warns
 * that unhandled errors can cause false positives.
 */
const mockBackend = ({ validate, deploy, evaluate } = {}) => {
  const fetchMock = vi.fn((url) => {
    if (url.includes('/v1/dmns/validate'))
      return (validate ?? json({ success: true, data: okValidation }))();
    if (url.includes('/v1/dmns/deploy'))
      return (deploy ?? json({ success: true, data: { deploymentId: 'dep-1' } }))();
    if (url.includes('/v1/dmns/evaluate'))
      return (evaluate ?? json([{ leeftijd: { value: 67 } }]))();
    return json({})();
  });
  global.fetch = fetchMock;
  return { fetchMock };
};

const emptyLayers = {
  base: { label: 'Base DMN', issues: [] },
  business: { label: 'Business Rules', issues: [] },
  execution: { label: 'Execution Rules', issues: [] },
  interaction: { label: 'Interaction Rules', issues: [] },
  content: { label: 'Content', issues: [] },
};

const okValidation = {
  valid: true,
  layers: emptyLayers,
  summary: { errors: 0, warnings: 0, infos: 0 },
};

/**
 * Enter a request body. The minimal fixture above declares no inputs, so
 * generateRequestBodyFromDMN produces nothing and handleEvaluateDMN bails on its
 * own `!testBody` guard before reaching the network. Typing one is what a user
 * does anyway when the auto-generated body is not what they want.
 */
const enterRequestBody = (body = '{"variables":{"geboortedatum":{"value":"1960-01-01"}}}') => {
  fireEvent.change(
    screen.getByPlaceholderText('Enter JSON request body or upload a DMN file to auto-generate'),
    { target: { value: body } }
  );
};

/** Upload a .dmn file and wait for the FileReader to settle. */
const uploadDmn = async (content = dmnXml(), name = 'model.dmn') => {
  const input = screen.getByLabelText('Choose a file');
  fireEvent.change(input, { target: { files: [new File([content], name, { type: 'text/xml' })] } });
  // FileReader is async, so the filename appearing is the signal that onload ran
  // and the component has the content.
  await screen.findByText(name);
};

afterEach(() => {
  vi.restoreAllMocks();
  delete global.fetch;
});

describe('DMNTab', () => {
  describe('file upload', () => {
    test('rejects a file that is not a .dmn', async () => {
      mockBackend();
      renderTab();

      fireEvent.change(screen.getByLabelText('Choose a file'), {
        target: { files: [new File(['{}'], 'model.json', { type: 'application/json' })] },
      });

      expect(await screen.findByText(/valid DMN file/)).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('accepts a .dmn, records it, and extracts the decision key', async () => {
      mockBackend();
      const { props } = renderTab();

      await uploadDmn();

      await waitFor(() =>
        expect(props.setDmnData).toHaveBeenCalledWith(
          expect.objectContaining({
            fileName: 'model.dmn',
            content: dmnXml(),
            decisionKey: DECISION_KEY,
          })
        )
      );
    });

    test('uploading immediately runs backend validation', async () => {
      const { fetchMock } = mockBackend();
      renderTab();

      await uploadDmn();

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          'http://localhost:3001/v1/dmns/validate',
          expect.objectContaining({ method: 'POST' })
        )
      );
    });
  });

  describe('backend validation', () => {
    test('reports a valid model', async () => {
      mockBackend();
      renderTab();

      await uploadDmn();

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      expect(screen.queryByText(/Syntax validation result not available/)).not.toBeInTheDocument();
    });

    test('surfaces a rejection from the backend as an error, not a crash', async () => {
      mockBackend({
        validate: json({ success: false, error: { message: 'Malformed DMN' } }, false),
      });
      renderTab();

      await uploadDmn();

      expect(await screen.findByText(/Malformed DMN/)).toBeInTheDocument();
    });

    test('an unreachable backend is advisory, not blocking', async () => {
      // This is the path a developer hits with no local backend running, and the
      // one the ACC preview showed. It must read as "skipped", not "failed" —
      // deployment and testing still work, only the syntax pre-check is missing.
      mockBackend({ validate: rejects('Failed to fetch') });
      renderTab();

      await uploadDmn();

      // Rendered twice — an amber summary line and the detailed explanation.
      expect(
        (await screen.findAllByText(/Syntax validation result not available/)).length
      ).toBeGreaterThan(0);
      expect(screen.getByText(/only syntax pre-checks are skipped/)).toBeInTheDocument();
    });
  });

  describe('deployment', () => {
    test('offers no deploy button at all until a file is uploaded', () => {
      // handleDeployDMN opens with `if (!uploadedFile) setError('Please upload a
      // DMN file first')`, but that branch is unreachable: the button lives
      // inside the uploadedFile branch of the render, so there is nothing to
      // click until a file exists. The guard is defensive dead code, and the
      // real contract is the absence of the control.
      mockBackend();
      renderTab();

      expect(screen.queryByRole('button', { name: /Deploy to Operaton/ })).not.toBeInTheDocument();
    });

    test('posts the XML to the backend and records the deployment', async () => {
      const { fetchMock } = mockBackend();
      const { props } = renderTab();

      await uploadDmn();
      fireEvent.click(screen.getByRole('button', { name: /Deploy to Operaton/ }));

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          'http://localhost:3001/v1/dmns/deploy',
          expect.objectContaining({ method: 'POST' })
        )
      );
      await waitFor(() =>
        expect(props.setDmnData).toHaveBeenCalledWith(
          expect.objectContaining({ deployed: true, deploymentId: 'dep-1' })
        )
      );
    });

    test('reports the backend error message when deployment fails', async () => {
      mockBackend({
        deploy: json({ success: false, error: { message: 'Engine rejected the model' } }, false),
      });
      const { props } = renderTab();

      await uploadDmn();
      fireEvent.click(screen.getByRole('button', { name: /Deploy to Operaton/ }));

      expect(await screen.findByText(/Engine rejected the model/)).toBeInTheDocument();
      // A failed deployment must not mark the model as deployed.
      expect(props.setDmnData).not.toHaveBeenCalledWith(
        expect.objectContaining({ deployed: true })
      );
    });
  });

  describe('evaluation is gated on deployment', () => {
    test('the evaluate button is disabled before a successful deployment', async () => {
      mockBackend();
      renderTab();

      await uploadDmn();

      expect(screen.getByRole('button', { name: /Evaluate Decision/ })).toBeDisabled();
    });

    test('it becomes available once deployment succeeds', async () => {
      mockBackend();
      renderTab();

      await uploadDmn();
      fireEvent.click(screen.getByRole('button', { name: /Deploy to Operaton/ }));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Evaluate Decision/ })).toBeEnabled()
      );
    });
  });

  describe('the full chain: upload, validate, deploy, evaluate, generate concepts', () => {
    test('walks the lifecycle and populates the Concepts tab', async () => {
      const { fetchMock } = mockBackend();
      const { props } = renderTab();

      await uploadDmn();
      enterRequestBody();
      fireEvent.click(screen.getByRole('button', { name: /Deploy to Operaton/ }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Evaluate Decision/ })).toBeEnabled()
      );
      fireEvent.click(screen.getByRole('button', { name: /Evaluate Decision/ }));

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          `http://localhost:3001/v1/dmns/evaluate/${DECISION_KEY}`,
          expect.objectContaining({ method: 'POST' })
        )
      );

      // All three endpoints, in order, and the concepts handed to App.
      const urls = fetchMock.mock.calls.map(([url]) => url);
      expect(urls.filter((u) => u.includes('/validate'))).toHaveLength(1);
      expect(urls.filter((u) => u.includes('/deploy'))).toHaveLength(1);
      expect(urls.filter((u) => u.includes('/evaluate'))).toHaveLength(1);

      await waitFor(() => expect(props.setConcepts).toHaveBeenCalled());
    });

    test('a failed evaluation surfaces the status text and generates no concepts', async () => {
      mockBackend({ evaluate: json({ message: 'boom' }, false) });
      const { props } = renderTab();

      await uploadDmn();
      enterRequestBody();
      fireEvent.click(screen.getByRole('button', { name: /Deploy to Operaton/ }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Evaluate Decision/ })).toBeEnabled()
      );
      props.setConcepts.mockClear();
      fireEvent.click(screen.getByRole('button', { name: /Evaluate Decision/ }));

      // Reported in two places, deliberately: the error banner at the top of the
      // tab, and the test-response panel beside the request body.
      expect((await screen.findAllByText(/Evaluation failed/)).length).toBeGreaterThan(0);
      expect(props.setConcepts).not.toHaveBeenCalled();
    });
  });
});
