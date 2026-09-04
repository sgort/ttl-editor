// Network-touching, but small enough (2 functions, 1 endpoint) that a plain
// global.fetch mock is proportionate — msw is reserved for the larger
// surfaces (shaclHelper.js, triplydbHelper.js) per phase P4, see
// https://iou-architectuur.open-regels.nl/cpsv-editor/developer/testing/.
import { fetchAllRonlConcepts, fetchRonlConcepts } from './ronlHelper';

function mockFetchOnce(response, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: async () => response,
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fetchRonlConcepts', () => {
  test('posts a SPARQL query to the backend proxy and transforms bindings', async () => {
    mockFetchOnce({
      success: true,
      results: {
        bindings: [
          {
            narrower: { value: 'https://regels.overheid.nl/termen/FLINT' },
            prefLabel: { value: 'FLINT' },
          },
          {
            narrower: { value: 'https://regels.overheid.nl/termen/ALEF' },
            prefLabel: { value: 'ALEF' },
          },
        ],
      },
    });

    const concepts = await fetchRonlConcepts('ronl:MethodConcept', 'https://example.com/sparql');

    expect(concepts).toEqual([
      { uri: 'https://regels.overheid.nl/termen/FLINT', label: 'FLINT' },
      { uri: 'https://regels.overheid.nl/termen/ALEF', label: 'ALEF' },
    ]);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/triplydb/query'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody.endpoint).toBe('https://example.com/sparql');
    expect(requestBody.query).toContain('ronl:MethodConcept skos:narrower ?narrower');
  });

  test('throws with the HTTP status when the response is not ok', async () => {
    mockFetchOnce({}, false);

    await expect(
      fetchRonlConcepts('ronl:AnalysisConcept', 'https://example.com/sparql')
    ).rejects.toThrow('Failed to fetch concepts: HTTP 500: Internal Server Error');
  });

  test('throws when the backend response is missing the expected shape', async () => {
    mockFetchOnce({ success: false });

    await expect(
      fetchRonlConcepts('ronl:AnalysisConcept', 'https://example.com/sparql')
    ).rejects.toThrow('Failed to fetch concepts: Invalid response format from backend');
  });
});

describe('fetchAllRonlConcepts', () => {
  test('fetches analysis and method concepts in parallel', async () => {
    let call = 0;
    global.fetch = jest.fn().mockImplementation(async () => {
      call += 1;
      return {
        ok: true,
        json: async () => ({
          success: true,
          results: {
            bindings: [
              {
                narrower: { value: `https://regels.overheid.nl/termen/c${call}` },
                prefLabel: { value: `Concept ${call}` },
              },
            ],
          },
        }),
      };
    });

    const result = await fetchAllRonlConcepts('https://example.com/sparql');

    expect(result.analysisConcepts).toHaveLength(1);
    expect(result.methodConcepts).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('propagates an error from either underlying fetch', async () => {
    mockFetchOnce({}, false);

    await expect(fetchAllRonlConcepts('https://example.com/sparql')).rejects.toThrow(
      'Failed to fetch concepts'
    );
  });
});
