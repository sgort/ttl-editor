/**
 * Reads the human-readable reason out of an LDE backend error body.
 *
 * LDE answers every error as an RFC 9457 problem response
 * (`application/problem+json`) and puts the reason in `detail`
 * (linked-data-explorer PR #162). Until that reaches PROD, PROD's LDE still
 * answers the older envelope, `{ success: false, error: { code, message } }`,
 * and some routes answer a bare string, `{ success: false, error: '...' }`. All
 * three shapes are read here, newest first, so the editor shows the server's
 * reason against either backend.
 *
 * `body` is whatever a `fetch(...).json()` call produced -- untyped, and not
 * guaranteed to be an error body at all. Anything unrecognised falls through
 * to `fallback`.
 *
 * Mirrors packages/frontend/src/utils/problem.ts in linked-data-explorer, plus
 * the two legacy shapes.
 *
 * @param {unknown} body Parsed response body
 * @param {string} fallback Text to use when the body carries no reason
 * @returns {string}
 */
export const getProblemDetail = (body, fallback) => {
  if (body === null || typeof body !== 'object') return fallback;

  const nonEmpty = (value) => typeof value === 'string' && value !== '';

  if (nonEmpty(body.detail)) return body.detail;
  if (nonEmpty(body.error?.message)) return body.error.message;
  if (nonEmpty(body.error)) return body.error;
  return fallback;
};
