import { extractValue, parseCognitatieAnnotation, parseSemanticsExport } from './iknowParser';

/**
 * What the iKnow parsers do with incomplete input.
 *
 * iknowParser.test.js works from well-formed exports. This file covers the
 * other half: every optional child element the parsers guard with a ternary,
 * and the malformed-document path. Real exports from iKnow do omit these —
 * a concept with no definition, a term with no value — and the guards exist
 * because of it, but nothing exercised them.
 *
 * Its own file rather than an addition to the first, following the
 * ttlGenerator.*.test.js convention already used in this directory.
 */

const cognitatie = (body) =>
  `<?xml version="1.0" encoding="UTF-8"?><knowledgedomain name="Test" exportdatetime="2026-01-01">${body}</knowledgedomain>`;

const semantics = (body) =>
  `<?xml version="1.0" encoding="UTF-8"?><knowledgedomain Id="1" Name="Test" Language="nl"><ConceptModel><Languages><Language>${body}</Language></Languages></ConceptModel></knowledgedomain>`;

describe('parseCognitatieAnnotation with optional elements missing', () => {
  test('a concept without a definition yields an empty definition rather than throwing', () => {
    const xml = cognitatie('<concepts><concept id="c1" name="Leeftijd" /></concepts>');

    const { concepts } = parseCognitatieAnnotation(xml);

    expect(concepts).toHaveLength(1);
    expect(concepts[0]).toMatchObject({ id: 'c1', name: 'Leeftijd', definition: '' });
  });

  test('a text annotation without a text node yields empty text', () => {
    const xml = cognitatie(
      '<textannotations><textannotation id="t1" document="d1" /></textannotations>'
    );

    const { textAnnotations } = parseCognitatieAnnotation(xml);

    expect(textAnnotations[0]).toMatchObject({ id: 't1', text: '' });
  });

  test('an absent concept attribute becomes null rather than the empty string', () => {
    // `concept` uses || null while the sibling fields use plain getAttribute,
    // so it is the one field that distinguishes "not linked" from "linked to
    // nothing" — worth pinning.
    const xml = cognitatie(
      '<textannotations><textannotation id="t1" document="d1" /></textannotations>'
    );

    expect(parseCognitatieAnnotation(xml).textAnnotations[0].concept).toBeNull();
  });

  test('a document without a knowledgedomain root is rejected by name', () => {
    expect(() => parseCognitatieAnnotation('<?xml version="1.0"?><other />')).toThrow(
      /missing knowledgedomain root/
    );
  });
});

describe('parseSemanticsExport with optional elements missing', () => {
  test('a concept without Id or State yields empty strings for both', () => {
    const xml = semantics('<Concept CreatedBy="ada" Version="2" />');

    const { concepts } = parseSemanticsExport(xml);

    expect(concepts[0]).toMatchObject({ id: '', state: '', createdBy: 'ada', version: '2' });
  });

  test('a term without a Value yields an empty value', () => {
    const xml = semantics(
      '<Concept><Id>c1</Id><Terms><Term Preferred="true" CreatedBy="ada" /></Terms></Concept>'
    );

    const [concept] = parseSemanticsExport(xml).concepts;

    expect(concept.terms[0]).toMatchObject({ value: '', preferred: true, createdBy: 'ada' });
  });

  test('a definition without a Value yields an empty value', () => {
    const xml = semantics(
      '<Concept><Id>c1</Id><Definitions><Definition CreatedBy="ada" /></Definitions></Concept>'
    );

    const [concept] = parseSemanticsExport(xml).concepts;

    expect(concept.definitions[0]).toMatchObject({ value: '', createdBy: 'ada' });
  });

  test('Preferred is true only for the literal string "true"', () => {
    const xml = semantics(
      '<Concept><Id>c1</Id><Terms><Term Preferred="TRUE"><Value>x</Value></Term></Terms></Concept>'
    );

    expect(parseSemanticsExport(xml).concepts[0].terms[0].preferred).toBe(false);
  });

  test('a document without a knowledgedomain root is rejected by name', () => {
    expect(() => parseSemanticsExport('<?xml version="1.0"?><other />')).toThrow(
      /missing knowledgedomain root/
    );
  });
});

describe('extractValue', () => {
  const item = { terms: [{ value: 'first' }, { value: 'second' }], state: 'Approved', empty: '' };

  test('reads a plain path', () => {
    expect(extractValue(item, 'state')).toBe('Approved');
  });

  test('reads an indexed path', () => {
    expect(extractValue(item, 'terms[1].value')).toBe('second');
  });

  test('returns null when the path runs off the end of the object', () => {
    expect(extractValue(item, 'missing.deeper')).toBeNull();
  });

  test('returns null for an index that does not exist', () => {
    expect(extractValue(item, 'terms[9].value')).toBeNull();
  });

  test('returns null rather than an empty string, so callers can treat it as absent', () => {
    expect(extractValue(item, 'empty')).toBeNull();
  });
});
