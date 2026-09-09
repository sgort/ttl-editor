import { fireEvent, render, screen } from '@testing-library/react';

import changelogData from '../../data/changelog.json';
import ChangelogTab from './ChangelogTab';

/**
 * Version expand/collapse.
 *
 * Its own file rather than an addition to ChangelogTab.test.jsx, following the
 * ttlGenerator.*.test.js convention already used here: that file covers what the
 * tab renders, this one covers what it does when clicked.
 *
 * Both directions of the toggle are exercised deliberately. toggleVersion takes
 * separate paths through the Set — delete when the version is already open, add
 * when it is not — and testing only one leaves the other unrun.
 */

const headerFor = (version) =>
  screen.getByRole('button', { name: new RegExp(`Version ${version.version}`) });

/** The text that appears only while a version is expanded. */
const bodyMarkerFor = (version) =>
  version.commits ? version.commits[0].subject : version.sections[0].title;

describe('ChangelogTab version expansion', () => {
  test('the newest version starts expanded, and the toggle closes and reopens it', () => {
    const newest = changelogData.versions[0];
    render(<ChangelogTab />);

    const marker = bodyMarkerFor(newest);
    const header = headerFor(newest);

    // Open by default: the tab should land on what changed most recently
    // rather than on a wall of collapsed history.
    expect(screen.getByText(marker)).toBeInTheDocument();

    fireEvent.click(header);
    expect(screen.queryByText(marker)).not.toBeInTheDocument();

    fireEvent.click(header);
    expect(screen.getByText(marker)).toBeInTheDocument();
  });

  test('an older version starts collapsed and opens on click', () => {
    const older = changelogData.versions[1];
    render(<ChangelogTab />);

    const marker = bodyMarkerFor(older);

    expect(screen.queryByText(marker)).not.toBeInTheDocument();

    fireEvent.click(headerFor(older));
    expect(screen.getByText(marker)).toBeInTheDocument();
  });
});
