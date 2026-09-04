import { render, screen } from '@testing-library/react';

import changelogData from '../../data/changelog.json';
import ChangelogTab from './ChangelogTab';

describe('ChangelogTab', () => {
  test('renders the changelog heading', () => {
    render(<ChangelogTab />);

    expect(screen.getByText('Documentation & Changelog')).toBeInTheDocument();
  });

  test('renders the most recent version from the bundled changelog', () => {
    // ChangelogTab takes no props — it reads src/data/changelog.json directly,
    // so the assertion is derived from that file rather than hard-coded. A
    // release bump must not break this test.
    render(<ChangelogTab />);

    const latest = changelogData.versions[0];
    expect(screen.getByText(`Version ${latest.version}`)).toBeInTheDocument();
  });

  test('expands the newest version by default and leaves the rest collapsed', () => {
    // Stated as an assertion rather than an `if`, so that a truncated changelog
    // fails loudly here instead of silently skipping the half of this test that
    // does the real work.
    expect(changelogData.versions.length).toBeGreaterThan(1);

    render(<ChangelogTab />);

    const [latest, previous] = changelogData.versions;
    expect(screen.getByText(latest.commits[0].subject)).toBeInTheDocument();
    expect(screen.queryByText(previous.commits[0].subject)).not.toBeInTheDocument();
  });
});
