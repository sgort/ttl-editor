import { fireEvent, render, screen } from '@testing-library/react';

import { setAuthState } from '../testing/authState';
import { signIn, signOut } from '../utils/auth';
import SignInMenu from './SignInMenu';

describe('SignInMenu', () => {
  beforeEach(() => {
    setAuthState({ ready: true, signedIn: false, isAuthor: false });
    sessionStorage.clear();
    signIn.mockClear();
    signOut.mockClear();
  });

  test('signed out, "Sign in" opens the two routes', () => {
    render(<SignInMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('menuitem', { name: 'Flevoland-account' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Medewerker' })).toBeInTheDocument();
  });

  test('each entry signs in through its own route', () => {
    render(<SignInMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Flevoland-account' }));
    expect(signIn).toHaveBeenCalledWith('flevoland');

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Medewerker' }));
    expect(signIn).toHaveBeenCalledWith('medewerker');
  });

  test('signed in without lde-author: "View only" and a note on what that means', () => {
    setAuthState({ ready: true, signedIn: true, isAuthor: false, name: 'Viewer' });
    render(<SignInMenu />);
    expect(screen.getByText('View only')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your account does not have the lde-author role'
    );
  });

  test('the note can be dismissed; "View only" stays', () => {
    setAuthState({ ready: true, signedIn: true, isAuthor: false, name: 'Viewer' });
    render(<SignInMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('View only')).toBeInTheDocument();
  });

  test('a dismissed note stays away in this tab', () => {
    sessionStorage.setItem('ttl.auth.viewOnlyNoteDismissed', '1');
    setAuthState({ ready: true, signedIn: true, isAuthor: false, name: 'Viewer' });
    render(<SignInMenu />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('with storage unavailable, the note still shows and can be dismissed', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    setAuthState({ ready: true, signedIn: true, isAuthor: false, name: 'Viewer' });
    render(<SignInMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).toBeNull();
    vi.restoreAllMocks();
  });

  test('an author sees neither "View only" nor the note', () => {
    setAuthState({ ready: true, signedIn: true, isAuthor: true, name: 'Author' });
    render(<SignInMenu />);
    expect(screen.queryByText('View only')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('signed in, it shows the name and "Sign out"', () => {
    setAuthState({ ready: true, signedIn: true, isAuthor: true, name: 'Steven G' });
    render(<SignInMenu />);
    expect(screen.getByText('Steven G')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalled();
  });
});
