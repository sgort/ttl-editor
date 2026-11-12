// triplydbHelper.js - publishing to TriplyDB through the LDE backend.
//
// Since #234 the editor never talks to TriplyDB for a write and never holds a
// TriplyDB token. The LDE backend holds the instance, account and token; the
// editor sends the signed-in author's ronl token and the dataset name, which
// is the only TriplyDB setting left with the user.
import { authHeaders } from './auth';
import { sanitizeServiceIdentifier } from './dmnHelpers';
import { getProblemDetail } from './problem';

// Get backend URL from environment
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// API version for compliance with API-57 (versioned APIs)
const API_VERSION = 'v1';

const STORAGE_KEY = 'triplydb_config';
const DEFAULT_DATASET = 'DMN-discovery';

/** TriplyDB's rule for dataset names; the LDE backend applies the same one. */
const DATASET_NAME = /^[A-Za-z0-9-]{1,40}$/;

// Use proper IRI for graph name
// TriplyDB requires a full URI, not just "default"
export const buildGraphIRI = ({ organizationIdentifier, serviceIdentifier }) => {
  const fallback = 'https://regels.overheid.nl/graphs/default';
  if (!serviceIdentifier) return fallback;

  const orgLocal = organizationIdentifier
    ? organizationIdentifier.replace(/\/$/, '').split('/').pop()
    : '';
  const svc = sanitizeServiceIdentifier(serviceIdentifier);
  if (!svc) return fallback;

  return orgLocal
    ? `https://regels.overheid.nl/graphs/${orgLocal}/${svc}`
    : `https://regels.overheid.nl/graphs/${svc}`;
};

/** Reads a JSON body, or null when there is none. */
const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

/**
 * Publish a service description as the signed-in author (#234). One call: the
 * backend uploads the TTL and the logos, syncs the service, and logs who did it.
 *
 * @param {{dataset: string, graph: string, filename: string, ttl: string,
 *   organization?: string, service?: string,
 *   logos?: Array<{fileName: string, dataUrl: string}>}} publish
 * @returns {Promise<{url: string, graph: string, serviceUpdated: boolean,
 *   serviceError?: string, logos: Array<{fileName: string, ok: boolean}>}>}
 */
export const publishToTriplyDB = async (publish) => {
  let response;
  try {
    response = await fetch(`${BACKEND_URL}/${API_VERSION}/triplydb/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify(publish),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Network error: Could not connect to backend.');
    }
    throw error;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('Sign in as an author to publish.');
  }

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(getProblemDetail(body, `Publishing failed: HTTP ${response.status}`));
  }

  const { url, graph, serviceUpdated, serviceError, logos } = body;
  return { url, graph, serviceUpdated, ...(serviceError ? { serviceError } : {}), logos };
};

/**
 * Where the backend publishes to, without the token: `{ baseUrl, account }`,
 * or null when publishing is not configured or the backend cannot be reached.
 * The "required services" picker builds its SPARQL URL from it.
 */
export const fetchPublishTarget = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/${API_VERSION}/triplydb/publish-target`);
    if (!response.ok) return null;
    const body = await readJson(response);
    if (!body?.baseUrl || !body?.account) return null;
    return { baseUrl: body.baseUrl, account: body.account };
  } catch {
    return null;
  }
};

/**
 * Validate the TriplyDB setting the user keeps: the dataset name.
 * @param {{dataset?: string}} config
 * @returns {{valid: boolean, error?: string}}
 */
export const validateTriplyDBConfig = (config) => {
  const dataset = config?.dataset;
  if (!dataset) {
    return { valid: false, error: 'Dataset name is required' };
  }
  if (!DATASET_NAME.test(dataset)) {
    return {
      valid: false,
      error: 'Dataset name may contain only letters, digits and hyphens (at most 40)',
    };
  }
  return { valid: true };
};

/**
 * Check, through the backend, that the dataset exists in the publishing account.
 * @param {{dataset: string}} config
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export const testTriplyDBConnection = async (config) => {
  const validation = validateTriplyDBConfig(config);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const response = await fetch(`${BACKEND_URL}/${API_VERSION}/triplydb/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ dataset: config.dataset }),
    });

    if (response.ok) {
      return { success: true, message: `Dataset ${config.dataset} is available` };
    }
    if (response.status === 404) {
      return { success: false, error: 'Dataset not found. Please check the dataset name.' };
    }
    if (response.status === 401 || response.status === 403) {
      return { success: false, error: 'Sign in as an author to check the dataset.' };
    }
    const body = await readJson(response);
    return {
      success: false,
      error: getProblemDetail(body, `Connection failed: HTTP ${response.status}`),
    };
  } catch (error) {
    return { success: false, error: `Connection error: ${error.message}` };
  }
};

/**
 * Load the TriplyDB setting from localStorage: only the dataset. A value an
 * older editor stored, with base URL, account and API token, is cleaned and
 * written back, so the old token leaves the browser on first load (#234).
 * @returns {{dataset: string}}
 */
export const loadTriplyDBConfig = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const config = {
        dataset:
          typeof parsed?.dataset === 'string' && parsed.dataset ? parsed.dataset : DEFAULT_DATASET,
      };
      if (JSON.stringify(parsed) !== JSON.stringify(config)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      }
      return config;
    }
  } catch (error) {
    console.warn('Failed to load TriplyDB config from localStorage:', error);
  }
  return { dataset: DEFAULT_DATASET };
};

/**
 * Save the TriplyDB setting to localStorage: only the dataset.
 * @param {{dataset: string}} config
 */
export const saveTriplyDBConfig = (config) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dataset: config?.dataset }));
  } catch (error) {
    console.warn('Failed to save TriplyDB config to localStorage:', error);
  }
};
