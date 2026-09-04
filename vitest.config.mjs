import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Phase 1 of the CRA-to-Vite migration: Vitest runs alongside Jest, against the
// same unmodified test files. This config is deliberately separate from
// vite.config.js, which does not exist yet — phase 2 creates it and folds this
// `test` block into it.
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
