import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { setAuthState } from '../../testing/authState';
import DMNTab from './DMNTab';

/**
 * Deploy follows sign-in (#163 in linked-data-explorer). An author deploys as
 * before, with a token. Anyone else gets an anonymous "Test deploy" to the
 * tenant TestOnly where the backend offers it, and a locked button where it
 * does not; a test deploy's evaluations go to that tenant.
 */

const dmn =
  `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">` +
  `<inputData id="in_leeftijd" name="leeftijd"><variable name="leeftijd" typeRef="integer" /></inputData>` +
  `<decision id="Bepaal" name="Bepaal" /></definitions>`;

const dmnData = {
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
  text: () => Promise.resolve(JSON.stringify(body)),
});

const TEST_DEPLOY_ON = {
  success: true,
  data: { testDeploy: { enabled: true, tenantId: 'TestOnly', ttlHours: 48 } },
};
const TEST_DEPLOY_OFF = {
  success: true,
  data: { testDeploy: { enabled: false, tenantId: 'TestOnly', ttlHours: 48 } },
};

const mockBackend = ({ options = TEST_DEPLOY_ON, deploy } = {}) => {
  const fetchMock = vi.fn((url) => {
    const href = String(url);
    if (href.includes('/v1/dmns/deploy/options'))
      return options instanceof Error ? Promise.reject(options) : Promise.resolve(respond(options));
    if (href.includes('/v1/dmns/validate'))
      return Promise.resolve(respond({ success: true, data: okValidation }));
    if (href.includes('/v1/dmns/deploy'))
      return (
        deploy ??
        (() =>
          Promise.resolve(
            respond({
              success: true,
              data: { deploymentId: 'abcdef1234567890', tenantId: 'TestOnly', expiresAt: 'x' },
            })
          ))
      )();
    if (href.includes('/v1/dmns/evaluate'))
      return Promise.resolve(respond([{ leeftijd: { value: 67 } }]));
    return Promise.resolve(respond({}));
  });
  global.fetch = fetchMock;
  return { fetchMock };
};

const renderTab = () =>
  render(<DMNTab dmnData={dmnData} setDmnData={vi.fn()} setConcepts={vi.fn()} />);

const uploadDmn = async () => {
  fireEvent.change(screen.getByLabelText('Choose a file'), {
    target: { files: [new File([dmn], 'model.dmn', { type: 'text/xml' })] },
  });
  await screen.findByText('model.dmn');
};

const SIGNED_OUT = { ready: true, signedIn: false, isAuthor: false };
const deployCall = (fetchMock) =>
  fetchMock.mock.calls.find(([u]) => String(u).endsWith('/v1/dmns/deploy'));

afterEach(() => {
  delete global.fetch;
});

describe('an author', () => {
  test('deploys to Operaton as before, with a token', async () => {
    const { fetchMock } = mockBackend();
    renderTab();
    await uploadDmn();

    fireEvent.click(screen.getByRole('button', { name: /Deploy to Operaton/ }));

    await waitFor(() => expect(deployCall(fetchMock)).toBeTruthy());
    expect(deployCall(fetchMock)[1].headers).toMatchObject({
      Authorization: 'Bearer test-token',
    });
    // An author needs no test deploy options.
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/deploy/options'))).toBe(false);
  });
});

