import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Preflight for the end-to-end journey.
 *
 * The suite drives a live stack, and when part of it is down the failure arrives
 * disguised: a connection refused inside the app surfaces as an amber
 * "validation backend could not be reached" banner, or a deploy that quietly
 * never enables the Evaluate button, and Playwright then reports a timeout on a
 * button rather than the actual cause. This checks first and says plainly what
 * is missing.
 *
 * Both services are checked, not only the backend. Everything the app calls goes
 * through the LDE backend, but the deploy step fails if THAT cannot reach
 * Operaton — so checking one and not the other would give false confidence.
 */

const TIMEOUT_MS = 5_000;

/**
 * The backend URL the app will actually use.
 *
 * `npm start` runs Vite in development mode, which loads .env.development, so
 * that file — not a hardcoded default — is the source of truth for where the
 * app sends its requests. Reading it here means the preflight checks the same
 * host the journey will, even if someone repoints it.
 */
const backendUrl = () => {
  if (process.env.E2E_BACKEND_URL) return process.env.E2E_BACKEND_URL;

  const envFile = resolve(process.cwd(), '.env.development');
  if (existsSync(envFile)) {
    const match = readFileSync(envFile, 'utf8').match(/^\s*VITE_BACKEND_URL\s*=\s*(.+?)\s*$/m);
    if (match) return match[1];
  }
  // The same fallback the source uses when the variable is absent.
  return 'http://localhost:3001';
};

const operatonUrl = () => process.env.E2E_OPERATON_URL ?? 'http://localhost:8081';

/** Up means "answered at all". Any HTTP status proves something is listening. */
const probe = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return { up: true, detail: `HTTP ${response.status}` };
  } catch (error) {
    return {
      up: false,
      detail: error.name === 'AbortError' ? `no answer in ${TIMEOUT_MS}ms` : error.message,
    };
  } finally {
    clearTimeout(timer);
  }
};

export default async function globalSetup() {
  const backend = backendUrl();
  const operaton = operatonUrl();

  const [backendResult, operatonResult] = await Promise.all([
    probe(backend),
    probe(`${operaton}/engine-rest/version`),
  ]);

  const problems = [];

  if (!backendResult.up) {
    problems.push(
      `  Linked Data Explorer backend is not answering at ${backend}\n` +
        `    (${backendResult.detail})\n` +
        `    It serves DMN validation, deploy and evaluate, and the RONL concept\n` +
        `    query. Start it in the linked-data-explorer repository, then retry.\n` +
        `    Override the URL with E2E_BACKEND_URL, or edit VITE_BACKEND_URL in\n` +
        `    .env.development.`
    );
  }

  if (!operatonResult.up) {
    problems.push(
      `  Operaton engine is not answering at ${operaton}\n` +
        `    (${operatonResult.detail})\n` +
        `    The journey deploys and evaluates a real decision. The backend reaches\n` +
        `    it via its own OPERATON_BASE_URL, so this URL is a proxy for what the\n` +
        `    backend will find — check that they agree if this looks wrong.\n` +
        `    Override with E2E_OPERATON_URL.`
    );
  }

  if (problems.length) {
    throw new Error(
      `\nThe end-to-end journey needs a live stack, and it is not ready:\n\n` +
        problems.join('\n\n') +
        `\n\nNothing was run.\n`
    );
  }

  console.log(
    `  preflight ok — backend ${backend} (${backendResult.detail}), ` +
      `Operaton ${operaton} (${operatonResult.detail})`
  );
}
