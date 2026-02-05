// triplydbHelper.js - TriplyDB API integration for publishing TTL files

// Get backend URL from environment
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// API version for compliance with API-57 (versioned APIs)
const API_VERSION = 'v1';

/**
 * TriplyDB API Configuration
 * Based on: https://docs.triply.cc/triply-api
 */

const DEFAULT_CONFIG = {
  baseUrl: 'https://api.open-regels.triply.cc',
  account: 'stevengort',
  dataset: 'DMN-discovery',
  apiToken: '', // Should be set by user
};

/**
 * Ensure filename has .ttl extension
 * @param {string} filename - Filename to check
 * @returns {string} Filename with .ttl extension
 */
// eslint-disable-next-line no-unused-vars
const ensureTTLExtension = (filename) => {
  if (!filename || filename.trim() === '') {
    return 'service.ttl';
  }
  return filename.endsWith('.ttl') ? filename : `${filename}.ttl`;
};

// Use proper IRI for graph name
// TriplyDB requires a full URI, not just "default"

/**
 * Upload TTL content to TriplyDB with proper graph IRI
 * @param {string} ttlContent - The TTL content to upload
 * @param {Object} config - TriplyDB configuration
 * @param {string} filename - Optional filename
 * @returns {Promise<Object>} Upload result
 */
export const publishToTriplyDB = async (ttlContent, config, filename = 'service.ttl') => {
  // ... validation code (same as before) ...

  const validFilename = ensureTTLExtension(filename);

  // FIXED: Use proper graph IRI instead of just "default"
  // Graph names must be full URIs in RDF
  const graphIRI = 'graph:default';

  const uploadUrl = `${config.baseUrl}/datasets/${config.account}/${config.dataset}/jobs?defaultGraphName=${encodeURIComponent(graphIRI)}`;

  console.log('=== TriplyDB Upload Debug Info ===');
  console.log('Upload URL:', uploadUrl);
  console.log('Target graph IRI:', graphIRI);
  console.log('Filename:', validFilename);
  console.log('Content length:', ttlContent.length, 'characters');

  try {
    // Create File object
    const file = new File([ttlContent], validFilename, {
      type: 'text/turtle;charset=utf-8',
    });

    console.log('Created File object:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (file.size === 0) {
      throw new Error('Generated file is empty');
    }

    // Create FormData with proper graph IRI
    const formData = new FormData();
    formData.append('file', file);
    formData.append('defaultGraphName', graphIRI); // <-- Use full IRI

    console.log('FormData created');
    console.log('FormData has file:', formData.has('file'));
    console.log('FormData has defaultGraphName:', formData.has('defaultGraphName'));

    console.log('Making request to:', uploadUrl);

    // Make the API request
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: formData,
    });

    console.log('Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    const responseText = await response.text();
    console.log('Response text:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('Parsed JSON response:', responseData);
    } catch (e) {
      console.log('Response is not JSON');
      responseData = { message: responseText };
    }

    if (!response.ok) {
      const errorMessage =
        responseData.message ||
        responseData.error ||
        responseData.detail ||
        responseText ||
        `HTTP ${response.status}: ${response.statusText}`;

      console.error('Upload failed:', errorMessage);
      throw new Error(errorMessage);
    }

    // Success!
    console.log('Upload successful to graph:', graphIRI);

    // Log graph information if available
    if (responseData.graphNames) {
      console.log('Graph names in response:', responseData.graphNames);
    }

    const datasetUrl = `${config.baseUrl.replace('api.', '')}/datasets/${config.account}/${config.dataset}`;

    return {
      success: true,
      message: 'Successfully published to TriplyDB',
      data: responseData,
      url: datasetUrl,
      graphName: graphIRI,
    };
  } catch (error) {
    console.error('TriplyDB upload error:', error);

    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Network error: Could not connect to TriplyDB.');
    }

    throw new Error(`TriplyDB upload failed: ${error.message}`);
  }
};

// ALTERNATIVE graph IRIs you could use:
// const graphIRI = 'urn:graph:default';
// const graphIRI = 'https://open-regels.nl/graphs/default';
// const graphIRI = 'http://regels.overheid.nl/graphs/services';

/**
 * Update TriplyDB service via backend proxy
 * Routes through Node.js backend package from Linked Data Explorer to avoid CORS issues
 *
 * @param {Object} config - TriplyDB configuration
 * @param {string} serviceName - Service name to update
 * @returns {Promise<Object>} Update result
 */
