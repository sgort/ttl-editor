// Helper functions for TTL string manipulation

/**
 * Escape special characters in TTL strings
 * Handles quotes, backslashes, newlines, carriage returns, and tabs
 * @param {string} str - Input string to escape
 * @returns {string} - Escaped string safe for TTL
 */
export function escapeTTLString(str) {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

/**
 * Encode URI components for TTL URIs
 * Currently handles spaces, can be extended for other characters
 * @param {string} str - Input string to encode
 * @returns {string} - URI-encoded string
 */
export function encodeURIComponentTTL(str) {
  if (!str) return "";
  return str.replace(/ /g, "%20");
}

/**
 * Sanitize a string for use as a filename
 * Removes or replaces characters that are invalid in filenames
 * @param {string} str - Input string
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(str) {
  if (!str) return "service";
  return str
    .replace(/%20/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "");
}

/**
 * Format a date string for TTL xsd:date format
 * @param {string} dateStr - Date string (YYYY-MM-DD format expected)
 * @returns {string} - Formatted date with xsd:date type
 */
export function formatTTLDate(dateStr) {
  if (!dateStr) return null;
  return `"${dateStr}"^^xsd:date`;
}

/**
 * Format a value as TTL literal with optional language tag
 * @param {string} value - The value to format
 * @param {string} language - Optional language tag (e.g., 'nl', 'en')
 * @returns {string} - Formatted TTL literal
 */
export function formatTTLLiteral(value, language = null) {
  if (!value) return null;
  const escaped = escapeTTLString(value);
  if (language) {
    return `"${escaped}"@${language}`;
  }
  return `"${escaped}"`;
}

/**
 * Format a URI for TTL output
 * @param {string} uri - The URI to format
 * @returns {string} - URI wrapped in angle brackets
 */
export function formatTTLUri(uri) {
  if (!uri) return null;
  return `<${uri}>`;
}

/**
 * Check if a string is a valid URI
 * @param {string} str - String to check
 * @returns {boolean} - True if string starts with http:// or https://
 */
export function isValidUri(str) {
  if (!str) return false;
  return str.startsWith("http://") || str.startsWith("https://");
}
