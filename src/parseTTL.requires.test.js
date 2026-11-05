import parseTTLEnhanced from './parseTTL.enhanced';
import { generateTTL } from './utils/ttlGenerator';

/**
 * Reading dct:requires back (issue #223).
 *
 * The generator writes `dct:requires <uri>` inside the service block and a
 * bare `<uri> a cpsv:PublicService .` stub per entry after it. The parser keys
 * the service section off the PublicService type, so the stubs are the risk:
 * one must never become the service, and a required URI that happens to
 * contain a field name must not leak into that field through the parser's
 * loose `line.includes(...)` matching.
 */

const SERVICE = 'https://regels.overheid.nl/services/hoogte-subsidie-thuisbatterij-flevoland';
const RECHT = 'https://regels.overheid.nl/services/recht-op-subsidie-thuisbatterij-flevoland';
const OTHER = 'https://example.org/services/other';

const PREFIXES = `@prefix cpsv: <http://purl.org/vocab/cpsv#> .
@prefix cv: <http://data.europa.eu/m8g/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
`;

const serviceBlock = (requiresLines) => `
<${SERVICE}> a cpsv:PublicService ;
    dct:identifier "hoogte-subsidie-thuisbatterij-flevoland" ;
    dct:title "hoogte subsidie thuisbatterij Flevoland"@nl ;
    dct:description "Hoogte van de subsidie"@nl ;
    cv:thematicArea <https://example.org/theme/energy> ;
    cv:sector <https://example.org/classification/REGIONAL> ;
    dct:language <https://publications.europa.eu/resource/authority/language/NL> ;
${requiresLines}
    cv:hasCompetentAuthority <https://organisaties.overheid.nl/14866/Provincie_Flevoland> .
`;

const stub = (uri) => `\n<${uri}> a cpsv:PublicService .\n`;

const ORGANIZATION = `
<https://organisaties.overheid.nl/14866/Provincie_Flevoland> a cv:PublicOrganisation ;
    dct:identifier "Provincie_Flevoland" ;
    skos:prefLabel "Provincie Flevoland"@nl .
`;

const ttl = (requiresLines, { stubsBefore = [], stubsAfter = [] } = {}) =>
  PREFIXES +
  stubsBefore.map(stub).join('') +
  serviceBlock(requiresLines) +
  stubsAfter.map(stub).join('') +
  ORGANIZATION;

describe('parsing dct:requires', () => {
  test('reads one dct:requires per line into service.requires', () => {
    const parsed = parseTTLEnhanced(
      ttl(`    dct:requires <${RECHT}> ;\n    dct:requires <${OTHER}> ;`, {
        stubsAfter: [RECHT, OTHER],
      })
    );

    expect(parsed.service.requires).toEqual([RECHT, OTHER]);
  });

  test('reads a comma list on one line', () => {
    const parsed = parseTTLEnhanced(ttl(`    dct:requires <${RECHT}>, <${OTHER}> ;`));

    expect(parsed.service.requires).toEqual([RECHT, OTHER]);
  });

  test('a service without dct:requires parses to an empty list', () => {
    const parsed = parseTTLEnhanced(ttl(''));

    expect(parsed.service.requires).toEqual([]);
  });

  test('a requires URI containing field names does not leak into those fields', () => {
    const tricky =
      'https://example.org/services/sector-thematicArea-dct:title-dct:description-dct:language';
    const parsed = parseTTLEnhanced(ttl(`    dct:requires <${tricky}> ;`));

    expect(parsed.service.requires).toEqual([tricky]);
    expect(parsed.service.sector).toBe('https://example.org/classification/REGIONAL');
    expect(parsed.service.thematicArea).toBe('https://example.org/theme/energy');
    expect(parsed.service.name).toBe('hoogte subsidie thuisbatterij Flevoland');
    expect(parsed.service.description).toBe('Hoogte van de subsidie');
    expect(parsed.service.language).toBe('nl');
  });

  test('stubs after the service do not disturb it', () => {
    const parsed = parseTTLEnhanced(ttl(`    dct:requires <${RECHT}> ;`, { stubsAfter: [RECHT] }));

    expect(parsed.service.identifier).toBe('hoogte-subsidie-thuisbatterij-flevoland');
    expect(parsed.service.name).toBe('hoogte subsidie thuisbatterij Flevoland');
    expect(parsed.service.requires).toEqual([RECHT]);
    expect(parsed.organization.name).toBe('Provincie Flevoland');
  });

  test('a stub before the service block does not become the service', () => {
    const parsed = parseTTLEnhanced(ttl(`    dct:requires <${RECHT}> ;`, { stubsBefore: [RECHT] }));

    expect(parsed.service.identifier).toBe('hoogte-subsidie-thuisbatterij-flevoland');
    expect(parsed.service.name).toBe('hoogte subsidie thuisbatterij Flevoland');
    expect(parsed.service.requires).toEqual([RECHT]);
  });

  test('round trip keeps requires', () => {
    const first = parseTTLEnhanced(
      ttl(`    dct:requires <${RECHT}> ;\n    dct:requires <${OTHER}> ;`, {
        stubsAfter: [RECHT, OTHER],
      })
    );
    const noDmn = { isImported: false, importedDmnBlocks: null, fileName: '', content: '' };
    const second = parseTTLEnhanced(generateTTL({ ...first, dmnData: noDmn }));

    expect(second.service).toEqual(first.service);
    expect(second.service.requires).toEqual([RECHT, OTHER]);
  });
});