export const updateTriplyDBService = async (config, serviceName = null) => {
  // Validate configuration
  const configValidation = validateTriplyDBConfig(config);
  if (!configValidation.valid) {
    throw new Error(configValidation.error);
  }

  const targetService = serviceName || config.dataset;

  console.log('=== TriplyDB Service Update (via Backend) ===');
  console.log('Backend URL:', BACKEND_URL);
  console.log('API Version:', API_VERSION);
  console.log('Service name:', targetService);

  try {
    // Call backend proxy: http://localhost:3001/v1/triplydb/update-service
    const response = await fetch(`${BACKEND_URL}/${API_VERSION}/triplydb/update-service`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: config,
        serviceName: targetService,
      }),
    });

    console.log('Backend response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      apiVersion: response.headers.get('API-Version'),
    });

    const result = await response.json();
    console.log('Backend result:', result);

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Backend error: ${response.status}`);
    }

    console.log('✅ Service updated successfully via backend!');

    return {
      success: true,
      message: result.message,
      graphCount: result.graphCount,
    };
  } catch (error) {
    console.error('Service update error:', error);

    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Network error: Could not connect to backend.');
    }

    throw new Error(`Service update failed: ${error.message}`);
  }
};

/**
 * Upload TTL content to TriplyDB using SPARQL UPDATE
 * Properly handles @prefix declarations by converting them to SPARQL PREFIX
 *
 * @param {string} ttlContent - The TTL content to upload
 * @param {Object} config - TriplyDB configuration
 * @param {string} filename - Filename (for logging only)
 * @returns {Promise<Object>} Upload result
 */
export const publishToTriplyDB_SPARQL = async (ttlContent, config, filename = 'service.ttl') => {
  // Validate configuration
  const configValidation = validateTriplyDBConfig(config);
  if (!configValidation.valid) {
    throw new Error(configValidation.error);
  }

  // Validate TTL content
  const contentValidation = validateTTLContent(ttlContent);
  if (!contentValidation.valid) {
    throw new Error(contentValidation.error);
  }

  // Define the target graph IRI
  const graphIRI = 'https://regels.overheid.nl/graphs/default';

  // Use SPARQL endpoint (not /update which is deprecated)
  const sparqlUrl = `${config.baseUrl}/datasets/${config.account}/${config.dataset}/sparql`;

  console.log('=== TriplyDB SPARQL UPDATE ===');
  console.log('SPARQL URL:', sparqlUrl);
  console.log('Target graph:', graphIRI);
  console.log('Filename:', filename);
  console.log('Content length:', ttlContent.length, 'characters');

  try {
    // IMPORTANT: Extract @prefix declarations and convert to SPARQL PREFIX
    // SPARQL doesn't allow @prefix inside INSERT DATA blocks

    const lines = ttlContent.split('\n');
    const prefixLines = [];
    const dataLines = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('@prefix')) {
        // Convert @prefix to PREFIX (SPARQL syntax)
        // @prefix cpsv: <http://...> . → PREFIX cpsv: <http://...>
        const sparqlPrefix = trimmed.replace('@prefix', 'PREFIX').replace(/\s*\.\s*$/, '');
        prefixLines.push(sparqlPrefix);
      } else if (trimmed.length > 0) {
        dataLines.push(line);
      }
    }

    console.log('Extracted', prefixLines.length, 'prefix declarations');
    console.log('Data lines:', dataLines.length);

    // Build SPARQL INSERT DATA query
    // PREFIX declarations go OUTSIDE the INSERT DATA block
    const sparqlUpdate = `
${prefixLines.join('\n')}

INSERT DATA {
  GRAPH <${graphIRI}> {
${dataLines.join('\n')}
  }
}
`.trim();

    console.log('SPARQL query length:', sparqlUpdate.length, 'characters');
    console.log('SPARQL query preview (first 500 chars):');
    console.log(sparqlUpdate.substring(0, 500));

    // Execute SPARQL UPDATE
    const response = await fetch(sparqlUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/sparql-update',
      },
      body: sparqlUpdate,
    });

    console.log('Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    // Get response
    const responseText = await response.text();
    console.log('Response text:', responseText || '(empty - success)');

    if (!response.ok) {
      // Try to parse error message
      let errorMessage = responseText;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || responseText;
      } catch (e) {
        // Not JSON, use as is
      }

      console.error('SPARQL UPDATE failed:', errorMessage);
      throw new Error(errorMessage || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Success!
    console.log('✅ SPARQL UPDATE successful! Data inserted into graph:', graphIRI);

    const datasetUrl = `${config.baseUrl.replace('api.', '')}/datasets/${config.account}/${config.dataset}`;

    return {
      success: true,
      message: `Successfully inserted into graph: ${graphIRI}`,
      url: datasetUrl,
      graphName: graphIRI,
    };
  } catch (error) {
    console.error('TriplyDB SPARQL UPDATE error:', error);

    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Network error: Could not connect to TriplyDB.');
    }

    throw new Error(`SPARQL UPDATE failed: ${error.message}`);
  }
};

/**
 * Upload logo image as asset to TriplyDB
 * @param {string} base64Data - Base64 data URL
 * @param {string} fileName - Asset filename
 * @param {Object} config - TriplyDB configuration
 * @returns {Promise<Object>} Upload result
 */
export const uploadLogoAsset = async (base64Data, fileName, config) => {
  if (!base64Data || !base64Data.startsWith('data:image/')) {
    throw new Error('Invalid base64 image data');
  }

  // Extract base64 content
  const base64Content = base64Data.split(',')[1];
  const mimeType = base64Data.match(/data:([^;]+);/)[1];

  // Convert base64 to Blob
  const byteCharacters = atob(base64Content);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: mimeType });

  // Create File object
  const file = new File([blob], fileName, { type: mimeType });

  // Upload to TriplyDB assets
  const assetUrl = `${config.baseUrl}/datasets/${config.account}/${config.dataset}/assets`;

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(assetUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload logo: ${errorText}`);
  }

  return { success: true, assetUrl: `${assetUrl}/${fileName}` };
};

