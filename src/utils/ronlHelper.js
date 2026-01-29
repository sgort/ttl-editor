// Backend API configuration (matches triplydbHelper.js pattern)
const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || 'https://acc.backend.linkeddata.open-regels.nl';
const API_VERSION = 'v1';

/**
 * Fetch RONL concepts from TriplyDB SPARQL endpoint
 * @param {string} conceptType - Either 'ronl:AnalysisConcept' or 'ronl:MethodConcept'
 * @param {string} endpoint - TriplyDB SPARQL endpoint URL
 * @returns {Promise<Array>} Array of concept objects with uri, prefLabel
 */
export const fetchRonlConcepts = async (conceptType, endpoint) => {
  const sparqlQuery = `
PREFIX ronl: <https://regels.overheid.nl/termen/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?narrower ?prefLabel
WHERE {
  ${conceptType} skos:narrower ?narrower .
  ?narrower skos:prefLabel ?prefLabel .
  FILTER(LANG(?prefLabel) = "nl" || LANG(?prefLabel) = "")
}
ORDER BY ?prefLabel
  `.trim();

  console.log('Fetching RONL concepts:', conceptType);
  console.log('SPARQL query:', sparqlQuery);

  try {
    // Use backend proxy to avoid CORS issues
    const response = await fetch(`${BACKEND_URL}/${API_VERSION}/triplydb/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: endpoint,
        query: sparqlQuery,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success || !data.results || !data.results.bindings) {
      throw new Error('Invalid response format from backend');
    }

    // Transform SPARQL results to simple array
    const concepts = data.results.bindings.map((binding) => ({
      uri: binding.narrower.value,
      label: binding.prefLabel.value,
    }));

    console.log(`Fetched ${concepts.length} concepts for ${conceptType}`);
    return concepts;
  } catch (error) {
    console.error('Error fetching RONL concepts:', error);
    throw new Error(`Failed to fetch concepts: ${error.message}`);
  }
};

/**
 * Fetch both Analysis and Method concepts
 * @param {string} endpoint - TriplyDB SPARQL endpoint URL
 * @returns {Promise<Object>} Object with analysisConcepts and methodConcepts arrays
 */
export const fetchAllRonlConcepts = async (endpoint) => {
  try {
    const [analysisConcepts, methodConcepts] = await Promise.all([
      fetchRonlConcepts('ronl:AnalysisConcept', endpoint),
      fetchRonlConcepts('ronl:MethodConcept', endpoint),
    ]);

    return {
      analysisConcepts,
      methodConcepts,
    };
  } catch (error) {
    console.error('Error fetching all RONL concepts:', error);
    throw error;
  }
};
