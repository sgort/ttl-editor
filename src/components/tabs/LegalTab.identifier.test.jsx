import { render, screen } from '@testing-library/react';

import LegalTab from './LegalTab';

/**
 * How LegalTab classifies the legal-resource identifier.
 *
 * The tab accepts three shapes — a BWB id for national legislation, a CVDR id
 * for local regulations, and a full URI — and renders a different detected
 * format, hint and repository badge for each. LegalTab.test.jsx covers the tab
 * rendering and its controlled-field contract; this file covers the branching
 * that decides which of those three the user has typed, and what happens when
 * it is none of them.
 *
 * Its own file, following the ttlGenerator.*.test.js convention in this repo.
 */

const base = { bwbId: '', version: '', title: '', description: '' };

const renderWith = (legalResource) =>
  render(
    <LegalTab
      legalResource={legalResource}
      setLegalResource={vi.fn()}
      ronlAnalysis=""
      setRonlAnalysis={vi.fn()}
      ronlMethod=""
      setRonlMethod={vi.fn()}
      analysisConcepts={[]}
      methodConcepts={[]}
      loadingConcepts={false}
      conceptsFailed={false}
    />
  );

const INVALID_HINT = /Must be a BWB ID/;
const IDENTIFIER_LABEL = /BWB ID.*CVDR ID.*full document URI/i;

describe('LegalTab identifier detection', () => {
  test('an empty identifier is neither valid nor flagged as wrong', () => {
    renderWith(base);

    // Nothing typed yet is not an error — the warning belongs to input that
    // was entered and cannot be recognised.
    expect(screen.queryByText(INVALID_HINT)).not.toBeInTheDocument();
    expect(screen.queryByText(/Detected format:/)).not.toBeInTheDocument();
  });

  test('a BWB id is detected as national legislation and badged', () => {
    renderWith({ ...base, bwbId: 'BWBR0011353' });

    expect(screen.getByText('BWB National Legislation')).toBeInTheDocument();
    expect(screen.getByText('National Legislation (BWB)')).toBeInTheDocument();
    expect(screen.queryByText(INVALID_HINT)).not.toBeInTheDocument();
  });

  test('a CVDR id is detected as a local regulation and explains the /1 default', () => {
    renderWith({ ...base, bwbId: 'CVDR641872' });

    expect(screen.getByText('CVDR Local Regulation')).toBeInTheDocument();
    expect(screen.getByText('Local Regulations (CVDR)')).toBeInTheDocument();
    // The CVDR-only hint: the generated URI gets a "/1" version segment unless
    // the author overrides it.
    expect(screen.getByText(/Default is "\/1"/)).toBeInTheDocument();
  });

  test('a full URI is accepted without a detected-format line', () => {
    // A URI is already resolvable, so there is nothing to detect or explain —
    // and no repository badge, because the host is whatever the author typed.
    renderWith({ ...base, bwbId: 'https://wetten.overheid.nl/BWBR0011353' });

    expect(screen.queryByText(INVALID_HINT)).not.toBeInTheDocument();
    expect(screen.queryByText(/Detected format:/)).not.toBeInTheDocument();
  });

  test('an http:// URI is accepted as well as https://', () => {
    renderWith({ ...base, bwbId: 'http://example.org/regeling' });

    expect(screen.queryByText(INVALID_HINT)).not.toBeInTheDocument();
  });

  test('an unrecognised identifier is flagged and marks the field', () => {
    renderWith({ ...base, bwbId: 'not-an-identifier' });

    expect(screen.getByText(INVALID_HINT)).toBeInTheDocument();
    expect(screen.getByLabelText(IDENTIFIER_LABEL)).toHaveClass('border-red-500');
  });

  test('a recognised identifier leaves the field unmarked', () => {
    renderWith({ ...base, bwbId: 'BWBR0011353' });

    expect(screen.getByLabelText(IDENTIFIER_LABEL)).toHaveClass('border-gray-300');
  });

  test('detection is case-insensitive', () => {
    renderWith({ ...base, bwbId: 'bwbr0011353' });

    expect(screen.getByText('BWB National Legislation')).toBeInTheDocument();
  });
});
