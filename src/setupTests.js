// jest-dom adds custom matchers for asserting on DOM nodes, so tests can say
// things like expect(element).toHaveTextContent(/react/i).
// https://github.com/testing-library/jest-dom
//
// The package keeps its name for historical reasons; nothing here runs on Jest.
// The suite is Vitest, and `vi` comes from `globals: true` in vite.config.mjs.
import '@testing-library/jest-dom';

import { vi } from 'vitest';

/**
 * No test reaches TriplyDB over the network.
 *
 * useEditorState fetches the RONL concept vocabularies on mount, so every test
 * that renders <App /> was making a live request to TriplyDB — App.test.jsx and
 * App.lazyTabs.test.jsx among them, neither of which mocks it or cares about
 * the result.
 *
 * That made coverage depend on the machine. Whether the request came back
 * before the test ended decided whether the effect's continuation ran at all,
 * so useEditorState.js measured 83.33% branch coverage locally and 50% on CI —
 * the same commit, the same tests. It is also why acc went red the moment a
 * branch floor started reading those numbers: the floor was honest, the
 * measurement was not.
 *
 * The default here resolves empty, which is the shape callers already handle.
 * A test that wants a different answer overrides it in the normal way — a
 * file-level vi.mock replaces this one, as useEditorState.test.js does.
 */
vi.mock('./utils/ronlHelper', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchAllRonlConcepts: vi.fn().mockResolvedValue({ analysisConcepts: [], methodConcepts: [] }),
}));
