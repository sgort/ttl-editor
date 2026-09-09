import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { validateTtl } from '../utils/shaclHelper';
import { testTriplyDBConnection } from '../utils/triplydbHelper';
import PublishDialog from './PublishDialog';

vi.mock('../utils/shaclHelper');
vi.mock('../utils/triplydbHelper');

/**
 * The dialog's states: SHACL advice, connection testing, and publishing.
 *
 * PublishDialog.test.jsx covers the controlled-config contract. This file covers
 * everything the dialog does while it is open — which is where it spends its
 * time, and where none of it was exercised.
 *
 * The SHACL panel is advisory and must never block publishing: a document with
 * violations still offers the Publish button, and the panel says so. That is a
 * deliberate product decision rather than an oversight, so it is pinned here.
 */

const config = {
  baseUrl: 'https://api.example.org',
  account: 'acme',
  dataset: 'services',
  apiToken: 'secret-token',
};

const TTL = '@prefix ex: <https://example.org/> .\nex:s a ex:T .\n';

const renderDialog = (overrides = {}) => {
  const props = {
    onClose: vi.fn(),
    onPublish: vi.fn(),
    config,
    onConfigChange: vi.fn(),
    publishingState: null,
    ttlContent: '',
    ...overrides,
  };
  return { props, ...render(<PublishDialog {...props} />) };
};

/** A SHACL result with no findings. */
const conformant = { valid: true, summary: { errors: 0, warnings: 0 }, layers: {} };

beforeEach(() => {
  vi.clearAllMocks();
  validateTtl.mockResolvedValue(conformant);
});

describe('SHACL validation on open', () => {
  test('does not validate when there is nothing to validate', () => {
    renderDialog({ ttlContent: '' });

    expect(validateTtl).not.toHaveBeenCalled();
  });

  test('does not validate whitespace-only content either', () => {
    renderDialog({ ttlContent: '   \n  ' });

    expect(validateTtl).not.toHaveBeenCalled();
  });

  test('validates on mount when there is content, and reports conformance', async () => {
    renderDialog({ ttlContent: TTL });

    expect(validateTtl).toHaveBeenCalledWith(TTL);
    expect(await screen.findByText(/Conformant — 0 violations/)).toBeInTheDocument();
  });

  test('shows a spinner from the first frame rather than after a re-render', () => {
    // The validating flag is seeded during construction, not set in the effect,
    // so the panel is never briefly blank. See issue #87.
    renderDialog({ ttlContent: TTL });

    expect(screen.getByText(/Validating…/)).toBeInTheDocument();
  });

  test('violations are reported, and publishing is still offered', async () => {
    validateTtl.mockResolvedValue({
      valid: false,
      summary: { errors: 2, warnings: 3 },
      layers: {},
    });

    renderDialog({ ttlContent: TTL });

    expect(await screen.findByText(/2 error\(s\), 3 warning\(s\)/)).toBeInTheDocument();
    // Advisory, not blocking — the wording is part of the contract.
    expect(screen.getByText(/you can still publish/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publish to TriplyDB/ })).toBeEnabled();
  });

  test('an unavailable validator explains itself instead of failing', async () => {
    // The SHACL service lives in the LDE backend; a preview deployment cannot
    // reach it, and that must not look like a validation failure.
    validateTtl.mockResolvedValue({
      unavailable: true,
      parseError: 'Validation service unavailable',
    });

    renderDialog({ ttlContent: TTL });

    expect(await screen.findByText('Validation service unavailable')).toBeInTheDocument();
  });

  test('a Turtle parse error is labelled as one', async () => {
    validateTtl.mockResolvedValue({ parseError: 'Unexpected "]" on line 4' });

    renderDialog({ ttlContent: TTL });

    expect(await screen.findByText(/Turtle parse error: Unexpected/)).toBeInTheDocument();
  });

  test('issues are listed per layer, with severity and location', async () => {
    validateTtl.mockResolvedValue({
      valid: false,
      summary: { errors: 1, warnings: 1 },
      layers: {
        cpsv: {
          label: 'CPSV-AP',
          issues: [
            { severity: 'error', message: 'Missing dct:title', location: 'ex:service' },
            { severity: 'warning', message: 'No dct:description' },
            { severity: 'info', message: 'Consider adding keywords' },
          ],
        },
        empty: { label: 'Unused layer', issues: [] },
      },
    });

    renderDialog({ ttlContent: TTL });

    expect(await screen.findByText('CPSV-AP')).toBeInTheDocument();
    expect(screen.getByText(/Missing dct:title/)).toBeInTheDocument();
    expect(screen.getByText(/— ex:service/)).toBeInTheDocument();
    expect(screen.getByText(/No dct:description/)).toBeInTheDocument();
    expect(screen.getByText(/Consider adding keywords/)).toBeInTheDocument();
    // A layer with no issues contributes no heading.
    expect(screen.queryByText('Unused layer')).not.toBeInTheDocument();
  });

  test('re-validating runs it again', async () => {
    renderDialog({ ttlContent: TTL });
    await screen.findByText(/Conformant/);

    fireEvent.click(screen.getByRole('button', { name: /Validate now/ }));

    await waitFor(() => expect(validateTtl).toHaveBeenCalledTimes(2));
  });

  test('the whole panel is absent when there is nothing to validate', () => {
    // Not merely empty: with no Turtle to check there is nothing useful to say,
    // so the panel and its Validate button are not rendered at all.
    renderDialog({ ttlContent: '' });

    expect(screen.queryByText('Pre-publish SHACL validation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Validate now/ })).not.toBeInTheDocument();
  });
});

describe('connection testing', () => {
  test('reports a successful connection', async () => {
    testTriplyDBConnection.mockResolvedValue({ success: true, message: 'Connected' });

    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /Test Connection/i }));

    await waitFor(() => expect(testTriplyDBConnection).toHaveBeenCalledWith(config));
  });

  test('turns a thrown error into a message rather than an unhandled rejection', async () => {
    testTriplyDBConnection.mockRejectedValue(new Error('401 Unauthorized'));

    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /Test Connection/i }));

    expect(await screen.findByText(/401 Unauthorized/)).toBeInTheDocument();
  });
});

