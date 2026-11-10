import { authHeaders, getAuthState } from '../utils/auth';
import { setAuthState } from './authState';

// The double every suite runs under: an author by default, with a token; a test
// that sets a signed-out state gets no token, as the real module would send.
describe('auth test double', () => {
  test('starts as an author who sends a token', async () => {
    expect(getAuthState()).toMatchObject({ signedIn: true, isAuthor: true });
    await expect(authHeaders()).resolves.toEqual({ Authorization: 'Bearer test-token' });
  });

  test('signed out, it sends no token', async () => {
    setAuthState({ ready: true, signedIn: false, isAuthor: false });
    await expect(authHeaders()).resolves.toEqual({});
  });

  test('each test starts as an author again', () => {
    expect(getAuthState().isAuthor).toBe(true);
  });
});
