import {
  buildGraphIRI,
  getDefaultTriplyDBConfig,
  loadTriplyDBConfig,
  publishToTriplyDB,
  publishToTriplyDB_SPARQL,
  saveTriplyDBConfig,
  testTriplyDBConnection,
  updateTriplyDBService,
  uploadLogoAsset,
  validateTriplyDBConfig,
} from './triplydbHelper';

const VALID_CONFIG = {
  baseUrl: 'https://api.open-regels.triply.cc',
  account: 'stevengort',
  dataset: 'DMN-discovery',
  apiToken: 'test-token',
};

afterEach(() => {
  jest.restoreAllMocks();
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

describe('validateTriplyDBConfig', () => {
  test('passes with a fully valid config', () => {
    expect(validateTriplyDBConfig(VALID_CONFIG)).toEqual({ valid: true });
  });

  test.each([
    [{ ...VALID_CONFIG, baseUrl: '' }, 'Base URL is required'],
    [{ ...VALID_CONFIG, account: '' }, 'Account name is required'],
    [{ ...VALID_CONFIG, dataset: '' }, 'Dataset name is required'],
    [{ ...VALID_CONFIG, apiToken: '' }, 'API Token is required'],
    [{ ...VALID_CONFIG, apiToken: '   ' }, 'API Token is required'],
    [{ ...VALID_CONFIG, baseUrl: 'not a url' }, 'Invalid Base URL format'],
  ])('flags %p as %p', (config, expectedError) => {
    expect(validateTriplyDBConfig(config)).toEqual({ valid: false, error: expectedError });
  });
});

describe('publishToTriplyDB', () => {
  test('uploads the file and reports success on a 200 JSON response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({ graphNames: ['g1'] }),
    });

    const result = await publishToTriplyDB(
      '@prefix cpsv: <http://purl.org/vocab/cpsv#> .',
      VALID_CONFIG,
      'service.ttl',
      'https://regels.overheid.nl/graphs/my-service'
    );

    expect(result.success).toBe(true);
    expect(result.graphName).toBe('https://regels.overheid.nl/graphs/my-service');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/jobs?defaultGraphName='),
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
      })
    );
  });

  test('rejects empty content before making any request', async () => {
    global.fetch = jest.fn();
    await expect(publishToTriplyDB('', VALID_CONFIG)).rejects.toThrow('Generated file is empty');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('surfaces the backend error message on a non-ok JSON response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => JSON.stringify({ message: 'Invalid graph name' }),
    });

    await expect(publishToTriplyDB('some ttl content here', VALID_CONFIG)).rejects.toThrow(
      'Invalid graph name'
    );
  });

  test('falls back to raw response text when the error body is not JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'plain text error',
    });

    await expect(publishToTriplyDB('some ttl content', VALID_CONFIG)).rejects.toThrow(
      'plain text error'
    );
  });

  test('translates a fetch TypeError into a friendly network-error message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(publishToTriplyDB('some ttl content', VALID_CONFIG)).rejects.toThrow(
      'Network error: Could not connect to TriplyDB.'
    );
  });
});

describe('updateTriplyDBService', () => {
  test('throws before fetching when the config is invalid', async () => {
    global.fetch = jest.fn();
    await expect(updateTriplyDBService({ ...VALID_CONFIG, apiToken: '' })).rejects.toThrow(
      'API Token is required'
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('posts to the backend proxy and reports success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => '1' },
      json: async () => ({ success: true, message: 'updated', graphCount: 3 }),
    });

    const result = await updateTriplyDBService(VALID_CONFIG, 'my-service', 'graph-1');

    expect(result).toEqual({ success: true, message: 'updated', graphCount: 3 });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/triplydb/update-service'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('throws the backend error when the update fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      headers: { get: () => null },
      json: async () => ({ success: false, error: 'upstream unreachable' }),
    });

    await expect(updateTriplyDBService(VALID_CONFIG)).rejects.toThrow('upstream unreachable');
  });

  test('translates a fetch TypeError into a friendly network-error message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(updateTriplyDBService(VALID_CONFIG)).rejects.toThrow(
      'Network error: Could not connect to backend.'
    );
  });
});

