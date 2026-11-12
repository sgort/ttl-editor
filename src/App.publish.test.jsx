import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import App from './App';
import { setAuthState } from './testing/authState';
import { validateForm } from './utils';
import { validateDMNData } from './utils/dmnHelpers';
import {
  buildGraphIRI,
  fetchPublishTarget,
  publishToTriplyDB,
  saveTriplyDBConfig,
} from './utils/triplydbHelper';

vi.mock('./utils/triplydbHelper', async (importOriginal) => ({
  ...(await importOriginal()),
  buildGraphIRI: vi.fn(),
  fetchPublishTarget: vi.fn(),
  publishToTriplyDB: vi.fn(),
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
 * Since #234 a publish is one call to the LDE backend, which uploads the
 * graph, the logos and syncs the service as the signed-in author. What is
 * worth pinning is how App reports the three outcomes: published; published
 * with a warning when only the service sync failed (the graph is in TriplyDB
 * either way, so an outright failure would be wrong); and failed.
 *
 * The TriplyDB helpers are mocked. Their own behaviour is covered in
 * triplydbHelper.test.js; what is under test here is how App uses them.
 */

const openPublishAndSubmit = async () => {
  fireEvent.click(screen.getByRole('button', { name: /^Publish$/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Publish to TriplyDB/ }));
};

beforeEach(() => {
  vi.clearAllMocks();
  buildGraphIRI.mockReturnValue('https://regels.overheid.nl/graphs/service');
  fetchPublishTarget.mockResolvedValue(null);
  publishToTriplyDB.mockResolvedValue({
    url: 'https://example.org/dataset',
    graph: 'https://regels.overheid.nl/graphs/service',
    serviceUpdated: true,
    logos: [],
  });
  validateForm.mockReturnValue({ isValid: true, errors: [] });
  validateDMNData.mockReturnValue({ valid: true, errors: [] });
});

describe('publishing', () => {
  test('publishes in one backend call with the dataset, graph and TTL, and remembers the dataset', async () => {
    render(<App />);
    await openPublishAndSubmit();

    await waitFor(() => expect(publishToTriplyDB).toHaveBeenCalledTimes(1));
    const publish = publishToTriplyDB.mock.calls[0][0];
    expect(publish).toMatchObject({
      dataset: 'DMN-discovery',
      graph: 'https://regels.overheid.nl/graphs/service',
      logos: [],
    });
    expect(typeof publish.ttl).toBe('string');
    expect(publish.ttl.length).toBeGreaterThan(0);
    expect(publish).not.toHaveProperty('apiToken');
    await waitFor(() =>
      expect(saveTriplyDBConfig).toHaveBeenCalledWith({ dataset: 'DMN-discovery' })
    );
  });

  test('reports success in the dialog', async () => {
    render(<App />);
    await openPublishAndSubmit();

    // Reported twice over: once in the dialog's step line, once in the page
    // banner behind it.
    expect(await screen.findAllByText(/Published successfully/)).not.toHaveLength(0);
  });

  test('a failed publish is caught and reported, and the dataset is not saved', async () => {
    publishToTriplyDB.mockRejectedValue(new Error('network down'));

    render(<App />);
    await openPublishAndSubmit();

    expect(await screen.findAllByText(/network down/)).not.toHaveLength(0);
    expect(saveTriplyDBConfig).not.toHaveBeenCalled();
  });

  test('a failed service sync is a warning, because the graph did upload', async () => {
    publishToTriplyDB.mockResolvedValue({
      url: 'https://example.org/dataset',
      graph: 'https://regels.overheid.nl/graphs/service',
      serviceUpdated: false,
      serviceError: 'service unreachable',
      logos: [],
    });

    render(<App />);
    await openPublishAndSubmit();

    expect(await screen.findAllByText(/service unreachable/)).not.toHaveLength(0);
    expect(saveTriplyDBConfig).toHaveBeenCalledWith({ dataset: 'DMN-discovery' });
  });
});

describe('publishing follows sign-in (#163 in linked-data-explorer)', () => {
  test('signed out, Publish is locked: "Sign in to publish"', () => {
    setAuthState({ ready: true, signedIn: false, isAuthor: false });
    render(<App />);
    expect(screen.getByRole('button', { name: /Publish/ })).toBeDisabled();
    expect(screen.getByText('Sign in to publish')).toBeInTheDocument();
  });

  test('signed in without the role: "You need permission to publish"', () => {
    setAuthState({ ready: true, signedIn: true, isAuthor: false, name: 'Viewer' });
    render(<App />);
    expect(screen.getByRole('button', { name: /Publish/ })).toBeDisabled();
    expect(screen.getByText('You need permission to publish')).toBeInTheDocument();
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