describe('publishing', () => {
  test('an incomplete configuration disables publishing rather than warning about it', () => {
    // handlePublish carries an alert() for a missing account, dataset or token,
    // but the button is disabled on exactly that condition, so the guard cannot
    // be reached through the UI. The disabled button is the real behaviour.
    const { props } = renderDialog({ config: { ...config, apiToken: '' } });

    const publish = screen.getByRole('button', { name: /Publish to TriplyDB/ });
    expect(publish).toBeDisabled();

    fireEvent.click(publish);
    expect(props.onPublish).not.toHaveBeenCalled();
  });

  test('each required field on its own disables publishing', () => {
    for (const missing of ['baseUrl', 'account', 'dataset', 'apiToken']) {
      const { unmount } = render(
        <PublishDialog
          onClose={vi.fn()}
          onPublish={vi.fn()}
          config={{ ...config, [missing]: '' }}
          onConfigChange={vi.fn()}
          publishingState={null}
          ttlContent=""
        />
      );

      expect(
        screen.getByRole('button', { name: /Publish to TriplyDB/ }),
        `missing ${missing} should disable publishing`
      ).toBeDisabled();

      unmount();
    }
  });

  test('publishes a complete configuration', () => {
    const { props } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /Publish to TriplyDB/ }));

    expect(props.onPublish).toHaveBeenCalledWith(config);
  });
});

describe('publishing progress', () => {
  const publishing = (overrides) => ({
    isPublishing: true,
    currentStep: 'Uploading to TriplyDB',
    progress: 60,
    stepStatus: 'loading',
    error: null,
    ...overrides,
  });

  test('while publishing, progress replaces the configuration form', () => {
    renderDialog({ publishingState: publishing() });

    expect(screen.getByText('Uploading to TriplyDB')).toBeInTheDocument();
    // The form is hidden so the configuration cannot be edited mid-publish.
    expect(screen.queryByPlaceholderText('stevengort')).not.toBeInTheDocument();
  });

  test('completed steps are ticked and later ones are not', () => {
    renderDialog({ publishingState: publishing({ progress: 60 }) });

    expect(screen.getByText(/✓ Validating form/)).toBeInTheDocument();
    expect(screen.getByText(/✓ Generating TTL/)).toBeInTheDocument();
    expect(screen.getByText(/✓ Uploading to TriplyDB/)).toBeInTheDocument();
    expect(screen.getByText(/○ Updating service/)).toBeInTheDocument();
  });

  test('nothing is ticked at the start', () => {
    renderDialog({ publishingState: publishing({ progress: 0 }) });

    expect(screen.getByText(/○ Validating form/)).toBeInTheDocument();
  });

  test('an error during publishing is shown', () => {
    renderDialog({
      publishingState: publishing({ error: 'Upload rejected', stepStatus: 'error' }),
    });

    expect(screen.getByText('Upload rejected')).toBeInTheDocument();
  });

  test('a finished success is reported once publishing stops', () => {
    renderDialog({
      publishingState: publishing({
        isPublishing: false,
        stepStatus: 'success',
        currentStep: 'Published successfully',
      }),
    });

    expect(screen.getByText('Published successfully')).toBeInTheDocument();
  });

  test('a warning carries its explanation', () => {
    renderDialog({
      publishingState: publishing({
        isPublishing: false,
        stepStatus: 'warning',
        currentStep: 'Published with warnings',
        error: 'Service update failed',
      }),
    });

    expect(screen.getByText('Published with warnings')).toBeInTheDocument();
    expect(screen.getByText('Service update failed')).toBeInTheDocument();
  });

  test('a warning with no explanation still reports the step', () => {
    renderDialog({
      publishingState: publishing({
        isPublishing: false,
        stepStatus: 'warning',
        currentStep: 'Published with warnings',
        error: null,
      }),
    });

    expect(screen.getByText('Published with warnings')).toBeInTheDocument();
  });

  test('a failure carries its explanation', () => {
    renderDialog({
      publishingState: publishing({
        isPublishing: false,
        stepStatus: 'error',
        currentStep: 'Publish failed',
        error: 'Dataset not found',
      }),
    });

    expect(screen.getByText('Publish failed')).toBeInTheDocument();
    expect(screen.getByText('Dataset not found')).toBeInTheDocument();
  });

  test('a failure with no explanation still reports the step', () => {
    renderDialog({
      publishingState: publishing({
        isPublishing: false,
        stepStatus: 'error',
        currentStep: 'Publish failed',
        error: null,
      }),
    });

    expect(screen.getByText('Publish failed')).toBeInTheDocument();
  });

  test('an unrecognised step status renders without an icon or colour', () => {
    // The default arms of getStepColor and getStepIcon: a status the dialog
    // does not know must not crash it.
    expect(() =>
      renderDialog({ publishingState: publishing({ stepStatus: 'something-else' }) })
    ).not.toThrow();
  });
});
