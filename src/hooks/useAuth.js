import { useSyncExternalStore } from 'react';

import { getAuthState, subscribe } from '../utils/auth';

/** The current sign-in state; re-renders when it changes (#163 in linked-data-explorer). */
export function useAuth() {
  return useSyncExternalStore(subscribe, getAuthState);
}

/**
 * Whether an action that changes shared state is locked for this user, and the
 * hint to show beside it. `hint` is null when the action is allowed.
 */
export function useLockedAction(verb) {
  const { signedIn, isAuthor } = useAuth();
  if (isAuthor) return { locked: false, hint: null };
  return {
    locked: true,
    hint: signedIn ? `You need permission to ${verb}` : `Sign in to ${verb}`,
  };
}
