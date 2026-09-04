import { getBuildInfo } from './buildInfo';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getBuildInfo', () => {
  test('reports a local build when nothing was injected', () => {
    // A developer's own `npm run build`, or the dev server. Saying so beats
    // rendering an empty marker that reads as a bug.
    vi.stubEnv('VITE_BUILD_SHA', '');
    vi.stubEnv('VITE_BUILD_RUN', '');

    expect(getBuildInfo()).toMatchObject({ isTracked: false, label: 'local build' });
  });

  test('abbreviates the SHA to seven characters', () => {
    vi.stubEnv('VITE_BUILD_SHA', '570fd9812ab34cd56ef78901234567890abcdef1');
    vi.stubEnv('VITE_BUILD_RUN', '');

    expect(getBuildInfo()).toMatchObject({ shortSha: '570fd98', label: 'build 570fd98' });
  });

  test('includes the run number when the workflow supplied one', () => {
    // The SHA says what was built; the run number distinguishes two builds of
    // identical code, which is what makes this a build id rather than a code id.
    vi.stubEnv('VITE_BUILD_SHA', '570fd9812ab34cd56ef78901234567890abcdef1');
    vi.stubEnv('VITE_BUILD_RUN', '412');

    expect(getBuildInfo()).toMatchObject({
      shortSha: '570fd98',
      run: '412',
      isTracked: true,
      label: 'build 570fd98 · #412',
    });
  });

  test('keeps the full SHA alongside the abbreviation', () => {
    const sha = '570fd9812ab34cd56ef78901234567890abcdef1';
    vi.stubEnv('VITE_BUILD_SHA', sha);

    expect(getBuildInfo().sha).toBe(sha);
  });

  test('a run number without a SHA is still a local build', () => {
    // Half-configured is not tracked. Rendering "#412" with no commit behind it
    // would imply a provenance the bundle does not actually have.
    vi.stubEnv('VITE_BUILD_SHA', '');
    vi.stubEnv('VITE_BUILD_RUN', '412');

    expect(getBuildInfo()).toMatchObject({ isTracked: false, label: 'local build' });
  });
});
