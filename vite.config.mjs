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
    setupFiles: ['./src/setupTests.js'],
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
    },
  },
});
