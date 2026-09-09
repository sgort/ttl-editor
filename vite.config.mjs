import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Build and test configuration. One config, deliberately: Vitest reads the same
// file, so the suite and the bundle cannot drift apart in how they resolve and
// transform the source.
//
// This is the end state of the Create React App to Vite migration; see
// docs/superpowers/plans/2026-08-29-vite-migration.md for how it got here and,
// more usefully, for the traps it documents.

export default defineConfig({
  plugins: [react()],
  // Vite's defaults are 5173 for the dev server and 4173 for preview.
  // react-scripts served on 3000, and the LDE backend allowlists origins for
  // CORS — so taking Vite's defaults would break local SHACL validation, DSO
  // import and TriplyDB publishing for every developer, against a backend that
  // is running and correct, with nothing in this repository to explain why.
  // Observed for real during the phase 2 preview: "CORS blocked for origin:
  // http://localhost:4173".
  //
  // Keeping 3000 preserves the existing contract and needs no change in the
  // backend repository. strictPort so a silently-reassigned port cannot
  // reintroduce the same failure.
  server: { port: 3000, strictPort: true },
  preview: { port: 3000, strictPort: true },
  build: {
    // Vite's default, stated explicitly because it has to agree with
    // output_location in both Azure Static Web Apps workflows. If they ever
    // disagree, Azure uploads an empty directory and reports SUCCESS — the
    // deploy goes green and publishes nothing.
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Vitest's default is 5s per test. The component suites walk whole
    // lifecycles — upload, validate, deploy, evaluate — each step a FileReader
    // or a mocked round trip, and each one waiting on the DOM; under coverage
    // instrumentation with every file running in parallel, the slowest of them
    // came within a few hundred milliseconds of that ceiling and intermittently
    // crossed it. See the note on asyncUtilTimeout in src/setupTests.js.
    testTimeout: 15000,
    setupFiles: ['./src/setupTests.js'],
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      // A branch floor, per file.
      //
      // Per file, because a project average lets a well-tested utility pay for
      // an untested component; the branches that matter are precisely the ones
      // nobody has exercised, and an average is designed to hide them.
      //
      // Branches, because statement and line coverage largely restate "was this
      // file imported", and function coverage rewards splitting code into more
      // functions. A branch is a decision the code makes; an uncovered branch is
      // a decision no test has ever checked.
      //
      // This lived in scripts/check-branch-coverage.mjs while some files were
      // still below the floor: Vitest's threshold globs are additive rather than
      // overriding — "Global threshold is for all files, even if they are
      // included by glob patterns" — so a per-file exemption cannot be expressed
      // here, and the ratchet that carried the debt had to live outside. With
      // nothing left to exempt, that no longer matters and the policy is native.
      //
      // One caveat travels with the numbers: they come from Vitest alone. The
      // two Playwright journeys drive TTL import, DMN upload, deployment and
      // evaluation end to end, and none of that reaches this report.
      thresholds: { branches: 80, perFile: true },
    },
  },
});
