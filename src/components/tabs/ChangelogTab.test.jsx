import { render, screen } from '@testing-library/react';

import changelogData from '../../data/changelog.json';
import ChangelogTab from './ChangelogTab';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ChangelogTab', () => {
  test('renders the changelog heading', () => {
    render(<ChangelogTab />);

    expect(screen.getByText('Documentation & Changelog')).toBeInTheDocument();
  });

  describe('build provenance', () => {
    test('shows the injected build id beside the heading', () => {
      vi.stubEnv('VITE_BUILD_SHA', '570fd9812ab34cd56ef78901234567890abcdef1');
      vi.stubEnv('VITE_BUILD_RUN', '412');

      render(<ChangelogTab />);

      expect(screen.getByText('build 570fd98 · #412')).toBeInTheDocument();
    });

    test('exposes the full SHA as a title, so it can be copied for a lookup', () => {
      const sha = '570fd9812ab34cd56ef78901234567890abcdef1';
      vi.stubEnv('VITE_BUILD_SHA', sha);
      vi.stubEnv('VITE_BUILD_RUN', '412');

      render(<ChangelogTab />);

      expect(screen.getByText('build 570fd98 · #412')).toHaveAttribute('title', sha);
    });

    test('says "local build" when nothing was injected', () => {
      // What a developer sees running the app themselves. It must not look like
      // a deployed artifact, and must not render blank.
      vi.stubEnv('VITE_BUILD_SHA', '');
      vi.stubEnv('VITE_BUILD_RUN', '');

      render(<ChangelogTab />);

      expect(screen.getByText('local build')).toBeInTheDocument();
    });
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
