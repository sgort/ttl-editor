import { fireEvent, render, screen } from '@testing-library/react';

import DMNTab from './DMNTab';

/**
 * The syntax-validation panel.
 *
 * Every upload is posted to the backend's `/v1/dmns/validate` before anything
 * else happens, and what comes back is a layered report: base DMN, business,
 * execution and interaction rules, each with issues at three severities. The
 * panel has to say which of four situations it is in — still checking, checked
 * and clean, checked and complaining, or unable to check at all — because they
 * mean very different things to an author staring at a model that will not
 * deploy.
 *
 * The fourth is the one that keeps being got wrong. A backend that cannot be
 * reached is not a failed validation: deploy and evaluate still work, and only
 * the pre-check is missing. It renders amber and says so, rather than red.
 */

const dmnXml =
  `<?xml version="1.0"?><definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/">` +
  `<decision id="Bepaal" name="Bepaal" /></definitions>`;

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

const layers = (overrides = {}) => ({
  base: { label: 'Base DMN', issues: [], ...overrides.base },
  business: { label: 'Business Rules', issues: [], ...overrides.business },
  execution: { label: 'Execution Rules', issues: [], ...overrides.execution },
  interaction: { label: 'Interaction Rules', issues: [], ...overrides.interaction },
});

const respond = (body, { ok = true } = {}) => ({
  ok,
  status: ok ? 200 : 500,
  statusText: ok ? 'OK' : 'Internal Server Error',
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});

/** `validate` is a thunk, so a rejection is only constructed when it is used. */
const mockBackend = (validate) => {
  global.fetch = vi.fn((url) => {
    if (String(url).includes('/v1/dmns/validate'))
      return (validate ?? (() => Promise.resolve(respond({ success: true, data: null }))))();
    return Promise.resolve(respond({ success: true, data: {} }));
  });
};

const renderTab = () => {
  const props = { dmnData: defaultDmnData, setDmnData: vi.fn(), setConcepts: vi.fn() };
  return { props, ...render(<DMNTab {...props} />) };
};

const uploadDmn = async () => {
  fireEvent.change(screen.getByLabelText('Choose a file'), {
    target: { files: [new File([dmnXml], 'model.dmn', { type: 'text/xml' })] },
  });
  await screen.findByText('model.dmn');
};

afterEach(() => {
  vi.restoreAllMocks();
  delete global.fetch;
});

test('says it is still checking while the backend has not answered', async () => {
  let release;
  mockBackend(
    () =>
      new Promise((resolve) => {
        release = () =>
          resolve(
            respond({
              success: true,
              data: {
                valid: true,
                layers: layers(),
                summary: { errors: 0, warnings: 0, infos: 0 },
              },
            })
          );
      })
  );
  renderTab();

  await uploadDmn();

  expect(await screen.findByText('Validating…')).toBeInTheDocument();
  release();
  expect(await screen.findByText('Syntax valid')).toBeInTheDocument();
});

test('a clean report collapses itself and shows no issue counts', async () => {
  mockBackend(() =>
    Promise.resolve(
      respond({
        success: true,
        data: { valid: true, layers: layers(), summary: { errors: 0, warnings: 0, infos: 0 } },
      })
    )
  );
  renderTab();

  await uploadDmn();

  expect(await screen.findByText('Syntax valid')).toBeInTheDocument();
  // Nothing to read, so nothing is opened for the author to close again.
  expect(screen.queryByText('Base DMN')).not.toBeInTheDocument();
});

test('a report with issues opens itself and lays them out by layer and severity', async () => {
  mockBackend(() =>
    Promise.resolve(
      respond({
        success: true,
        data: {
          valid: false,
          layers: layers({
            base: {
              issues: [
                {
                  code: 'DMN-001',
                  severity: 'error',
                  message: 'Decision has no decision table',
                  location: 'decision[@id="Bepaal"]',
                },
              ],
            },
            business: {
              issues: [{ code: 'BR-014', severity: 'warning', message: 'Rule is unreachable' }],
            },
            execution: {
              issues: [
                { code: 'EX-002', severity: 'info', message: 'Hit policy defaults to UNIQUE' },
              ],
            },
          }),
          summary: { errors: 1, warnings: 1, infos: 1 },
        },
      })
    )
  );
  renderTab();

  await uploadDmn();

  expect(await screen.findByText('Syntax issues found')).toBeInTheDocument();
  // One badge per severity that actually occurs.
  expect(screen.getByText('1E')).toBeInTheDocument();
  expect(screen.getByText('1W')).toBeInTheDocument();
  expect(screen.getByText('1I')).toBeInTheDocument();
  // Layers with nothing to say are left out entirely.
  expect(screen.getByText('Base DMN')).toBeInTheDocument();
  expect(screen.getByText('Business Rules')).toBeInTheDocument();
  expect(screen.queryByText('Interaction Rules')).not.toBeInTheDocument();
  expect(screen.getByText('DMN-001')).toBeInTheDocument();
  expect(screen.getByText('Rule is unreachable')).toBeInTheDocument();
  expect(screen.getByText('Hit policy defaults to UNIQUE')).toBeInTheDocument();
  // A location is the difference between "something is wrong" and "line 14".
  expect(screen.getByText('decision[@id="Bepaal"]')).toBeInTheDocument();
});

test('the report can be collapsed and reopened', async () => {
  mockBackend(() =>
    Promise.resolve(
      respond({
        success: true,
        data: {
          valid: false,
          parseError: 'Unexpected end of input at line 12',
          layers: layers(),
          summary: { errors: 1, warnings: 0, infos: 0 },
        },
      })
    )
  );
  renderTab();

  await uploadDmn();
  expect(await screen.findByText('Unexpected end of input at line 12')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Syntax issues found/ }));
  expect(screen.queryByText('Unexpected end of input at line 12')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Syntax issues found/ }));
  expect(await screen.findByText('Unexpected end of input at line 12')).toBeInTheDocument();
});

test('a rejection carrying no message still says something', async () => {
  // The backend answered, and it said no. Rendering an empty red box would
  // leave the author with a model that will not deploy and no reason given.
  mockBackend(() => Promise.resolve(respond({ success: false }, { ok: false })));
  renderTab();

  await uploadDmn();

  expect(await screen.findByText('Backend validation failed')).toBeInTheDocument();
});

test('an unreachable backend reads as skipped, not failed', async () => {
  mockBackend(() => Promise.reject(new Error('Failed to fetch')));
  renderTab();

  await uploadDmn();

  expect(
    (await screen.findAllByText(/Syntax validation result not available/)).length
  ).toBeGreaterThan(0);
  expect(screen.getByText(/only syntax pre-checks are skipped/)).toBeInTheDocument();
  // No counts: nothing was counted, as opposed to nothing being wrong.
  expect(screen.queryByText('1E')).not.toBeInTheDocument();
});
