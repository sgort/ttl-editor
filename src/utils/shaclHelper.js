// shaclHelper.js — pre-publish SHACL validation against the shared LDE backend.
//
// Mirrors DMNTab.runBackendValidation: it POSTs the Turtle to
// /v1/shacl/validate and returns the layered result, but never throws — a
// backend failure yields a neutral { unavailable: true } shape so the publish
// flow is never blocked (validation is advisory).

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const emptyLayers = () => ({
  cprmv: { label: 'CPRMV 0.4.1', issues: [] },
  'cpsv-ap': { label: 'CPSV-AP 3.2.0', issues: [] },
  'ronl-custom': { label: 'RONL Custom', issues: [] },
});

/**
 * Validate a Turtle string against the vendored SHACL shapes.
 * @param {string} content Turtle
 * @returns {Promise<{valid,parseError,layers,summary,unavailable?}>}
 */
export const validateTtl = async (content) => {
  try {
    const response = await fetch(`${BACKEND_URL}/v1/shacl/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const data = await response.json();
    if (response.ok && data.success) {
      return data.data;
    }
    return {
      valid: false,
      parseError: data.error?.message ?? 'Backend validation failed',
      layers: emptyLayers(),
      summary: { errors: 1, warnings: 0, infos: 0 },
    };
  } catch (err) {
    // Backend unreachable — don't block publishing; surface a distinct amber state.
    console.warn('[SHACL] Validation backend unavailable:', err.message);
    return {
      valid: false,
      unavailable: true,
      parseError:
        'SHACL validation result not available — the validation backend could not be ' +
        `reached (${err.message}). Publishing still works; only the pre-publish check is skipped.`,
      layers: emptyLayers(),
      summary: { errors: 0, warnings: 0, infos: 0 },
    };
  }
};

export default validateTtl;
