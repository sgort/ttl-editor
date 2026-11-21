import parseTTLEnhanced from './parseTTL.enhanced';

/**
 * Bare-named predicates are matched in the predicate position (#225).
 *
 * The parser used to read a field from any line *containing* its local name
 * (`line.includes('sector')`) and took the value after the first occurrence.
 * A value that merely contains the name — a URI path `/sector/`, a description
 * that mentions "sector" or "extends" — was then read as that field, and the
 * next export wrote it back out as an invalid IRI. Prefixed names
 * (`dct:title`) rarely occur inside values; the bare ones (sector,
 * thematicArea, validFrom, validUntil, extends, confidence) do.
 */

const PREFIXES = `@prefix cpsv: <http://purl.org/vocab/cpsv#> .
@prefix cv: <http://data.europa.eu/m8g/> .
@prefix cprmv: <https://cprmv.open-regels.nl/0.3.0/> .
@prefix ronl: <https://regels.overheid.nl/termen/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix schema: <http://schema.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
`;

const SERVICE = 'https://regels.overheid.nl/services/subsidie-flevoland';

const service = (lines) =>
  `${PREFIXES}
<${SERVICE}> a cpsv:PublicService ;
    dct:identifier "subsidie-flevoland" ;
    dct:title "Subsidie Flevoland"@nl ;
${lines}
    dct:language <https://publications.europa.eu/resource/authority/language/NLD> .
`;

describe('service: sector and thematic area', () => {
  test('a sector URI that contains "sector" is read whole', () => {
    const { service: s } = parseTTLEnhanced(
      service('    cv:sector <https://example.org/sector/REGIONAL> ;')
    );

    expect(s.sector).toBe('https://example.org/sector/REGIONAL');
  });

  test('a description mentioning "sector" does not become the sector', () => {
    // Without a cv:sector line, nothing overwrites the bad value: it used to
    // become "in", and the next export wrote `cv:sector <in>`.
    const { service: s } = parseTTLEnhanced(
      service('    dct:description "Subsidie voor de publieke sector in Flevoland"@nl ;')
    );

    expect(s.description).toBe('Subsidie voor de publieke sector in Flevoland');
    expect(s.sector).toBe('');
  });

  test('a description mentioning "thematicArea" does not become the thematic area', () => {
    const { service: s } = parseTTLEnhanced(
      service('    dct:description "Zie thematicArea hieronder"@nl ;')
    );

    expect(s.thematicArea).toBe('');
  });

  test('a description after the sector line leaves the sector alone', () => {
    const { service: s } = parseTTLEnhanced(
      service(
        [
          '    cv:thematicArea <https://example.org/theme/energy> ;',
          '    cv:sector <https://example.org/classification/REGIONAL> ;',
          '    dct:description "Over de thematicArea en de sector"@nl ;',
        ].join('\n')
      )
    );

    expect(s.thematicArea).toBe('https://example.org/theme/energy');
    expect(s.sector).toBe('https://example.org/classification/REGIONAL');
  });

  test('a sector URI inside a required service does not leak into the sector', () => {
    const { service: s } = parseTTLEnhanced(
      service('    dct:requires <https://example.org/sector/services/other> ;')
    );

    expect(s.sector).toBe('');
  });
});

const RULE = `${PREFIXES}
<https://regels.overheid.nl/rules/r1> a cpsv:Rule, cprmv:TemporalRule ;
    dct:identifier "r1" ;
    dct:title "Regel 1"@nl ;
    cprmv:isBasedOn <https://wetten.overheid.nl/BWBR0000001/Artikel_1> ;
    cprmv:validFrom "2025-01-01"^^xsd:date ;
    cprmv:validUntil "2025-12-31"^^xsd:date ;
    cprmv:confidenceLevel "medium" ;
    dct:description "Deze regel extends de vorige, validFrom en validUntil volgen de wet, confidence laag"@nl .
`;

describe('temporal rule', () => {
  test('a description naming the bare predicates does not overwrite them', () => {
    const [rule] = parseTTLEnhanced(RULE).temporalRules;

    expect(rule.extends).toBe('https://wetten.overheid.nl/BWBR0000001/Artikel_1');
    expect(rule.validFrom).toBe('2025-01-01');
    expect(rule.validUntil).toBe('2025-12-31');
    expect(rule.confidenceLevel).toBe('medium');
  });

  test('legacy ronl: and cprmv:extends / cprmv:confidence forms are still read', () => {
    const legacy = `${PREFIXES}
<https://regels.overheid.nl/rules/r2> a cpsv:Rule, ronl:TemporalRule ;
    dct:identifier "r2" ;
    ronl:extends <https://wetten.overheid.nl/BWBR0000002/Artikel_2> ;
    ronl:validFrom "2024-01-01"^^xsd:date ;
    ronl:validUntil "2024-12-31"^^xsd:date ;
    cprmv:confidence "low" .
`;
    const [rule] = parseTTLEnhanced(legacy).temporalRules;

    expect(rule.extends).toBe('https://wetten.overheid.nl/BWBR0000002/Artikel_2');
    expect(rule.validFrom).toBe('2024-01-01');
    expect(rule.validUntil).toBe('2024-12-31');
    expect(rule.confidenceLevel).toBe('low');
  });
});

describe('parameter', () => {
  test('a description naming validFrom / validUntil does not overwrite them', () => {
    const ttl = `${PREFIXES}
<https://regels.overheid.nl/parameters/s/p1> a ronl:ParameterWaarde ;
    skos:prefLabel "Grens"@nl ;
    skos:notation "GRENS" ;
    schema:value "100.00"^^xsd:decimal ;
    ronl:validFrom "2024-01-01"^^xsd:date ;
    ronl:validUntil "2024-12-31"^^xsd:date ;
    dct:description "Let op: validFrom wijkt af, validUntil ook"@nl .
`;
    const [parameter] = parseTTLEnhanced(ttl).parameters;

    expect(parameter.validFrom).toBe('2024-01-01');
    expect(parameter.validUntil).toBe('2024-12-31');
  });
});
