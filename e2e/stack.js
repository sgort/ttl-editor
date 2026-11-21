import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { test as base } from '@playwright/test';

/**
 * Preflight for the journeys that drive a live stack.
 *
 * Import `test` from here, not from @playwright/test, in any spec that needs the
 * LDE backend or Operaton. A spec that needs neither — the Amsterdam re-import
 * journey — imports the plain one, and running it alone probes nothing, so it
 * can run where no stack exists, CI included (#190). This used to be the
 * suite's globalSetup, which probed for every run whatever was selected.
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
 * Keycloak's realm is checked too: every journey signs in first (#249).
 *
 * Environment for the stack journeys:
 *   E2E_BACKEND_URL    default: VITE_BACKEND_URL in .env.development
 *   E2E_OPERATON_URL   default: http://localhost:8081
 *   E2E_KEYCLOAK_URL   default: VITE_KEYCLOAK_URL in .env.development
 *   LDE_E2E_PASSWORD   required: the journeys sign in before deploying (#163 in
 *                      linked-data-explorer); see signIn.js
 *   LDE_E2E_USERNAME   default: lde-e2e
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
const fromDevelopmentEnv = (name) => {
  const envFile = resolve(process.cwd(), '.env.development');
  if (!existsSync(envFile)) return undefined;
  const match = readFileSync(envFile, 'utf8').match(
    new RegExp(`^\\s*${name}\\s*=\\s*(.+?)\\s*$`, 'm')
  );
  return match?.[1];
};

const backendUrl = () =>
  process.env.E2E_BACKEND_URL ||
  fromDevelopmentEnv('VITE_BACKEND_URL') ||
  // The same fallback the source uses when the variable is absent.
  'http://localhost:3001';

/**
 * The Keycloak the app signs in against, read the same way (#249): every stack
 * journey signs in first, and with Keycloak down that used to surface as a
 * 30-second timeout waiting for "Sign out" in signIn.js.
 */
const keycloakUrl = () =>
  process.env.E2E_KEYCLOAK_URL ||
  fromDevelopmentEnv('VITE_KEYCLOAK_URL') ||
  'http://localhost:8080';

const operatonUrl = () => process.env.E2E_OPERATON_URL ?? 'http://localhost:8081';

/** Up means "answered at all". Any HTTP status proves something is listening. */
const probe = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return { up: true, ok: response.ok, detail: `HTTP ${response.status}` };
  } catch (error) {
    return {
      up: false,
      detail: error.name === 'AbortError' ? `no answer in ${TIMEOUT_MS}ms` : error.message,
    };
  } finally {
    clearTimeout(timer);
  }
};

const requireStack = async () => {
  const backend = backendUrl();
  const operaton = operatonUrl();
  const keycloakRealm = `${keycloakUrl()}/realms/ronl`;

  const [backendResult, operatonResult, keycloakResult] = await Promise.all([
    probe(backend),
    probe(`${operaton}/engine-rest/version`),
    probe(`${keycloakRealm}/.well-known/openid-configuration`),
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

  // Answering is not enough here: a Keycloak without the realm answers 404,
  // and the sign-in would fail just the same.
  if (!keycloakResult.up || !keycloakResult.ok) {
    problems.push(
      `  Keycloak realm ronl is not available at ${keycloakRealm}\n` +
        `    (${keycloakResult.detail})\n` +
        `    Every stack journey signs in before deploying. Start Keycloak (the\n` +
        `    ronl-business-api stack), then retry. Override the URL with\n` +
        `    E2E_KEYCLOAK_URL, or edit VITE_KEYCLOAK_URL in .env.development.`
    );
  }

  if (problems.length) {
    throw new Error(
      `\nThis journey needs a live stack, and it is not ready:\n\n` +
        problems.join('\n\n') +
        `\n\nNone of its steps were run.\n`
    );
  }

  console.log(
    `  preflight ok — backend ${backend} (${backendResult.detail}), ` +
      `Operaton ${operaton} (${operatonResult.detail}), ` +
      `Keycloak ${keycloakRealm} (${keycloakResult.detail})`
  );
};

/**
 * Worker-scoped and automatic: the probe runs once per worker, before the first
 * test that imported this `test`, without any spec having to ask for it. A
 * failure fails that spec's tests with the message above rather than a timeout.
 *
 * Playwright replaces a worker after a failed test, and the new worker probes
 * again — at worst ten seconds per stack journey with the stack down, which buys
 * the same named cause on every one of them. A stack-free spec in the same run
 * still runs and reports on its own.
 */
export const test = base.extend({
  stack: [
    // Playwright requires a fixture's first argument to be a destructuring
    // pattern, even when it uses no other fixture.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await requireStack();
      await use();
    },
    { scope: 'worker', auto: true },
  ],
});

export { expect } from '@playwright/test';
