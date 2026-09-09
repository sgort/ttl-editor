import { fireEvent, render, screen } from '@testing-library/react';

import App from './App';

/**
 * Behaviour of the four lazy-loaded tabs, as seen through App.
 *
 * no-eager-tabs.test.js proves the split is still *wired* — that the barrel does
 * not re-export a lazy tab and that App reaches them only through lazy(). It
 * says nothing about whether they still render, because it never runs the app.
 *
 * That gap is worth closing here rather than leaving it to the E2E suite:
 * before this file, no test in the unit suite switched tabs at all, so every tab
 * but the default 'service' one was rendered only by its own component test and
 * never through App. Making four of them asynchronous without a test that opens
 * one would have left the whole Suspense wiring unverified at this level.
 */

const openTab = (name) => fireEvent.click(screen.getByRole('button', { name }));

/**
 * findBy* default to 1000ms, which these tests can exceed under load.
 *
 * Every other component test resolves its subject through the module graph the
 * runner has already loaded; these four wait on a real dynamic import, and when
 * the full suite is running that import competes with every other worker. The
 * test then fails for want of a few hundred milliseconds while passing on its
 * own — which says nothing about the code. Verified: the file passes in
 * isolation and failed only in the parallel run.
 */
const LAZY_CHUNK_TIMEOUT = { timeout: 15_000 };

const CHANGELOG_HEADING = 'Documentation & Changelog';
const DMN_HEADING = 'DMN Decision Engine Integration';
// The Service tab is eager and is the default, so its content is the marker for
// "some other tab is currently the active one".
const SERVICE_FIELD = /Unique identifier for this service/;

describe('lazy-loaded tabs', () => {
  test('a lazy tab is absent until its tab is opened, then renders', async () => {
    render(<App />);

    expect(screen.queryByText(CHANGELOG_HEADING)).not.toBeInTheDocument();

    openTab('Changelog');

    // findBy* rather than getBy*: the chunk resolves on a microtask, so the
    // heading is not there on the tick the click returns.
    expect(
      await screen.findByText(CHANGELOG_HEADING, undefined, LAZY_CHUNK_TIMEOUT)
    ).toBeInTheDocument();
  });

  test('the DMN tab is not rendered before its first visit', () => {
    render(<App />);

    // The DMN tab is the one that stays mounted while hidden, so "not the active
    // tab" is not enough — it must be genuinely absent, or React resolves its
    // import on mount and the chunk ships on every page load regardless.
    expect(screen.queryByText(DMN_HEADING)).not.toBeInTheDocument();
  });

  test('the DMN tab stays mounted after switching away from it', async () => {
    render(<App />);

    openTab('DMN');
    expect(await screen.findByText(DMN_HEADING, undefined, LAZY_CHUNK_TIMEOUT)).toBeInTheDocument();

    openTab('Service');

    // Both at once. The Service tab's content proves DMN is no longer the active
    // tab, and the DMN heading proves it was not unmounted on the way out — an
    // uploaded file, deployment status and test-case results live in that
    // subtree's state and have to survive the switch.
    expect(screen.getByLabelText(SERVICE_FIELD)).toBeInTheDocument();
    expect(screen.getByText(DMN_HEADING)).toBeInTheDocument();
  });

  test('opening a second lazy tab leaves the DMN tab mounted', async () => {
    render(<App />);

    openTab('DMN');
    await screen.findByText(DMN_HEADING, undefined, LAZY_CHUNK_TIMEOUT);

    openTab('Changelog');
    await screen.findByText(CHANGELOG_HEADING, undefined, LAZY_CHUNK_TIMEOUT);

    // Each lazy tab has its own Suspense boundary, so loading one never disturbs
    // the other's subtree.
    expect(screen.getByText(DMN_HEADING)).toBeInTheDocument();
  });
});
