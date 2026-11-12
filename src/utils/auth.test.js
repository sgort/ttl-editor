// setupTests.js stands in an author for every other suite; this one tests the
// real module.
vi.unmock('./auth');

// Every Keycloak instance the module creates, in order. `prepare` runs on each
// new instance, so a test can decide what the next session check finds.
const kc = vi.hoisted(() => ({ instances: [], config: null, prepare: null }));

vi.mock('keycloak-js', () => ({
  default: class {
    authenticated = false;
    token = undefined;
    tokenParsed = undefined;
    init = vi.fn(async () => this.authenticated);
    login = vi.fn(async () => undefined);
    logout = vi.fn(async () => undefined);
    updateToken = vi.fn(async () => true);
    createLoginUrl = vi.fn(() => 'https://kc.example/login');
    createLogoutUrl = vi.fn(() => 'https://kc.example/logout');
    clearToken = vi.fn(() => {
      this.authenticated = false;
      this.token = undefined;
    });
    constructor(config) {
      kc.config = config;
      kc.instances.push(this);
      kc.prepare?.(this);
    }
  },
}));

// A same-origin BroadcastChannel stand-in: post() delivers to every open channel
// of that name, as the callback page's message reaches every tab.
const bus = {
  channels: [],
  post(name, data) {
    bus.channels.filter((c) => c.name === name).forEach((c) => c.onmessage?.({ data }));
  },
};
class FakeChannel {
  onmessage = null;
  constructor(name) {
    this.name = name;
    bus.channels.push(this);
  }
  postMessage(data) {
    bus.post(this.name, data);
  }
  close() {
    bus.channels = bus.channels.filter((c) => c !== this);
  }
}

const SILENT = `${window.location.origin}/silent-check-sso.html`;
const CALLBACK = `${window.location.origin}/auth-callback.html`;

async function load() {
  vi.resetModules();
  kc.instances = [];
  const auth = await import('./auth');
  return { auth, fake: kc.instances[0] };
}

const latest = () => kc.instances[kc.instances.length - 1];

function signInFake(fake, roles = ['lde-author']) {
  fake.authenticated = true;
  fake.token = 'tok';
  fake.tokenParsed = { name: 'Steven G', realm_access: { roles } };
  fake.init.mockResolvedValue(true);
}

function openPopup(closed = false) {
  const popup = { closed };
  const open = vi.spyOn(window, 'open').mockReturnValue(popup);
  return { popup, open };
}

