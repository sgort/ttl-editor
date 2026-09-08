import { TTLGenerator } from './ttlGenerator';

/**
 * The URI and date helpers the emitters share.
 *
 * These decide the subject URIs of the published graph, so getting them wrong
 * does not throw — it produces a document that parses cleanly and points at the
 * wrong resources. They are pure functions on the generator, which makes them
 * worth testing directly rather than through the TTL they end up in.
 *
 * The date helpers matter for a subtler reason. A ruleset's consolidation date
 * comes from the rules themselves, carried in their cprmv:ruleIdPath as the
 * `_YYYY-MM-DD_` segment, because that is the in-force date the CPRMV API
 * actually resolved. The hand-entered legalResource.version is only the
 * fallback, so a document whose rules disagree with the form field publishes
 * the rules' date.
 */

const stateWith = (overrides = {}) => ({
  service: { identifier: 'zorgtoeslag', language: 'nl' },
  organization: { identifier: 'svb', logo: '' },
  legalResource: { bwbId: '', version: '', title: '', description: '' },
  ronlAnalysis: '',
  ronlMethod: '',
  temporalRules: [],
  parameters: [],
  cprmvRules: [],
  concepts: [],
  cost: { identifier: '', value: '', currency: 'EUR', description: '' },
  output: { identifier: '', name: '', description: '', type: '' },
  dmnData: { isImported: false, importedDmnBlocks: null, fileName: '', content: '' },
  vendorService: {},
  ...overrides,
});

const gen = (overrides) => new TTLGenerator(stateWith(overrides));

describe('buildLegalUriForRulesetId', () => {
  const build = (rulesetId, version) => gen({}).buildLegalUriForRulesetId(rulesetId, version);

  test('returns null without a ruleset id', () => {
    expect(build('')).toBeNull();
    expect(build(undefined)).toBeNull();
  });

  test('a BWB id resolves to wetten.overheid.nl', () => {
    expect(build('BWBR0015703')).toBe('https://wetten.overheid.nl/BWBR0015703');
  });

  test('a CVDR id resolves to lokaleregelgeving with the default /1 segment', () => {
    expect(build('CVDR641872')).toBe('https://lokaleregelgeving.overheid.nl/CVDR641872/1');
  });

  test('an unrecognised id falls back to the BWB host', () => {
    expect(build('ONBEKEND123')).toBe('https://wetten.overheid.nl/ONBEKEND123');
  });

  test('a full URI is used as given', () => {
    expect(build('https://example.org/regeling')).toBe('https://example.org/regeling');
  });

  test('a version is appended', () => {
    expect(build('BWBR0015703', '2026-04-03')).toBe(
      'https://wetten.overheid.nl/BWBR0015703/2026-04-03'
    );
  });

  test('an already-versioned URI is stripped before the version is re-applied', () => {
    // Subject URIs parsed back out of a TTL arrive carrying their date. Appending
    // another would produce .../2026-01-01/2026-04-03 — a resource that does not
    // exist, in a document that still parses.
    expect(build('https://example.org/regeling/2026-01-01', '2026-04-03')).toBe(
      'https://example.org/regeling/2026-04-03'
    );
  });

  test('a versioned URI with a trailing index is stripped too', () => {
    expect(build('https://example.org/regeling/2026-01-01/0', '2026-04-03')).toBe(
      'https://example.org/regeling/2026-04-03'
    );
  });
});

describe('buildLegalResourceUri', () => {
  test('combines the legal resource identifier with its version', () => {
    const uri = gen({
      legalResource: { bwbId: 'BWBR0018451', version: '2026-01-01' },
    }).buildLegalResourceUri();

    expect(uri).toBe('https://wetten.overheid.nl/BWBR0018451/2026-01-01');
  });

  test('omits the version segment when none is set', () => {
    const uri = gen({ legalResource: { bwbId: 'BWBR0018451' } }).buildLegalResourceUri();

    expect(uri).toBe('https://wetten.overheid.nl/BWBR0018451');
  });

  test('is null when there is no legal resource', () => {
    expect(gen({ legalResource: undefined }).buildLegalResourceUri()).toBeNull();
  });
});

describe('cprmvValidFrom', () => {
  test('uses the entered version when it is a full ISO date', () => {
    expect(gen({ legalResource: { bwbId: 'x', version: '2026-04-03' } }).cprmvValidFrom()).toBe(
      '2026-04-03'
    );
  });

  test('falls back to today when the version is not a date', () => {
    // The field accepts free text, and cprmv:validFrom is typed xsd:date — a
    // partial or prose version would produce an ill-typed literal.
    const today = new Date().toISOString().slice(0, 10);

    expect(gen({ legalResource: { bwbId: 'x', version: '2026' } }).cprmvValidFrom()).toBe(today);
    expect(gen({ legalResource: { bwbId: 'x', version: '' } }).cprmvValidFrom()).toBe(today);
    expect(gen({ legalResource: undefined }).cprmvValidFrom()).toBe(today);
  });
});

