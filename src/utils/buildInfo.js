/**
 * Build provenance for the running bundle.
 *
 * The version in the Changelog comes from package.json and is bumped by hand, so
 * it answers "which release is this?" but not "which build of it?". ACC and PROD
 * can run different builds of the same version string, and redeploying without a
 * code change produces a new artifact carrying the same version. This closes
 * that gap.
 *
 * Both values are injected at build time from the deploy workflows. Vite only
 * exposes variables prefixed VITE_ to the client bundle, so they are named
 * accordingly and set in the `env:` block of the Build And Deploy step — the
 * same mechanism VITE_BACKEND_URL uses.
 *
 * Deliberately NOT derived by shelling out to git. The Static Web Apps action
 * does not run the build on the runner; it hands the directory to Oryx, which
 * builds inside its own container. Whether git and .git are present there is not
 * something a provenance marker should depend on, and a silent failure would
 * produce a build id that lies — worse than none at all.
 *
 * Read inside the function rather than captured at module scope, so tests can
 * stub the environment per case.
 */

/** Git SHAs are conventionally abbreviated to 7 characters for display. */
const SHORT_SHA_LENGTH = 7;

export const getBuildInfo = () => {
  const sha = import.meta.env.VITE_BUILD_SHA || '';
  const run = import.meta.env.VITE_BUILD_RUN || '';

  const shortSha = sha.slice(0, SHORT_SHA_LENGTH);

  // No SHA means nobody injected one: a developer's own `npm run build`, or the
  // dev server. Say so plainly rather than rendering an empty marker that looks
  // like a bug.
  if (!shortSha) {
    return { sha: '', shortSha: '', run: '', isTracked: false, label: 'local build' };
  }

  return {
    sha,
    shortSha,
    run,
    isTracked: true,
    label: run ? `build ${shortSha} · #${run}` : `build ${shortSha}`,
  };
};