/**
 * Validate TriplyDB configuration
 * @param {Object} config - TriplyDB configuration
 * @returns {Object} { valid: boolean, error?: string }
 */
export const validateTriplyDBConfig = (config) => {
  if (!config.baseUrl) {
    return { valid: false, error: 'Base URL is required' };
  }

  if (!config.account) {
    return { valid: false, error: 'Account name is required' };
  }

  if (!config.dataset) {
    return { valid: false, error: 'Dataset name is required' };
  }

  if (!config.apiToken || config.apiToken.trim() === '') {
    return { valid: false, error: 'API Token is required' };
  }

  // Validate URL format
  try {
    new URL(config.baseUrl);
  } catch (e) {
    return { valid: false, error: 'Invalid Base URL format' };
  }

  return { valid: true };
};

/**
 * Validate TTL content before upload
 * @param {string} ttlContent - The TTL content to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
const validateTTLContent = (ttlContent) => {
  if (!ttlContent || typeof ttlContent !== 'string') {
    return { valid: false, error: 'TTL content is empty or invalid' };
  }

  const trimmed = ttlContent.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'TTL content is empty' };
  }

  // Check minimum length (should have more than just prefixes)
  if (trimmed.length < 100) {
    return {
      valid: false,
      error: 'TTL content is too short - please fill in service details',
    };
  }

  // Check if it looks like TTL (has at least one triple or prefix declaration)
  const hasPrefix = /@prefix\s+\w+:\s+<[^>]+>\s+\./.test(trimmed);
  const hasTriple = /<[^>]+>\s+<[^>]+>\s+[^.]+\./.test(trimmed) || /<[^>]+>\s+a\s+/.test(trimmed);

  if (!hasPrefix && !hasTriple) {
    return {
      valid: false,
      error: 'TTL content does not appear to contain valid RDF statements',
    };
  }

  return { valid: true };
};

/**
 * Test TriplyDB connection by attempting to access the dataset
 * @param {Object} config - TriplyDB configuration
 * @returns {Promise<Object>} Connection test result
 */
export const testTriplyDBConnection = async (config) => {
  const validation = validateTriplyDBConfig(config);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const testUrl = `${config.baseUrl}/datasets/${config.account}/${config.dataset}`;

  console.log('Testing connection to:', testUrl);

  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        Accept: 'application/json',
      },
    });

    console.log('Connection test response:', response.status, response.statusText);

    if (response.ok) {
      return {
        success: true,
        message: 'Successfully connected to TriplyDB',
      };
    } else if (response.status === 404) {
      return {
        success: false,
        error: 'Dataset not found. Please check account and dataset names.',
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: 'Authentication failed. Please check your API token.',
      };
    } else {
      return {
        success: false,
        error: `Connection failed: HTTP ${response.status}`,
      };
    }
  } catch (error) {
    console.error('Connection test error:', error);
    return {
      success: false,
      error: `Connection error: ${error.message}`,
    };
  }
};

/**
 * Load TriplyDB configuration from localStorage
 * @returns {Object} Saved configuration or default values
 */
export const loadTriplyDBConfig = () => {
  try {
    const saved = localStorage.getItem('triplydb_config');
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.warn('Failed to load TriplyDB config from localStorage:', error);
  }
  return { ...DEFAULT_CONFIG };
};

/**
 * Save TriplyDB configuration to localStorage
 * @param {Object} config - Configuration to save
 */
export const saveTriplyDBConfig = (config) => {
  try {
    localStorage.setItem('triplydb_config', JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to save TriplyDB config to localStorage:', error);
  }
};

/**
 * Get default TriplyDB configuration
 * @returns {Object} Default configuration
 */
export const getDefaultTriplyDBConfig = () => {
  return { ...DEFAULT_CONFIG };
};
