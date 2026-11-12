import { Eye, LogIn, LogOut, User, X } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '../hooks/useAuth';
import { signIn, signOut } from '../utils/auth';

// Per tab: the note comes back in a new tab or session, not on every render.
const NOTE_DISMISSED = 'ttl.auth.viewOnlyNoteDismissed';

function readDismissed() {
  try {
    return sessionStorage.getItem(NOTE_DISMISSED) === '1';
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    sessionStorage.setItem(NOTE_DISMISSED, '1');
  } catch {
    // Storage unavailable: the note is hidden until the next reload.
  }
}

const ROUTES = [
  { route: 'flevoland', label: 'Flevoland-account' },
  { route: 'medewerker', label: 'Medewerker' },
];

/**
 * Header sign-in (#163 in linked-data-explorer): two routes, as on RBA's
 * landing pages. Signed in, it shows the user's name and "Sign out"; without
 * lde-author also "View only", with a note on what that locks.
 */
export default function SignInMenu() {
  const { signedIn, isAuthor, name } = useAuth();
  const [open, setOpen] = useState(false);
  const [noteDismissed, setNoteDismissed] = useState(readDismissed);

  if (signedIn) {
    const viewOnly = !isAuthor;
    return (
      <div className="relative flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
        <User size={16} aria-hidden="true" />
        <span>{name}</span>
        {viewOnly && (
          <span
            className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium"
            title="Your account does not have the lde-author role"
          >
            <Eye size={12} aria-hidden="true" />
            View only
          </span>
        )}
        <button
          type="button"
          onClick={() => void signOut()}
          className="ml-2 inline-flex items-center gap-1 text-gray-500 hover:text-gray-800"
        >
          <LogOut size={14} aria-hidden="true" />
          Sign out
        </button>
        {viewOnly && !noteDismissed && (
          <div
            role="status"
            className="absolute right-0 top-full mt-2 w-80 z-50 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-lg whitespace-normal"
          >
            <span>
              Your account does not have the lde-author role. You can edit, but deploying to
              Operaton and publishing to TriplyDB are locked. Ask an administrator for the role.
            </span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => {
                writeDismissed();
                setNoteDismissed(true);
              }}
              className="flex-shrink-0 text-amber-700 hover:text-amber-900"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
      >
        <LogIn size={14} aria-hidden="true" />
        Sign in
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-50"
        >
          {ROUTES.map(({ route, label }) => (
            <button
              key={route}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void signIn(route);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
