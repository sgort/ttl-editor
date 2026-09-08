import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import App from './App';
import { validateForm } from './utils';
import { validateDMNData } from './utils/dmnHelpers';
import {
  buildGraphIRI,
  publishToTriplyDB,
  saveTriplyDBConfig,
  updateTriplyDBService,
  uploadLogoAsset,
} from './utils/triplydbHelper';

vi.mock('./utils/triplydbHelper', async (importOriginal) => ({
  ...(await importOriginal()),
  buildGraphIRI: vi.fn(),
  publishToTriplyDB: vi.fn(),
  updateTriplyDBService: vi.fn(),
  uploadLogoAsset: vi.fn(),
  saveTriplyDBConfig: vi.fn(),
}));
vi.mock('./utils', async (importOriginal) => ({
  ...(await importOriginal()),
  validateForm: vi.fn(),
}));
vi.mock('./utils/dmnHelpers', async (importOriginal) => ({
  ...(await importOriginal()),
  validateDMNData: vi.fn(),
}));

/**
 * Publishing to TriplyDB, and importing CPRMV rules from JSON.
 *
 * The publish flow is a sequence of awaited steps that each report progress into
 * the dialog, and any of them can fail. What is worth pinning is not the happy
 * path's wording but which failures are fatal and which are survivable: a failed
 * graph upload stops everything, while a failed service update leaves the data
 * uploaded and is reported as a warning rather than an error — the graph is in
 * TriplyDB either way, and telling the user it failed outright would be wrong.
 *
 * The TriplyDB helpers are mocked. Their own behaviour is covered in
 * triplydbHelper.test.js; what is under test here is how App sequences them.
 */

const openPublishAndSubmit = async () => {
  fireEvent.click(screen.getByRole('button', { name: /^Publish$/ }));
  fireEvent.change(await screen.findByPlaceholderText('Enter your TriplyDB API token'), {
    target: { value: 'a-token' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Publish to TriplyDB/ }));
};

beforeEach(() => {
  vi.clearAllMocks();
  buildGraphIRI.mockReturnValue('https://example.org/graphs/service');
  publishToTriplyDB.mockResolvedValue({ success: true, url: 'https://example.org/graph' });
  updateTriplyDBService.mockResolvedValue({ success: true });
  uploadLogoAsset.mockResolvedValue({ success: true });
  validateForm.mockReturnValue({ isValid: true, errors: [] });
  validateDMNData.mockReturnValue({ valid: true, errors: [] });
});

describe('publishing', () => {
  test('uploads the graph, updates the service and remembers the configuration', async () => {
    render(<App />);
    await openPublishAndSubmit();

    await waitFor(() => expect(publishToTriplyDB).toHaveBeenCalled());
    await waitFor(() => expect(updateTriplyDBService).toHaveBeenCalled());
    // The token is only persisted once a publish has actually worked.
    expect(saveTriplyDBConfig).toHaveBeenCalledWith(
      expect.objectContaining({ apiToken: 'a-token' })
    );
  });

  test('reports success in the dialog', async () => {
    render(<App />);
    await openPublishAndSubmit();

    // Reported twice over: once in the dialog's step line, once in the page
    // banner behind it.
    expect(await screen.findAllByText(/Published successfully/)).not.toHaveLength(0);
  });

  test('a failed upload is caught, and stops the sequence before the service update', async () => {
    // publishToTriplyDB reports failure by throwing — on an empty file, an
    // invalid configuration or invalid content — rather than by returning a
    // success flag, which is why App does not inspect its return value.
    publishToTriplyDB.mockRejectedValue(new Error('network down'));

    render(<App />);
    await openPublishAndSubmit();

    await waitFor(() => expect(publishToTriplyDB).toHaveBeenCalled());
    expect(await screen.findAllByText(/network down/)).not.toHaveLength(0);
    expect(updateTriplyDBService).not.toHaveBeenCalled();
  });

  test('a failed service update is a warning, because the graph did upload', async () => {
    // The data reached TriplyDB; only the service pointing at it is stale.
    // Reporting this as an outright failure would send the user to re-publish
    // something that is already there.
    updateTriplyDBService.mockRejectedValue(new Error('service unreachable'));

    render(<App />);
    await openPublishAndSubmit();

    expect(await screen.findAllByText(/service unreachable/)).not.toHaveLength(0);
    expect(saveTriplyDBConfig).toHaveBeenCalled();
  });
});

describe('importing CPRMV rules from JSON', () => {
  const openPolicyTab = async () => {
    fireEvent.click(screen.getByRole('button', { name: /Policy/ }));
    // The Policy tab is lazy-loaded, so wait for its import control to exist.
    return screen.findByLabelText(/Import JSON/i);
  };

  const jsonInput = () => screen.getByLabelText(/Import JSON/i);

  const upload = (file) => fireEvent.change(jsonInput(), { target: { files: [file] } });

  const jsonFile = (content, name = 'rules.json') =>
    new File([content], name, { type: 'application/json' });

  test('rejects a file that is not JSON', async () => {
    render(<App />);
    await openPolicyTab();

    upload(jsonFile('[]', 'rules.txt'));

    expect(await screen.findByText('Please select a .json file')).toBeInTheDocument();
  });

  test('reports a file that parses but holds no rules', async () => {
    render(<App />);
    await openPolicyTab();

    upload(jsonFile('[]'));

    expect(await screen.findByText(/No CPRMV rules found/)).toBeInTheDocument();
  });
});
