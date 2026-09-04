import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Phase 2 of the CRA-to-Vite migration: Vite builds alongside Create React App.
// The two genuinely coexist — CRA reads public/index.html, Vite reads the root
// index.html — so nothing needs removing until phase 3.
//
// This replaces vitest.config.mjs: the plan calls for one config, not two.
//
// See docs/superpowers/plans/2026-08-29-vite-migration.md.

// Transitional, phase 1 only. `jest.fn` and friends are handled by aliasing the
// global in src/setupTests.vitest.js, but `jest.mock` cannot be: Vitest hoists
// mock registrations above the module imports at transform time, by scanning
// the source for that literal call. A global aliased at runtime is far too late
// — by then the real module has already been imported. So rewrite the one call
// site before Vitest's hoisting plugin sees the file.
//
// The alternative is editing the test, and phase 1 deliberately changes no test
// *content*: a test edited here is a test whose behaviour is no longer pinned by
// the Jest baseline it is being measured against. Verified load-bearing — drop
// this plugin and useEditorState.test.js fails 7 tests with
// "fetchAllRonlConcepts.mockResolvedValue is not a function". Removed in phase 4,
// when the call sites become vi.* for real.
const rewriteJestMock = {
  name: 'transitional-jest-mock-to-vi-mock',
  enforce: 'pre',
  transform(code, id) {
    if (!/\.test\.jsx?$/.test(id) || !code.includes('jest.mock(')) return null;
    return { code: code.replace(/\bjest\.mock\(/g, 'vi.mock('), map: null };
  },
};

export default defineConfig({
  plugins: [rewriteJestMock, react()],
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
    // Vite's default, stated explicitly because it is the single highest-risk
    // line in this migration: CI still says output_location: 'build', and phase
    // 3 is what changes both together. A mismatch deploys an empty directory
    // and reports success.
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.vitest.js'],
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
    },
  },
});