describe('publishToTriplyDB_SPARQL', () => {
  test('throws before fetching when the config is invalid', async () => {
    global.fetch = jest.fn();
    await expect(
      publishToTriplyDB_SPARQL('a valid enough ttl body over 100 chars long padding padding', {
        ...VALID_CONFIG,
        apiToken: '',
      })
    ).rejects.toThrow('API Token is required');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('throws before fetching when the TTL content is too short', async () => {
    global.fetch = jest.fn();
    await expect(publishToTriplyDB_SPARQL('short', VALID_CONFIG)).rejects.toThrow(
      'TTL content is too short'
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('converts @prefix declarations to SPARQL PREFIX and wraps data in INSERT DATA / GRAPH', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });

    const ttl =
      '@prefix cpsv: <http://purl.org/vocab/cpsv#> .\n' +
      '<https://example.com/svc> a cpsv:PublicService ;\n' +
      '    dct:identifier "my-service" ;\n' +
      '    dct:title "My Service"@nl .';
    await publishToTriplyDB_SPARQL(ttl, VALID_CONFIG, 'service.ttl', 'https://example.com/graph');

    const [, requestInit] = global.fetch.mock.calls[0];
    expect(requestInit.headers['Content-Type']).toBe('application/sparql-update');
    expect(requestInit.body).toContain('PREFIX cpsv: <http://purl.org/vocab/cpsv#>');
    expect(requestInit.body).toContain('INSERT DATA {');
    expect(requestInit.body).toContain('GRAPH <https://example.com/graph> {');
    expect(requestInit.body).toContain('<https://example.com/svc> a cpsv:PublicService ;');
  });

  test('surfaces the backend error message on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => JSON.stringify({ message: 'bad SPARQL' }),
    });

    const ttl =
      '@prefix cpsv: <http://purl.org/vocab/cpsv#> .\n<https://example.com/svc> a cpsv:PublicService padding padding.';
    await expect(publishToTriplyDB_SPARQL(ttl, VALID_CONFIG)).rejects.toThrow('bad SPARQL');
  });
});

describe('uploadLogoAsset', () => {
  test('rejects data that is not a base64 image data URL', async () => {
    await expect(uploadLogoAsset('not-a-data-url', 'logo.png', VALID_CONFIG)).rejects.toThrow(
      'Invalid base64 image data'
    );
  });

  test('converts a base64 image and uploads it as an asset', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    const base64 = `data:image/png;base64,${Buffer.from('fake-png-bytes').toString('base64')}`;

    const result = await uploadLogoAsset(base64, 'logo.png', VALID_CONFIG);

    expect(result).toEqual({
      success: true,
      assetUrl: expect.stringContaining('/assets/logo.png'),
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/assets'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('throws when the upload fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, text: async () => 'upload rejected' });
    const base64 = `data:image/png;base64,${Buffer.from('fake-png-bytes').toString('base64')}`;

    await expect(uploadLogoAsset(base64, 'logo.png', VALID_CONFIG)).rejects.toThrow(
      'Failed to upload logo: upload rejected'
    );
  });
});

describe('testTriplyDBConnection', () => {
  test('returns invalid config error without making a request', async () => {
    global.fetch = jest.fn();
    const result = await testTriplyDBConnection({ ...VALID_CONFIG, apiToken: '' });
    expect(result).toEqual({ success: false, error: 'API Token is required' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('reports success on a 200 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    const result = await testTriplyDBConnection(VALID_CONFIG);
    expect(result).toEqual({ success: true, message: 'Successfully connected to TriplyDB' });
  });

  test('reports a dataset-not-found error on 404', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
    const result = await testTriplyDBConnection(VALID_CONFIG);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Dataset not found');
  });

  test.each([401, 403])('reports an auth error on %i', async (status) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status, statusText: 'Unauthorized' });
    const result = await testTriplyDBConnection(VALID_CONFIG);
    expect(result.error).toContain('Authentication failed');
  });

  test('reports a generic error on any other status', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' });
    const result = await testTriplyDBConnection(VALID_CONFIG);
    expect(result.error).toBe('Connection failed: HTTP 503');
  });

  test('catches a network failure and reports it as a connection error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('DNS failure'));
    const result = await testTriplyDBConnection(VALID_CONFIG);
    expect(result).toEqual({ success: false, error: 'Connection error: DNS failure' });
  });
});

describe('TriplyDB config persistence (localStorage)', () => {
  test('loadTriplyDBConfig returns the default config when nothing is saved', () => {
    expect(loadTriplyDBConfig()).toEqual(getDefaultTriplyDBConfig());
  });

  test('saveTriplyDBConfig persists, and loadTriplyDBConfig reads it back merged with defaults', () => {
    saveTriplyDBConfig({ apiToken: 'saved-token' });
    expect(loadTriplyDBConfig()).toEqual({
      ...getDefaultTriplyDBConfig(),
      apiToken: 'saved-token',
    });
  });

  test('loadTriplyDBConfig falls back to defaults when localStorage holds invalid JSON', () => {
    localStorage.setItem('triplydb_config', 'not json');
    expect(loadTriplyDBConfig()).toEqual(getDefaultTriplyDBConfig());
  });

  test('getDefaultTriplyDBConfig returns a fresh copy each time (not a shared reference)', () => {
    const a = getDefaultTriplyDBConfig();
    const b = getDefaultTriplyDBConfig();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
