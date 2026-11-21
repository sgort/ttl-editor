import parseTTLEnhanced from './parseTTL.enhanced';

/**
 * A block ends where its statement ends, decided outside literals (#258).
 *
 * The parser closed a temporal rule, parameter, concept, cost, output or
 * CPRMV rule on the first line containing a `.` and no `;` — anywhere on the
 * line, inside a quoted literal or an IRI included. Two failures followed:
 *
 * - a closing line whose literal contains `;` never closed the block, so the
 *   entity was never collected and the import silently dropped it;
 * - a continuation line with a `.` only inside an IRI (`<https://x.nl/a> ,`)
 *   closed the block early.
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

const rule = (id, description) => `
<https://regels.overheid.nl/rules/${id}> a cpsv:Rule, cprmv:TemporalRule ;
    dct:identifier "${id}" ;
    cprmv:validFrom "2025-01-01"^^xsd:date ;
    dct:description "${description}"@nl .
`;

describe('temporal rules', () => {
  test('a closing description containing ";" still ends the rule', () => {
    const { temporalRules } = parseTTLEnhanced(
      PREFIXES + rule('r1', 'Geldt voor aanvragers; zie artikel 2') + rule('r2', 'Tweede regel')
    );

    expect(temporalRules.map((r) => r.identifier)).toEqual(['r1', 'r2']);
    expect(temporalRules[0].description).toBe('Geldt voor aanvragers; zie artikel 2');
  });

  test('a description with "." mid-text on a line that continues does not end the rule', () => {
    const ttl = `${PREFIXES}
<https://regels.overheid.nl/rules/r3> a cpsv:Rule, cprmv:TemporalRule ;
    dct:description "Zie art. 2. Daarna art. 3."@nl ;
    dct:identifier "r3" .
`;
    const [r3] = parseTTLEnhanced(ttl).temporalRules;

    expect(r3.identifier).toBe('r3');
    expect(r3.description).toBe('Zie art. 2. Daarna art. 3.');
  });
});

describe('parameters', () => {
  test('a closing description containing ";" still ends the parameter', () => {
    const parameter = (notation, description) => `
<https://regels.overheid.nl/parameters/s/${notation}> a ronl:ParameterWaarde ;
    skos:notation "${notation}" ;
    schema:value "100.00"^^xsd:decimal ;
    dct:description "${description}"@nl .
`;
    const { parameters } = parseTTLEnhanced(
      PREFIXES + parameter('P1', 'Grens; per jaar') + parameter('P2', 'Andere grens')
    );

    expect(parameters.map((p) => p.notation)).toEqual(['P1', 'P2']);
  });
});

describe('concepts', () => {
  test('a closing definition containing ";" still ends the concept', () => {
    const concept = (name, definition) => `
<https://regels.overheid.nl/concepts/s/${name}> a skos:Concept ;
    skos:prefLabel "${name}"@nl ;
    skos:definition "${definition}"@nl .
`;
    const { concepts } = parseTTLEnhanced(
      PREFIXES + concept('inkomen', 'Het inkomen; per maand') + concept('leeftijd', 'In jaren')
    );

    expect(concepts.map((c) => c.prefLabel)).toEqual(['inkomen', 'leeftijd']);
  });
});

describe('CPRMV rules', () => {
  test('a closing legal text containing ";" still ends the rule', () => {
    const cprmvRule = (id, norm) => `
<https://cprmv.open-regels.nl/rules/${id}> a cprmv:Rule ;
    cprmv:id "${id}" ;
    cprmv:rulesetId "BWBR0015703" ;
    cprmv:definition "${norm}"@nl .
`;
    const { cprmvRules } = parseTTLEnhanced(
      PREFIXES +
        cprmvRule('aa', 'inkomsten uit arbeid; met een maximum van € 176,35 per maand') +
        cprmvRule('ab', 'premies')
    );

    expect(cprmvRules.map((r) => r.ruleId)).toEqual(['aa', 'ab']);
  });

  test('a continuation line with "." only inside an IRI does not end the rule', () => {
    const ttl = `${PREFIXES}
<https://cprmv.open-regels.nl/rules/ac> a cprmv:Rule ;
    dct:source <https://wetten.overheid.nl/a> ,
        <https://wetten.overheid.nl/b> ;
    cprmv:id "ac" .
`;
    const [ac] = parseTTLEnhanced(ttl).cprmvRules;

    expect(ac.ruleId).toBe('ac');
  });
});

describe('statement ends that already worked', () => {
  test('a full stop on its own line, after a typed literal, or before a comment', () => {
    const ttl = `${PREFIXES}
<https://regels.overheid.nl/rules/r4> a cpsv:Rule, cprmv:TemporalRule ;
    dct:identifier "r4"
    .

<https://regels.overheid.nl/rules/r5> a cpsv:Rule, cprmv:TemporalRule ;
    dct:identifier "r5" ;
    cprmv:validFrom "2025-01-01"^^xsd:date .

<https://regels.overheid.nl/rules/r6> a cpsv:Rule, cprmv:TemporalRule ;
    dct:identifier "r6" . # end of r6
`;
    const { temporalRules } = parseTTLEnhanced(ttl);

    expect(temporalRules.map((r) => r.identifier)).toEqual(['r4', 'r5', 'r6']);
  });
});
