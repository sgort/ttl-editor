// The public services already published to the configured Triply dataset, for
// the Service tab's "Required services" picker (issue #223). One endpoint, two
// functions: a plain global.fetch mock, as in ronlHelper.test.js.

import { buildDatasetSparqlUrl, fetchPublishedServices } from './serviceCatalogHelper';

const CONFIG = {
  baseUrl: 'https://api.open-regels.triply.cc',
  account: 'stevengort',
  dataset: 'PublishTest',
  apiToken: 'secret-token',
};
const DATASET_SPARQL = 'https://api.open-regels.triply.cc/datasets/stevengort/PublishTest/sparql';
const RECHT = 'https://regels.overheid.nl/services/recht-op-subsidie-thuisbatterij-flevoland';
const HOOGTE = 'https://regels.overheid.nl/services/hoogte-subsidie-thuisbatterij-flevoland';

function mockFetch(response, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: async () => response,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildDatasetSparqlUrl', () => {
  test('builds the dataset SPARQL URL', () => {
    expect(buildDatasetSparqlUrl(CONFIG)).toBe(DATASET_SPARQL);
  });

  test.each(['baseUrl', 'account', 'dataset'])('returns null when %s is empty', (key) => {
    expect(buildDatasetSparqlUrl({ ...CONFIG, [key]: '' })).toBeNull();
  });

  test('returns null without a config', () => {
    expect(buildDatasetSparqlUrl(undefined)).toBeNull();
  });
});

describe('fetchPublishedServices', () => {
  test('posts the query through the backend proxy, without credentials', async () => {
    mockFetch({ success: true, results: { bindings: [] } });

    await fetchPublishedServices(CONFIG);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/v1\/triplydb\/query$/);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.body).not.toContain('secret-token');
    const body = JSON.parse(init.body);
    expect(body.endpoint).toBe(DATASET_SPARQL);
    expect(body.query).toContain('cpsv:PublicService');
    expect(body.query).toContain('dct:title');
  });

  test('maps bindings to {uri, title}', async () => {
    mockFetch({
      success: true,
      results: {
        bindings: [
          { service: { value: HOOGTE }, title: { value: 'hoogte subsidie thuisbatterij' } },
          { service: { value: RECHT }, title: { value: 'recht subsidie thuisbatterij' } },
        ],
      },
    });

    await expect(fetchPublishedServices(CONFIG)).resolves.toEqual([
      { uri: HOOGTE, title: 'hoogte subsidie thuisbatterij' },
      { uri: RECHT, title: 'recht subsidie thuisbatterij' },
    ]);
  });

  test('keeps one entry per service when it has several titles', async () => {
    mockFetch({
      success: true,
      results: {
        bindings: [
          { service: { value: RECHT }, title: { value: 'recht subsidie thuisbatterij' } },
          { service: { value: RECHT }, title: { value: 'right to the home battery grant' } },
        ],
      },
    });

    await expect(fetchPublishedServices(CONFIG)).resolves.toEqual([
      { uri: RECHT, title: 'recht subsidie thuisbatterij' },
    ]);
  });

  test('throws on a non-ok response', async () => {
    mockFetch({}, false);

    await expect(fetchPublishedServices(CONFIG)).rejects.toThrow();
  });

  test('throws when success is false', async () => {
    mockFetch({ success: false });

    await expect(fetchPublishedServices(CONFIG)).rejects.toThrow();
  });

  test('resolves [] without fetching when the config is incomplete', async () => {
    global.fetch = vi.fn();

    await expect(fetchPublishedServices({ ...CONFIG, dataset: '' })).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
