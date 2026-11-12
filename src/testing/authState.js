/**
 * The test double for src/utils/auth.js (#163 in linked-data-explorer).
 *
 * setupTests.js puts it in place for every suite, signed in as an author, so a
 * test that renders <App /> or the DMN tab sees today's behaviour: Publish and
 * Deploy work and send a token. A test about the signed-out states calls
 * setAuthState; every test starts as an author again.
 */
import { vi } from 'vitest';

const AUTHOR = { ready: true, signedIn: true, isAuthor: true, name: 'Test Author' };

let state = AUTHOR;
const listeners = new Set();

export function setAuthState(next) {
  state = next;
  listeners.forEach((fn) => fn());
}

export function resetAuthState() {
  setAuthState(AUTHOR);
}

export const authMock = {
  AUTHOR_ROLE: 'lde-author',
  initAuth: vi.fn(async () => undefined),
  signIn: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
  getAuthState: () => state,
  subscribe: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  authHeaders: vi.fn(async () => (state.isAuthor ? { Authorization: 'Bearer test-token' } : {})),
};
