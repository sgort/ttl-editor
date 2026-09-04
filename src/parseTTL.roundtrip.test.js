// Round-trip regression tests (phase P1, see
// https://iou-architectuur.open-regels.nl/cpsv-editor/developer/testing/): parse a real
// reference export, regenerate TTL from the parsed state, then parse the
// regenerated TTL again. The two parses should agree on every business field
// — proving parseTTLEnhanced -> generateTTL loses no data, without needing a
// brittle byte-for-byte diff against the original file's own formatting.
//
// examples/ronl.ttl is deliberately NOT included — it's the RONL SKOS
// vocabulary/taxonomy definition file (ronl:ConceptName a skos:Concept,
// prefixed names throughout, no bracketed subject URIs), not a CPSV-AP
// service export. Feeding it to parseTTLEnhanced throws (the concept-parsing
// branch assumes a bracketed <...> subject was already captured), which is
// correct behavior for an out-of-scope document shape, not a parser bug.
import fs from 'fs';
import path from 'path';

import parseTTLEnhanced from './parseTTL.enhanced';
import { generateTTL } from './utils/ttlGenerator';

const FIXTURES = [
  'examples/full-test.ttl',
  'examples/full-test-import-export.ttl',
  'examples/organizations/svb/Bepaling-leeftijd-AOW.ttl',
];

// Mirrors importHandler.js's handleTTLImport DMN-preservation branch exactly
// (the real app never calls generateTTL with parseTTLEnhanced's bare output —
// it goes through this mapping first). parseTTLEnhanced tracks embedded-DMN
// detection as top-level hasDmnData/importedDmnBlocks; only importHandler.js
// folds that into the dmnData shape hasDMN()/generateConceptsSection() (in
// ttlGenerator.js) actually read.
function deriveDmnData(parsed) {
  if (parsed.hasDmnData && parsed.importedDmnBlocks) {
    return {
      fileName: '',
      content: '',
      importedDmnBlocks: parsed.importedDmnBlocks,
      isImported: true,
      validationStatus: parsed.dmnValidationStatus || 'not-validated',
      validatedBy: parsed.dmnValidatedBy || '',
      validatedAt: parsed.dmnValidatedAt || '',
      validationNote: parsed.dmnValidationNote || '',
    };
  }
  return {
    fileName: '',
    content: '',
    importedDmnBlocks: null,
    isImported: false,
    validationStatus: 'not-validated',
    validatedBy: '',
    validatedAt: '',
    validationNote: '',
  };
}

// NOTE: 'concepts' is deliberately NOT in this list. generateConceptsSection()
// only runs when hasDMN() is true (ttlGenerator.js) — i.e. dmnData.isImported
// && dmnData.importedDmnBlocks, or dmnData.fileName && dmnData.content — not
// merely this.concepts having entries. Even with deriveDmnData() above
// faithfully reproducing the real app's import mapping, hasDMN() only reads
// dmnData.isImported/importedDmnBlocks (never dmnData.content alone from an
// import), so concepts still round-trip correctly whenever the fixture's own
// hasDmnData is true, and legitimately don't when it's false. See the
// dedicated describe block below for both cases, spelled out explicitly.
const COMPARABLE_FIELDS = [
  'service',
  'organization',
  'legalResource',
  'ronlAnalysis',
  'ronlMethod',
  'temporalRules',
  'parameters',
  'cprmvRules',
  'vendorService',
  'cost',
  'output',
];

// Array-item `id` fields (temporalRules, parameters, cprmvRules, concepts)
// are client-side React keys minted fresh on every parse (Date.now() +
// Math.random()) — never serialized into TTL, so they're expected to differ
// between the first and second parse. Stripped recursively rather than
// asserted on.
function stripIds(value) {
  if (Array.isArray(value)) {
    return value.map(stripIds);
  }
  if (value && typeof value === 'object') {
    const { id: _id, ...rest } = value;
    for (const key of Object.keys(rest)) {
      rest[key] = stripIds(rest[key]);
    }
    return rest;
  }
  return value;
}

function pickComparable(parsed) {
  const picked = {};
  for (const field of COMPARABLE_FIELDS) {
    picked[field] = stripIds(parsed[field]);
  }
  return picked;
}

describe.each(FIXTURES)('TTL round-trip: %s', (relativePath) => {
  const ttlContent = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

  test('parse -> generate -> parse agrees on every business field', () => {
    const firstParse = parseTTLEnhanced(ttlContent);
    const regenerated = generateTTL({ ...firstParse, dmnData: deriveDmnData(firstParse) });
    const secondParse = parseTTLEnhanced(regenerated);

    expect(pickComparable(secondParse)).toEqual(pickComparable(firstParse));
  });

  test('the source fixture actually has content to compare (guards against a silently-empty parse)', () => {
    const firstParse = parseTTLEnhanced(ttlContent);
    expect(firstParse.service.identifier).not.toBe('');
  });
});

describe('concepts round-trip only when a DMN model is actually attached', () => {
  test('full-test-import-export.ttl has an embedded DMN model, and its concepts survive round-trip', () => {
    const ttlContent = fs.readFileSync(
      path.join(__dirname, '..', 'examples/full-test-import-export.ttl'),
      'utf8'
    );
    const firstParse = parseTTLEnhanced(ttlContent);
    expect(firstParse.hasDmnData).toBe(true);
    expect(firstParse.concepts.length).toBeGreaterThan(0);

    const regenerated = generateTTL({ ...firstParse, dmnData: deriveDmnData(firstParse) });
    const secondParse = parseTTLEnhanced(regenerated);

    expect(stripIds(secondParse.concepts)).toEqual(stripIds(firstParse.concepts));
  });

  test('Bepaling-leeftijd-AOW.ttl has no DMN model, so it never had concepts to lose', () => {
    const ttlContent = fs.readFileSync(
      path.join(__dirname, '..', 'examples/organizations/svb/Bepaling-leeftijd-AOW.ttl'),
      'utf8'
    );
    const firstParse = parseTTLEnhanced(ttlContent);
    expect(firstParse.hasDmnData).toBe(false);
    expect(firstParse.concepts).toEqual([]);
  });

  test('forcing an empty dmnData onto a fixture that DOES have concepts drops them on regenerate', () => {
    // Documents the coupling explicitly: concepts are gated on hasDMN(), not
    // on this.concepts.length. If a caller ever calls generateTTL without
    // routing through deriveDmnData() first (i.e. without the real app's
    // importHandler.js mapping), concepts silently vanish. Locked in here so
    // a change to that coupling is a deliberate decision, not a silent
    // regression either way.
    const ttlContent = fs.readFileSync(
      path.join(__dirname, '..', 'examples/full-test-import-export.ttl'),
      'utf8'
    );
    const firstParse = parseTTLEnhanced(ttlContent);

    const regenerated = generateTTL({
      ...firstParse,
      dmnData: { fileName: '', content: '', isImported: false, importedDmnBlocks: null },
    });
    const secondParse = parseTTLEnhanced(regenerated);

    expect(secondParse.concepts).toEqual([]);
  });
});
