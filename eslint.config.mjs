import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import testingLibrary from 'eslint-plugin-testing-library';
import globals from 'globals';

/**
 * Flat config, replacing .eslintrc.json and eslint-config-react-app.
 *
 * react-app was carrying more than its rules: it pinned eslint to 8, which is
 * end-of-life, and pulled babel-preset-react-app, whose @babel/plugin-transform-
 * runtime@^7 was the last thing holding @vitejs/plugin-react at v5. It also
 * contributed three flowtype rules to a repository with no Flow.
 *
 * eslint 9, not 10: eslint-plugin-react caps its peer range at ^9.7, and
 * jsx-a11y and import at ^9. Until those move, 10 cannot resolve.
 */
export default [
  {
    // Replaces .eslintignore, which flat config no longer reads. node_modules is
    // ignored by default and does not need listing; *.json and *.html were in the
    // old file but eslint only lints the extensions it is asked for anyway.
    ignores: [
      'build/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'blob-report/**',
    ],
  },

  js.configs.recommended,

  // ---- application source -------------------------------------------------
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': { node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      // The JSX transform is automatic under Vite, so React need not be in scope.
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs['recommended-latest'].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      ...importPlugin.flatConfigs.recommended.rules,

      // Carried over from .eslintrc.json, unchanged.
      'react/prop-types': 'off',
      'import/no-unresolved': ['error', { caseSensitive: true }],
      'import/no-named-as-default': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],

      // Enabled with the label-association work; keeps 102 controls named.
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'either' }],

      // Off: this flags apostrophes and quotes in JSX text, and the UI copy is
      // Dutch — 29 findings across six tabs, all of the form "don't" or
      // "gebruiker's". eslint-config-react-app never enabled it either, so this
      // is not a rule the codebase is losing; it is one it never had. Turning it
      // on would mean rewriting readable copy as &apos; entities.
      'react/no-unescaped-entities': 'off',
    },
  },

  // ---- unit tests ---------------------------------------------------------
  {
    files: ['src/**/*.test.{js,jsx}', 'src/setupTests.js'],
    languageOptions: {
      // Node globals too: the suite runs under Vitest in a jsdom environment,
      // so tests legitimately reach for both — global.fetch for the fetch mocks,
      // __dirname for fixture paths.
      globals: { ...globals.browser, ...globals.node, ...globals.es2021, ...globals.vitest },
    },
    plugins: { vitest, 'testing-library': testingLibrary },
    rules: {
      ...vitest.configs.recommended.rules,
      ...testingLibrary.configs['flat/react'].rules,

      // Off: the rule counts expect() calls it can see in the test body, and
      // several suites assert through helpers — expectEveryControlToBeNamed in
      // accessible-names.test.jsx, for one. Those tests do assert; the rule
      // cannot follow a function call to find out. Nine false positives.
      'vitest/expect-expect': 'off',

      // Vitest's expect() takes an optional second argument: a message shown
      // when the assertion fails. The rule caps arguments at 1 by default, so
      // it flags a documented part of the API. Raised rather than switched off
      // — minArgs still catches a bare expect() with no subject.
      //
      // no-eager-tabs.test.js relies on it. Its assertions guard a bundling
      // property, and a failure there reads as "expected [] to equal
      // ['DMNTab']" with no hint of what that means; the message explains that
      // a barrel re-export silently un-splits the chunk.
      'vitest/valid-expect': ['error', { maxArgs: 2 }],
    },
  },

  // ---- Playwright ---------------------------------------------------------
  // The testing-library rules misfire here: Playwright's page.getByRole looks
  // like a Testing Library query destructured from render. They are simply not
  // loaded for this directory, rather than loaded and switched off.
  {
    files: ['e2e/**/*.js', 'playwright.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // Browser globals as well: page.addInitScript's callback is serialised and
      // runs inside the page, so it touches window even though the file is Node.
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: { import: importPlugin, 'simple-import-sort': simpleImportSort },
    rules: {
      ...importPlugin.flatConfigs.recommended.rules,
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/no-unresolved': ['error', { caseSensitive: true }],
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    },
  },

  // ---- build, tooling and repository scripts ------------------------------
  // scripts/ was never linted before: the old lint script listed src/ and e2e/
  // explicitly, so anything outside those was silently skipped. `eslint .` lints
  // what is there rather than what someone remembered to list.
  {
    files: [
      '*.config.{js,mjs}',
      'postcss.config.js',
      'tailwind.config.js',
      'scripts/**/*.{js,mjs}',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // Last, so its formatting rules win and the presets' stylistic rules are off.
  prettierRecommended,
];
