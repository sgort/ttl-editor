import { render, screen } from '@testing-library/react';

import CPRMVTab from './CPRMVTab';

/**
 * The Legal Source banner, and the URL it builds.
 *
 * Every CPRMV rule links to the service's legal resource through
 * cprmv:implements, so the URL shown in this banner is the one that ends up in
 * the published TTL. It is assembled from the identifier's shape — full URI,
 * BWB id, CVDR id, or something unrecognised — and then given a version
 * segment if one is set. CPRMVTab.test.jsx covers the rule editor; this file
 * covers that assembly.
 *
 * CVDR is the case worth watching: it alone gets a trailing "/1" before any
 * version is appended, so a versioned CVDR link has two path segments after
 * the identifier while a BWB one has a single segment.
 */

const renderWith = (legalResource) =>
  render(
    <CPRMVTab
      cprmvRules={[]}
      addCPRMVRule={vi.fn()}
      removeCPRMVRule={vi.fn()}
      updateCPRMVRule={vi.fn()}
      handleImportJSON={vi.fn()}
      setCprmvRules={vi.fn()}
      legalResource={{ bwbId: '', version: '', title: '', description: '', ...legalResource }}
    />
  );

const expectLegalLink = (href) =>
  expect(screen.getByRole('link', { name: href })).toHaveAttribute('href', href);

describe('CPRMVTab legal source banner', () => {
  test('warns instead of linking when no legal resource is set', () => {
    renderWith({});

    expect(screen.getByText(/No legal resource/i)).toBeInTheDocument();
  });

  test('a BWB id becomes a wetten.overheid.nl link', () => {
    renderWith({ bwbId: 'BWBR0011353' });

    expectLegalLink('https://wetten.overheid.nl/BWBR0011353');
  });

  test('a CVDR id becomes a lokaleregelgeving link with the default /1 segment', () => {
    renderWith({ bwbId: 'CVDR641872' });

    expectLegalLink('https://lokaleregelgeving.overheid.nl/CVDR641872/1');
  });

  test('a full URI is used as given', () => {
    renderWith({ bwbId: 'https://example.org/regeling/42' });

    expectLegalLink('https://example.org/regeling/42');
  });

  test('an http:// URI is treated as a full URI too', () => {
    renderWith({ bwbId: 'http://example.org/regeling/42' });

    expectLegalLink('http://example.org/regeling/42');
  });

  test('an unrecognised identifier falls back to the BWB host', () => {
    // Not a defensible URL, but the banner still shows what would be published
    // rather than rendering nothing — LegalTab is where the identifier gets
    // flagged as invalid.
    renderWith({ bwbId: 'mystery' });

    expectLegalLink('https://wetten.overheid.nl/mystery');
  });

  test('a version is appended to the URL and shown beneath it', () => {
    renderWith({ bwbId: 'BWBR0011353', version: '2025-07-01' });

    expectLegalLink('https://wetten.overheid.nl/BWBR0011353/2025-07-01');
    expect(screen.getByText(/Version: 2025-07-01/)).toBeInTheDocument();
  });

  test('a version is appended after the CVDR /1 segment', () => {
    renderWith({ bwbId: 'CVDR641872', version: '2' });

    expectLegalLink('https://lokaleregelgeving.overheid.nl/CVDR641872/1/2');
  });

  test('the title is shown when set, and nothing is shown when it is not', () => {
    const { unmount } = renderWith({ bwbId: 'BWBR0011353', title: 'Zorgtoeslagwet' });
    expect(screen.getByText('Zorgtoeslagwet')).toBeInTheDocument();
    unmount();

    renderWith({ bwbId: 'BWBR0011353' });
    expect(screen.queryByText('Zorgtoeslagwet')).not.toBeInTheDocument();
  });
});
