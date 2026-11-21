/**
 * Whether the LDE backend lets a visitor who is not an author make a test
 * deploy (GET /v1/dmns/deploy/options, #163 in linked-data-explorer). Localhost
 * and ACC offer it; PROD does not. The DMN tab offers "Test deploy to
 * Operaton" on it, and the "View only" note words itself by it (#240).
 */

const BACKEND_URL = () => import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * @returns {Promise<{enabled: true, tenantId: string, ttlHours: number}|null>}
 *   the offer, or null when test deploys are off or the options are
 *   unavailable (then deploying stays locked for this visitor)
 */
export async function fetchTestDeployOffer() {
  try {
    const response = await fetch(`${BACKEND_URL()}/v1/dmns/deploy/options`);
    if (!response.ok) return null;
    const body = await response.json();
    return body?.data?.testDeploy?.enabled ? body.data.testDeploy : null;
  } catch {
    return null;
  }
}
