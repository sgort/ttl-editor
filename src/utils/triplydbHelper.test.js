import {
  buildGraphIRI,
  fetchPublishTarget,
  loadTriplyDBConfig,
  publishToTriplyDB,
  saveTriplyDBConfig,
  testTriplyDBConnection,
  validateTriplyDBConfig,
} from './triplydbHelper';

const PUBLISH = {
  dataset: 'DMN-discovery',
  graph: 'https://regels.overheid.nl/graphs/svb/aow',
  filename: 'aow',
  ttl: '@prefix cpsv: <http://purl.org/vocab/cpsv#> .',
  organization: 'https://identifier.overheid.nl/tooi/id/oorg/oorg10103',
  service: 'aow',
  logos: [{ fileName: 'svb_logo.png', dataUrl: 'data:image/png;base64,cG5n' }],
};

/** A fetch answer as the LDE backend gives it. */
function answer(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    json: async () => body,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('buildGraphIRI', () => {
  test('falls back to the default graph when no serviceIdentifier is given', () => {
    expect(buildGraphIRI({})).toBe('https://regels.overheid.nl/graphs/default');
  });

  test('builds a graph IRI scoped under the organization, when given', () => {
    expect(
      buildGraphIRI({
        organizationIdentifier: 'https://regels.overheid.nl/organizations/flevoland',
        serviceIdentifier: 'my service',
      })
    ).toBe('https://regels.overheid.nl/graphs/flevoland/my-service');
  });

  test('builds a bare graph IRI when no organization is given', () => {
    expect(buildGraphIRI({ serviceIdentifier: 'my service' })).toBe(
      'https://regels.overheid.nl/graphs/my-service'
    );
  });
});

describe('validateTriplyDBConfig (#234: only the dataset name)', () => {
  test('passes a dataset of letters, digits and hyphens', () => {
    expect(validateTriplyDBConfig({ dataset: 'DMN-discovery-2' })).toEqual({ valid: true });
  });

  test.each([
    ['', 'Dataset name is required'],
    [undefined, 'Dataset name is required'],
    ['a/b', 'Dataset name may contain only letters, digits and hyphens (at most 40)'],
    ['../x', 'Dataset name may contain only letters, digits and hyphens (at most 40)'],
    ['a'.repeat(41), 'Dataset name may contain only letters, digits and hyphens (at most 40)'],
  ])('flags %p', (dataset, error) => {
    expect(validateTriplyDBConfig({ dataset })).toEqual({ valid: false, error });
  });
});

describe('publishToTriplyDB (#234: one call to the LDE backend)', () => {
  test("posts the publish to the backend with the signed-in author's token", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      answer(200, {
        success: true,
        url: 'https://open-regels.triply.cc/datasets/stevengort/DMN-discovery',
        graph: PUBLISH.graph,
        serviceUpdated: true,
        logos: [{ fileName: 'svb_logo.png', ok: true }],
      })
    );

    const result = await publishToTriplyDB(PUBLISH);

    expect(result).toEqual({
      url: 'https://open-regels.triply.cc/datasets/stevengort/DMN-discovery',
      graph: PUBLISH.graph,
      serviceUpdated: true,
      logos: [{ fileName: 'svb_logo.png', ok: true }],
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/v1\/triplydb\/publish$/);
    expect(url).not.toContain('triply.cc');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    });
    expect(JSON.parse(init.body)).toEqual(PUBLISH);
  });

  test('passes on the warning when only the service sync failed', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      answer(200, {
        success: true,
        url: 'u',
        graph: PUBLISH.graph,
        serviceUpdated: false,
        serviceError: 'sync failed',
        logos: [],
      })
    );

    const result = await publishToTriplyDB(PUBLISH);

    expect(result.serviceUpdated).toBe(false);
    expect(result.serviceError).toBe('sync failed');
  });

  test.each([401, 403])('a %i asks the user to sign in as an author', async (status) => {
    global.fetch = vi.fn().mockResolvedValue(answer(status, { detail: 'whatever' }));

    await expect(publishToTriplyDB(PUBLISH)).rejects.toThrow('Sign in as an author to publish.');
  });

  test("throws the backend's problem detail on any other failure", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(answer(502, { status: 502, detail: 'TriplyDB upload failed: 500' }));

    await expect(publishToTriplyDB(PUBLISH)).rejects.toThrow('TriplyDB upload failed: 500');
  });

  test('falls back to the status when the failure carries no detail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: '',
      json: async () => {
        throw new Error('not JSON');
      },
    });

    await expect(publishToTriplyDB(PUBLISH)).rejects.toThrow('Publishing failed: HTTP 500');
  });

  test('translates a network failure into a friendly message', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(publishToTriplyDB(PUBLISH)).rejects.toThrow(
      'Network error: Could not connect to backend.'
    );
  });
});

