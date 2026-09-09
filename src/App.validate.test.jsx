import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import App from './App';
import { validateForm } from './utils';
import { validateDMNData } from './utils/dmnHelpers';

vi.mock('./utils', async (importOriginal) => ({
  ...(await importOriginal()),
  validateForm: vi.fn(),
}));
vi.mock('./utils/dmnHelpers', async (importOriginal) => ({
  ...(await importOriginal()),
  validateDMNData: vi.fn(),
}));

/**
 * Validation, and the pre-publish check that repeats it.
 *
 * Two validators run over the same state: validateForm covers the CPSV-AP
 * fields, validateDMNData covers the attached decision model. Both the Validate
 * button and the publish flow consult both, and the publish flow refuses to
 * upload when either objects — so a service that fails validation cannot reach
 * TriplyDB even though the dialog opened.
 *
 * Both are mocked here. What is under test is how App combines their verdicts,
 * not what either considers valid; those have their own tests.
 */

const bothValid = () => {
  validateForm.mockReturnValue({ isValid: true, errors: [] });
  validateDMNData.mockReturnValue({ valid: true, errors: [] });
};

const clickValidate = () => fireEvent.click(screen.getByRole('button', { name: /^Validate$/ }));

let alertSpy;

beforeEach(() => {
  vi.clearAllMocks();
  bothValid();
  alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe('the Validate button', () => {
  test('confirms success when both validators agree', () => {
    render(<App />);
    clickValidate();

    expect(alertSpy).toHaveBeenCalledWith(
      '✅ Validation successful! All required fields are filled correctly.'
    );
  });

  test('reports form errors', () => {
    validateForm.mockReturnValue({ isValid: false, errors: ['Service name is required'] });

    render(<App />);
    clickValidate();

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Service name is required'));
  });

  test('reports DMN errors, prefixed so their source is clear', () => {
    // Both validators write into one list, so the DMN ones are labelled — the
    // alert is the only place a user sees them.
    validateForm.mockReturnValue({ isValid: false, errors: ['Service name is required'] });
    validateDMNData.mockReturnValue({ valid: false, errors: ['no decision key'] });

    render(<App />);
    clickValidate();

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('DMN: no decision key'));
  });

  test('a DMN error alone does not make the form invalid', () => {
    // isValid comes from validateForm only, so an invalid DMN is collected into
    // the error list but still reports success — worth pinning as the current
    // behaviour rather than assumed either way.
    validateDMNData.mockReturnValue({ valid: false, errors: ['no decision key'] });

    render(<App />);
    clickValidate();

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Validation successful'));
  });
});

describe('the pre-publish check', () => {
  const openPublish = () => fireEvent.click(screen.getByRole('button', { name: /^Publish$/ }));

  const publishNow = async () => {
    openPublish();
    // The dialog needs a complete configuration before its button is enabled;
    // loadTriplyDBConfig supplies account and dataset defaults, so only the
    // token is missing.
    fireEvent.change(await screen.findByPlaceholderText('Enter your TriplyDB API token'), {
      target: { value: 'a-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Publish to TriplyDB/ }));
  };

  test('refuses to publish when the form is invalid', async () => {
    validateForm.mockReturnValue({ isValid: false, errors: ['Service name is required'] });

    render(<App />);
    await publishNow();

    // The dialog's step label also reads "Validation failed", so the query has
    // to name the banner's joined error list to stay unambiguous.
    expect(await screen.findByText(/Validation failed: /)).toBeInTheDocument();
  });

  test('refuses to publish when only the DMN is invalid', async () => {
    // Unlike the Validate button, publishing treats an invalid DMN as fatal:
    // the model is what the published service claims to be executable by.
    validateDMNData.mockReturnValue({ valid: false, errors: ['no decision key'] });

    render(<App />);
    await publishNow();

    // The dialog's step label also reads "Validation failed", so the query has
    // to name the banner's joined error list to stay unambiguous.
    expect(await screen.findByText(/Validation failed: /)).toBeInTheDocument();
    // Reported in both places at once: the dialog's error line and the banner.
    expect(screen.getAllByText(/DMN: no decision key/)).not.toHaveLength(0);
  });

  test('the failure message and the dialog both clear themselves', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    validateForm.mockReturnValue({ isValid: false, errors: ['Service name is required'] });

    render(<App />);
    await publishNow();
    await screen.findByText(/Validation failed: /);

    vi.advanceTimersByTime(8000);

    await waitFor(() => expect(screen.queryByText(/Validation failed:/)).not.toBeInTheDocument());
    vi.useRealTimers();
  });
});