describe('rulesetDateFromRules', () => {
  const dateFrom = (rules) => gen({}).rulesetDateFromRules(rules);

  test('reads the consolidation date out of a rule path', () => {
    expect(dateFrom([{ ruleIdPath: 'BWBR0015703_2026-04-03_0, Artikel 20' }])).toBe('2026-04-03');
  });

  test('returns the first dated path, ignoring undated ones before it', () => {
    expect(
      dateFrom([
        { ruleIdPath: 'geen datum hier' },
        { ruleIdPath: 'BWBR0015703_2026-04-03_0, Artikel 20' },
      ])
    ).toBe('2026-04-03');
  });

  test('returns null when no rule carries a date', () => {
    expect(dateFrom([{ ruleIdPath: 'Artikel 20' }, {}])).toBeNull();
  });

  test('tolerates an absent list', () => {
    expect(dateFrom(undefined)).toBeNull();
    expect(dateFrom([])).toBeNull();
  });
});

describe('primaryRulesetDate', () => {
  test('prefers the date carried by the rules over the entered version', () => {
    // The rules' date is the one the CPRMV API resolved, so it wins over a
    // hand-entered consolidation date that may be stale.
    const date = gen({
      legalResource: { bwbId: 'BWBR0015703', version: '2026-03-04' },
      cprmvRules: [
        { rulesetId: 'BWBR0015703', ruleIdPath: 'BWBR0015703_2026-04-03_0, Artikel 20' },
      ],
    }).primaryRulesetDate();

    expect(date).toBe('2026-04-03');
  });

  test('falls back to the entered version when the rules carry no date', () => {
    const date = gen({
      legalResource: { bwbId: 'BWBR0015703', version: '2026-03-04' },
      cprmvRules: [{ rulesetId: 'BWBR0015703', ruleIdPath: 'Artikel 20' }],
    }).primaryRulesetDate();

    expect(date).toBe('2026-03-04');
  });

  test('is empty when neither source yields a date', () => {
    expect(
      gen({
        legalResource: { bwbId: 'BWBR0015703', version: '' },
        cprmvRules: [{ rulesetId: 'BWBR0015703', ruleIdPath: 'Artikel 20' }],
      }).primaryRulesetDate()
    ).toBe('');
  });
});

describe('CPRMV rule subject URIs', () => {
  const rulesOf = (cprmvRules) => gen({ cprmvRules });

  test('a rule with a legal path derives its URI from that path', () => {
    const rule = { ruleIdPath: 'BWBR0015703_2026-04-03_0, Artikel 20, lid 1, onderdeel a.' };

    expect(rulesOf([rule]).cprmvRuleBaseUri(rule)).toContain('https://cprmv.open-regels.nl/rules/');
  });

  test('a rule without a path falls back to ruleset and rule id', () => {
    const rule = { rulesetId: 'BWBR0015703', ruleId: 'onderdeel a.' };

    expect(rulesOf([rule]).cprmvRuleBaseUri(rule)).toBe(
      'https://cprmv.open-regels.nl/rules/BWBR0015703_onderdeel%20a.'
    );
  });

  test('a rule with neither is still given a well-formed URI', () => {
    // An incomplete row must not produce a malformed subject; it produces an
    // obviously-named one instead, which is visible in the published graph.
    const rule = {};

    expect(rulesOf([rule]).cprmvRuleBaseUri(rule)).toBe(
      'https://cprmv.open-regels.nl/rules/incomplete_incomplete'
    );
  });

  test('rules sharing a legal path get distinct subjects', () => {
    // Range bounds and per-period maxima legitimately share one ruleIdPath.
    // Without the suffix they collapse onto a single RDF subject and every norm
    // but the last is silently lost on publish.
    const path = 'BWBR0015703_2026-04-03_0, Artikel 20, lid 1, onderdeel a.';
    const first = { ruleIdPath: path, norm: '66' };
    const second = { ruleIdPath: path, norm: '69' };
    const third = { ruleIdPath: path, norm: '72' };
    const generator = rulesOf([first, second, third]);

    const uris = [first, second, third].map((r) => generator.cprmvRuleUri(r));

    expect(new Set(uris).size).toBe(3);
    // The first occurrence keeps the path-derived URI; later ones are suffixed
    // in document order.
    expect(uris[1]).toBe(uris[0] + '_2');
    expect(uris[2]).toBe(uris[0] + '_3');
  });

  test('the mapping is memoised, so both emitters resolve a rule identically', () => {
    // The RuleSet hasPart list and the flat Rule emitter each ask separately;
    // a recomputed map would be fine, but a shared one guarantees it.
    const rule = { ruleIdPath: 'BWBR0015703_2026-04-03_0, Artikel 1' };
    const generator = rulesOf([rule]);

    expect(generator.cprmvRuleUriMap()).toBe(generator.cprmvRuleUriMap());
    expect(generator.cprmvRuleUri(rule)).toBe(generator.cprmvRuleBaseUri(rule));
  });

  test('a rule the generator does not know about still resolves', () => {
    const stranger = { ruleIdPath: 'BWBR0015703_2026-04-03_0, Artikel 99' };

    expect(rulesOf([]).cprmvRuleUri(stranger)).toContain('cprmv.open-regels.nl/rules/');
  });
});