describe('signed out, where the backend offers test deploys', () => {
  test('offers "Test deploy to Operaton" with what it means', async () => {
    setAuthState(SIGNED_OUT);
    mockBackend();
    renderTab();
    await uploadDmn();

    expect(await screen.findByRole('button', { name: /Test deploy to Operaton/ })).toBeEnabled();
    expect(
      screen.getByText(
        'Deploys to the test tenant TestOnly, removed automatically after 48 hours. Refused if a decision key already exists in the engine.'
      )
    ).toBeInTheDocument();
  });

  test('a test deploy sends no token, says when it goes, and evaluates in TestOnly', async () => {
    setAuthState(SIGNED_OUT);
    const { fetchMock } = mockBackend();
    renderTab();
    await uploadDmn();

    fireEvent.click(await screen.findByRole('button', { name: /Test deploy to Operaton/ }));

    expect(
      await screen.findByText('Test deploy — ID: abcdef12…, removed after 48 hours')
    ).toBeInTheDocument();
    expect(deployCall(fetchMock)[1].headers).not.toHaveProperty('Authorization');

    fireEvent.click(screen.getByRole('button', { name: /Evaluate Decision/ }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/evaluate'))).toBe(true)
    );
    const evaluateUrl = String(
      fetchMock.mock.calls.find(([u]) => String(u).includes('/evaluate'))[0]
    );
    expect(evaluateUrl).toContain('tenantId=TestOnly');
  });

  test("a key that already exists shows the backend's reason", async () => {
    setAuthState(SIGNED_OUT);
    mockBackend({
      deploy: () =>
        Promise.resolve(
          respond(
            {
              code: 'TEST_DEPLOY_KEY_EXISTS',
              detail: 'Decision key "Bepaal" already exists in the engine.',
            },
            { ok: false, status: 409, statusText: 'Conflict' }
          )
        ),
    });
    renderTab();
    await uploadDmn();

    fireEvent.click(await screen.findByRole('button', { name: /Test deploy to Operaton/ }));

    expect(
      await screen.findByText(/Decision key "Bepaal" already exists in the engine\./)
    ).toBeInTheDocument();
  });

  test('the refusal shows right under the Deploy button, not only at the bottom', async () => {
    setAuthState(SIGNED_OUT);
    mockBackend({
      deploy: () =>
        Promise.resolve(
          respond(
            { code: 'TEST_DEPLOY_KEY_EXISTS', detail: 'Decision key "Bepaal" already exists.' },
            { ok: false, status: 409, statusText: 'Conflict' }
          )
        ),
    });
    renderTab();
    await uploadDmn();

    fireEvent.click(await screen.findByRole('button', { name: /Test deploy to Operaton/ }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Decision key "Bepaal" already exists.');
    // Once, beside the button: the general error box below stays empty.
    expect(screen.getAllByText(/Decision key "Bepaal" already exists\./)).toHaveLength(1);
    // And before the evaluation section, where the eye is after clicking.
    expect(
      alert.compareDocumentPosition(screen.getByText('Test Evaluation')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  test('too many test deploys says to try again later', async () => {
    setAuthState(SIGNED_OUT);
    mockBackend({
      deploy: () =>
        Promise.resolve(
          respond(
            { code: 'TEST_DEPLOY_RATE_LIMITED', detail: 'At most 10 test deploys per hour.' },
            { ok: false, status: 429, statusText: 'Too Many Requests' }
          )
        ),
    });
    renderTab();
    await uploadDmn();

    fireEvent.click(await screen.findByRole('button', { name: /Test deploy to Operaton/ }));

    expect(
      await screen.findByText(/Too many test deploys from this address; try again later\./)
    ).toBeInTheDocument();
  });
});

describe('where test deploys are not offered', () => {
  test('signed out: Deploy is locked, "Sign in to deploy"', async () => {
    setAuthState(SIGNED_OUT);
    mockBackend({ options: TEST_DEPLOY_OFF });
    renderTab();
    await uploadDmn();

    expect(await screen.findByText('Sign in to deploy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deploy to Operaton/ })).toBeDisabled();
  });

  test('signed in without the role: "You need permission to deploy"', async () => {
    setAuthState({ ready: true, signedIn: true, isAuthor: false, name: 'Viewer' });
    mockBackend({ options: TEST_DEPLOY_OFF });
    renderTab();
    await uploadDmn();

    expect(await screen.findByText('You need permission to deploy')).toBeInTheDocument();
  });

  test('options that fail to load: Deploy is locked', async () => {
    setAuthState(SIGNED_OUT);
    mockBackend({ options: new Error('offline') });
    renderTab();
    await uploadDmn();

    expect(await screen.findByText('Sign in to deploy')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Test deploy/ })).toBeNull();
  });
});
