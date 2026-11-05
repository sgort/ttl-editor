// Public services already published to the configured Triply dataset, offered
// by the Service tab when choosing which services this one dct:requires (#223).
//
// The query goes through the LDE backend's SPARQL proxy (as ronlHelper.js
// does), which forwards no credentials: only public datasets can be listed.
// For a private one the list stays empty and the user pastes a URI instead.

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || 'https://acc.backend.linkeddata.open-regels.nl';
const API_VERSION = 'v1';

// Requiring dct:title leaves out untitled `<uri> a cpsv:PublicService .`
// type stubs (from older files or other tools) that are not real services.
const PUBLISHED_SERVICES_QUERY = `
PREFIX cpsv: <http://purl.org/vocab/cpsv#>
PREFIX dct:  <http://purl.org/dc/terms/>
SELECT DISTINCT ?service ?title WHERE {
  ?service a cpsv:PublicService ; dct:title ?title .
} ORDER BY LCASE(STR(?title))
`.trim();

/**
 * The SPARQL endpoint of the configured Triply dataset.
 * @param {{baseUrl?: string, account?: string, dataset?: string}} config
 * @returns {string|null} null when the configuration is incomplete
 */
export const buildDatasetSparqlUrl = (config) => {
  const { baseUrl, account, dataset } = config || {};
  if (!baseUrl || !account || !dataset) return null;
  return `${baseUrl}/datasets/${account}/${dataset}/sparql`;
};

/**
 * List the public services published to the configured dataset.
 * @param {{baseUrl?: string, account?: string, dataset?: string}} config
 * @returns {Promise<Array<{uri: string, title: string}>>} one entry per service
 * @throws {Error} when the request fails or the response is malformed
 */
export const fetchPublishedServices = async (config) => {
  const endpoint = buildDatasetSparqlUrl(config);
  if (!endpoint) return [];

  const response = await fetch(`${BACKEND_URL}/${API_VERSION}/triplydb/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, query: PUBLISHED_SERVICES_QUERY }),
  });

  if (!response.ok) {
    throw new Error(`Failed to list published services: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.success || !data.results?.bindings) {
    throw new Error('Failed to list published services: invalid response from backend');
  }

  // A service with titles in several languages comes back once per title.
  const services = new Map();
  for (const binding of data.results.bindings) {
    const uri = binding.service?.value;
    if (uri && !services.has(uri)) {
      services.set(uri, { uri, title: binding.title?.value || uri });
    }
  }
  return [...services.values()];
};
