import { applyMapping } from './iknowParser';

/**
 * applyMapping — turning a parsed iKnow export into CPSV-AP fields.
 *
 * A mapping entry names which parsed collection to read (concepts,
 * textAnnotations, documents, or the document's own metadata), a dotted path
 * into the first matching item, an optional filter, and an optional transform.
 * Each collection is a separate branch, and only `concepts` was exercised
 * before this file.
 *
 * Filters come in two shapes that are easy to confuse: an array means "match
 * any of these", anything else is compared for equality. Both are covered here
 * because a filter that silently matches nothing produces an empty field rather
 * than an error, and nothing downstream would notice.
 */

const parsed = {
  type: 'CognitatieAnnotation',
  metadata: { name: 'Zorgtoeslag', exportDateTime: '2026-01-01T00:00:00' },
  concepts: [
    { id: 'c1', name: 'Leeftijd', type: 'input', definition: 'De leeftijd' },
    { id: 'c2', name: 'Inkomen', type: 'output', definition: 'Het inkomen' },
  ],
  textAnnotations: [
    { id: 't1', type: 'artikel', text: 'Artikel 1', document: 'd1' },
    { id: 't2', type: 'lid', text: 'Lid 2', document: 'd2' },
  ],
  documents: [{ id: 'd1', title: 'Zorgtoeslagwet', juriconnect: 'jci1.3:c:BWBR0018451' }],
};

const map = (mappings) => applyMapping(parsed, { mappings });

describe('applyMapping source selection', () => {
  test('reads from concepts', () => {
    expect(map({ 'service.name': { source: 'concepts', path: 'name' } }).service.name).toBe(
      'Leeftijd'
    );
  });

  test('reads from textAnnotations', () => {
    expect(map({ 'legal.title': { source: 'textAnnotations', path: 'text' } }).legal.title).toBe(
      'Artikel 1'
    );
  });

  test('reads from documents', () => {
    expect(map({ 'legal.title': { source: 'documents', path: 'title' } }).legal.title).toBe(
      'Zorgtoeslagwet'
    );
  });

  test('reads from metadata, which is a single object rather than a collection', () => {
    expect(map({ 'service.name': { source: 'metadata', path: 'name' } }).service.name).toBe(
      'Zorgtoeslag'
    );
  });

  test('an unknown source yields nothing rather than throwing', () => {
    expect(map({ 'service.name': { source: 'nowhere', path: 'name' } }).service).toEqual({});
  });
});

describe('applyMapping filters', () => {
  test('an equality filter selects the first matching item', () => {
    const out = map({
      'service.name': { source: 'concepts', path: 'name', filter: { type: 'output' } },
    });

    expect(out.service.name).toBe('Inkomen');
  });

  test('an array filter matches any of the listed values', () => {
    const out = map({
      'legal.title': {
        source: 'textAnnotations',
        path: 'text',
        filter: { type: ['lid', 'bijlage'] },
      },
    });

    expect(out.legal.title).toBe('Lid 2');
  });

  test('a filter that matches nothing leaves the field unset', () => {
    const out = map({
      'service.name': { source: 'concepts', path: 'name', filter: { type: 'nonexistent' } },
    });

    expect(out.service.name).toBeUndefined();
  });
});

describe('applyMapping transforms', () => {
  test('prefix and suffix wrap the extracted value', () => {
    const out = map({
      'service.name': {
        source: 'concepts',
        path: 'name',
        transform: { type: 'prefix', value: 'cpsv:' },
      },
      'legal.title': {
        source: 'concepts',
        path: 'name',
        transform: { type: 'suffix', value: ' (concept)' },
      },
    });

    expect(out.service.name).toBe('cpsv:Leeftijd');
    expect(out.legal.title).toBe('Leeftijd (concept)');
  });

  test('replace rewrites every occurrence', () => {
    const out = map({
      'service.name': {
        source: 'concepts',
        path: 'definition',
        transform: { type: 'replace', pattern: 'e', replacement: 'E' },
      },
    });

    expect(out.service.name).toBe('DE lEEftijd');
  });

  test('uri percent-encodes the value', () => {
    const out = map({
      'service.name': {
        source: 'documents',
        path: 'title',
        transform: { type: 'uri' },
      },
    });

    expect(out.service.name).toBe('Zorgtoeslagwet');
  });

  test('custom runs the supplied function', () => {
    const out = map({
      'service.name': {
        source: 'concepts',
        path: 'name',
        transform: { type: 'custom', fn: (v) => v.toUpperCase() },
      },
    });

    expect(out.service.name).toBe('LEEFTIJD');
  });

  test('an unknown transform type passes the value through unchanged', () => {
    const out = map({
      'service.name': { source: 'concepts', path: 'name', transform: { type: 'mystery' } },
    });

    expect(out.service.name).toBe('Leeftijd');
  });
});