/** Lets the module's awaits and the popup poll run. */
async function settle(ms = 0) {
  await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(() => {
  localStorage.clear();
  kc.prepare = null;
  bus.channels = [];
  vi.stubGlobal('BroadcastChannel', FakeChannel);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('auth', () => {
  test('uses realm ronl and the ttl-editor client', async () => {
    await load();
    expect(kc.config).toMatchObject({ realm: 'ronl', clientId: 'ttl-editor' });
  });

  test('a visitor who never signed in is not sent to Keycloak on load', async () => {
    const { auth, fake } = await load();
    await auth.initAuth();
    const options = fake.init.mock.calls[0][0];
    expect(options).toMatchObject({ pkceMethod: 'S256', checkLoginIframe: false });
    expect(options.onLoad).toBeUndefined();
    expect(auth.getAuthState()).toMatchObject({ ready: true, signedIn: false, isAuthor: false });
  });

  test('someone who signed in before gets a silent check-sso in a hidden frame on load', async () => {
    localStorage.setItem('ttl.auth.wasSignedIn', '1');
    const { auth, fake } = await load();
    signInFake(fake);
    await auth.initAuth();
    expect(fake.init).toHaveBeenCalledWith(
      expect.objectContaining({ onLoad: 'check-sso', silentCheckSsoRedirectUri: SILENT })
    );
    expect(auth.getAuthState()).toEqual({
      ready: true,
      signedIn: true,
      isAuthor: true,
      name: 'Steven G',
    });
  });

  test('isAuthor follows the realm role lde-author', async () => {
    localStorage.setItem('ttl.auth.wasSignedIn', '1');
    const { auth, fake } = await load();
    signInFake(fake, ['pa-author']);
    await auth.initAuth();
    expect(auth.getAuthState()).toMatchObject({ signedIn: true, isAuthor: false });
  });

  test('without a name in the token, the username is shown', async () => {
    localStorage.setItem('ttl.auth.wasSignedIn', '1');
    const { auth, fake } = await load();
    signInFake(fake);
    fake.tokenParsed = { preferred_username: 'jdoe' };
    await auth.initAuth();
    expect(auth.getAuthState()).toEqual({
      ready: true,
      signedIn: true,
      isAuthor: false,
      name: 'jdoe',
    });
  });

  test('a token without name or claims still signs in, nameless', async () => {
    localStorage.setItem('ttl.auth.wasSignedIn', '1');
    const { auth, fake } = await load();
    signInFake(fake);
    fake.tokenParsed = undefined;
    await auth.initAuth();
    expect(auth.getAuthState()).toEqual({ ready: true, signedIn: true, isAuthor: false });
  });

  test('"Medewerker" opens the employee password page in a popup; the page stays', async () => {
    const { auth, fake } = await load();
    await auth.initAuth();
    const { open } = openPopup();
    void auth.signIn('medewerker');
    expect(fake.createLoginUrl).toHaveBeenCalledWith({
      redirectUri: CALLBACK,
      loginHint: '__medewerker__',
    });
    expect(open).toHaveBeenCalledWith(
      'https://kc.example/login',
      'ttl-sign-in',
      expect.any(String)
    );
    expect(fake.login).not.toHaveBeenCalled();
  });

  test('the popup opens in the middle of the browser window', async () => {
    const { auth } = await load();
    await auth.initAuth();
    vi.stubGlobal('screenX', -1920);
    vi.stubGlobal('screenY', 100);
    vi.stubGlobal('outerWidth', 1600);
    vi.stubGlobal('outerHeight', 1000);
    const { open } = openPopup();
    void auth.signIn('medewerker');
    // 520x720 centred on a window at (-1920, 100), 1600x1000 — on a monitor
    // left of the main one, so negative coordinates must survive.
    expect(open.mock.calls[0][2]).toBe('popup,width=520,height=720,left=-1380,top=240');
  });

  test('"Flevoland-account" goes straight to Entra, in the popup', async () => {
    const { auth, fake } = await load();
    await auth.initAuth();
    openPopup();
    void auth.signIn('flevoland');
    expect(fake.createLoginUrl).toHaveBeenCalledWith({
      redirectUri: CALLBACK,
      idpHint: 'entra-flevoland',
    });
  });

  test('when the popup reports back, the session is picked up without a reload', async () => {
    const { auth } = await load();
    await auth.initAuth();
    openPopup();
    const listener = vi.fn();
    auth.subscribe(listener);
    kc.prepare = (f) => signInFake(f);

    const done = auth.signIn('medewerker');
    bus.post('ttl-auth', 'done');
    await done;

    expect(latest().init).toHaveBeenCalledWith(
      expect.objectContaining({ onLoad: 'check-sso', silentCheckSsoRedirectUri: SILENT })
    );
    expect(auth.getAuthState()).toMatchObject({ signedIn: true, isAuthor: true, name: 'Steven G' });
    expect(listener).toHaveBeenCalled();
    expect(localStorage.getItem('ttl.auth.wasSignedIn')).toBe('1');
  });

  test('the session is also checked when the popup closes without reporting', async () => {
    const { auth } = await load();
    await auth.initAuth();
    const { popup } = openPopup();
    kc.prepare = (f) => signInFake(f);

    const done = auth.signIn('medewerker');
    popup.closed = true;
    await settle(1000);
    await done;

    expect(auth.getAuthState()).toMatchObject({ signedIn: true });
  });

  test('a popup closed without signing in leaves the user signed out', async () => {
    const { auth } = await load();
    await auth.initAuth();
    const { popup } = openPopup();

    const done = auth.signIn('medewerker');
    popup.closed = true;
    await settle(1000);
    await done;

    expect(auth.getAuthState()).toMatchObject({ signedIn: false });
    expect(localStorage.getItem('ttl.auth.wasSignedIn')).toBeNull();
  });

  test('a blocked popup falls back to the full-page sign-in', async () => {
    const { auth, fake } = await load();
    await auth.initAuth();
    vi.spyOn(window, 'open').mockReturnValue(null);
    await auth.signIn('medewerker');
    expect(fake.login).toHaveBeenCalledWith(
      expect.objectContaining({ loginHint: '__medewerker__', redirectUri: window.location.href })
    );
    expect(localStorage.getItem('ttl.auth.wasSignedIn')).toBe('1');
  });

  test('a sign-in in another tab reaches this one', async () => {
    const { auth } = await load();
    await auth.initAuth();
    kc.prepare = (f) => signInFake(f);
    bus.post('ttl-auth', 'done');
    await settle();
    expect(auth.getAuthState()).toMatchObject({ signedIn: true });
  });

  test('without BroadcastChannel, it still loads', async () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    const { auth } = await load();
    await auth.initAuth();
    expect(auth.getAuthState()).toMatchObject({ ready: true, signedIn: false });
  });

  test('signing out ends the session in a popup and stays on the page', async () => {
    localStorage.setItem('ttl.auth.wasSignedIn', '1');
    const { auth, fake } = await load();
    signInFake(fake);
    await auth.initAuth();
    const { open } = openPopup();

    await auth.signOut();

    expect(fake.createLogoutUrl).toHaveBeenCalledWith({ redirectUri: CALLBACK });
    expect(open).toHaveBeenCalledWith(
      'https://kc.example/logout',
      'ttl-sign-in',
      expect.any(String)
    );
    expect(fake.logout).not.toHaveBeenCalled();
    expect(auth.getAuthState()).toMatchObject({ signedIn: false, isAuthor: false });
    expect(localStorage.getItem('ttl.auth.wasSignedIn')).toBeNull();
  });

  test('a blocked popup on sign-out falls back to the full-page sign-out', async () => {
    localStorage.setItem('ttl.auth.wasSignedIn', '1');
    const { auth, fake } = await load();
    signInFake(fake);
    await auth.initAuth();
    vi.spyOn(window, 'open').mockReturnValue(null);
    await auth.signOut();
    expect(fake.logout).toHaveBeenCalledWith({ redirectUri: window.location.origin });
    expect(localStorage.getItem('ttl.auth.wasSignedIn')).toBeNull();
  });

  test('authHeaders is empty when signed out', async () => {
    const { auth } = await load();
    await auth.initAuth();
    await expect(auth.authHeaders()).resolves.toEqual({});
  });

  test('authHeaders refreshes the token and sends it as Bearer', async () => {
    localStorage.setItem('ttl.auth.wasSignedIn', '1');
    const { auth, fake } = await load();
    signInFake(fake);
    await auth.initAuth();
    await expect(auth.authHeaders()).resolves.toEqual({ Authorization: 'Bearer tok' });
    expect(fake.updateToken).toHaveBeenCalledWith(30);
  });

  test('authHeaders uses the session picked up after a popup sign-in', async () => {
    const { auth } = await load();
    await auth.initAuth();
    openPopup();
    kc.prepare = (f) => {
      signInFake(f);
      f.token = 'fresh';
    };
    const done = auth.signIn('medewerker');
    bus.post('ttl-auth', 'done');
    await done;
    await expect(auth.authHeaders()).resolves.toEqual({ Authorization: 'Bearer fresh' });
  });

  test('without a token after the refresh, no header is sent', async () => {
    localStorage.setItem('ttl.auth.wasSignedIn', '1');
    const { auth, fake } = await load();
    signInFake(fake);
    await auth.initAuth();
    fake.token = undefined;
    await expect(auth.authHeaders()).resolves.toEqual({});
  });

  test('a failed refresh signs the user out and sends no header', async () => {
    localStorage.setItem('ttl.auth.wasSignedIn', '1');
    const { auth, fake } = await load();
    signInFake(fake);
    await auth.initAuth();
    const listener = vi.fn();
    auth.subscribe(listener);
    fake.updateToken.mockRejectedValue(new Error('expired'));

    await expect(auth.authHeaders()).resolves.toEqual({});
    expect(auth.getAuthState()).toMatchObject({ signedIn: false, isAuthor: false });
    expect(listener).toHaveBeenCalled();
  });

  test('with storage unavailable, it still works, signed out on load', async () => {
    const { auth, fake } = await load();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    await auth.initAuth();
    expect(fake.init.mock.calls[0][0].onLoad).toBeUndefined();
    vi.spyOn(window, 'open').mockReturnValue(null);
    await auth.signIn('medewerker');
    expect(fake.login).toHaveBeenCalled();
  });

  test('a failing Keycloak on load leaves the app usable, signed out', async () => {
    localStorage.setItem('ttl.auth.wasSignedIn', '1');
    const { auth, fake } = await load();
    fake.init.mockRejectedValue(new Error('unreachable'));
    await auth.initAuth();
    expect(auth.getAuthState()).toMatchObject({ ready: true, signedIn: false });
  });
});