describe('testTriplyDBConnection (#234: through the backend)', () => {
  test('checks the dataset through the backend, as the signed-in author', async () => {
    global.fetch = vi.fn().mockResolvedValue(answer(200, { success: true }));

    const result = await testTriplyDBConnection({ dataset: 'DMN-discovery' });

    expect(result).toEqual({ success: true, message: 'Dataset DMN-discovery is available' });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/v1\/triplydb\/test-connection$/);
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-token' });
    expect(JSON.parse(init.body)).toEqual({ dataset: 'DMN-discovery' });
  });

  test('refuses an invalid dataset name without a request', async () => {
    global.fetch = vi.fn();

    const result = await testTriplyDBConnection({ dataset: 'a/b' });

    expect(result.success).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('reports a dataset that does not exist', async () => {
    global.fetch = vi.fn().mockResolvedValue(answer(404, { detail: 'not found' }));

    const result = await testTriplyDBConnection({ dataset: 'Missing' });

    expect(result).toEqual({
      success: false,
      error: 'Dataset not found. Please check the dataset name.',
    });
  });

  test.each([401, 403])('a %i asks the user to sign in as an author', async (status) => {
    global.fetch = vi.fn().mockResolvedValue(answer(status, {}));

    const result = await testTriplyDBConnection({ dataset: 'DMN-discovery' });

    expect(result).toEqual({ success: false, error: 'Sign in as an author to check the dataset.' });
  });

  test("reports the backend's problem detail on any other status", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(answer(503, { detail: 'Publishing is not configured on this backend' }));

    const result = await testTriplyDBConnection({ dataset: 'DMN-discovery' });

    expect(result).toEqual({
      success: false,
      error: 'Publishing is not configured on this backend',
    });
  });

  test('reports a network failure as a connection error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('DNS failure'));

    const result = await testTriplyDBConnection({ dataset: 'DMN-discovery' });

    expect(result).toEqual({ success: false, error: 'Connection error: DNS failure' });
  });
});

describe('fetchPublishTarget (#234)', () => {
  test("answers the backend's base URL and account", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        answer(200, { baseUrl: 'https://api.open-regels.triply.cc', account: 'stevengort' })
      );

    await expect(fetchPublishTarget()).resolves.toEqual({
      baseUrl: 'https://api.open-regels.triply.cc',
      account: 'stevengort',
    });
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/v1\/triplydb\/publish-target$/);
  });

  test('answers null when publishing is not configured', async () => {
    global.fetch = vi.fn().mockResolvedValue(answer(503, { detail: 'not configured' }));

    await expect(fetchPublishTarget()).resolves.toBeNull();
  });

  test('answers null when the backend cannot be reached', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchPublishTarget()).resolves.toBeNull();
  });

  test('answers null for an answer without base URL or account', async () => {
    global.fetch = vi.fn().mockResolvedValue(answer(200, { baseUrl: 'x' }));

    await expect(fetchPublishTarget()).resolves.toBeNull();
  });
});

describe('TriplyDB config persistence (#234: only the dataset)', () => {
  test('defaults to the DMN-discovery dataset when nothing is saved', () => {
    expect(loadTriplyDBConfig()).toEqual({ dataset: 'DMN-discovery' });
  });

  test('saveTriplyDBConfig keeps only the dataset', () => {
    saveTriplyDBConfig({ dataset: 'Mine', apiToken: 'secret', account: 'x' });

    expect(JSON.parse(localStorage.getItem('triplydb_config'))).toEqual({ dataset: 'Mine' });
  });

  test('an old browser loses its token, base URL and account on first load', () => {
    localStorage.setItem(
      'triplydb_config',
      JSON.stringify({
        baseUrl: 'https://api.open-regels.triply.cc',
        account: 'stevengort',
        dataset: 'X',
        apiToken: 'secret',
      })
    );

    expect(loadTriplyDBConfig()).toEqual({ dataset: 'X' });
    expect(localStorage.getItem('triplydb_config')).toBe(JSON.stringify({ dataset: 'X' }));
    expect(localStorage.getItem('triplydb_config')).not.toContain('secret');
  });

  test('falls back to the default when localStorage holds invalid JSON', () => {
    localStorage.setItem('triplydb_config', 'not json');

    expect(loadTriplyDBConfig()).toEqual({ dataset: 'DMN-discovery' });
  });

  test('a stored config without a dataset gets the default one', () => {
    localStorage.setItem('triplydb_config', JSON.stringify({ apiToken: 'secret' }));

    expect(loadTriplyDBConfig()).toEqual({ dataset: 'DMN-discovery' });
    expect(localStorage.getItem('triplydb_config')).not.toContain('secret');
  });
});
