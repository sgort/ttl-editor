import { TTLGenerator } from './ttlGenerator';

/**
 * dct:requires on the PublicService (CPSV-AP 3.2.0 PublicService.requires,
 * sh:class cpsv:PublicService), issue #223.
 *
 * The generator emits one property line per required service inside the
 * service block, and deliberately no `<uri> a cpsv:PublicService .` type stub:
 * PublicServiceShape targets that class, so a bare stub fails four minCount
 * checks, and it would publish an untitled service into the dataset. The
 * required service is described in its own graph; the single file-local
 * SHACL-CLASS error that remains is accepted (linked-data-explorer#315).
 * A service that requires nothing must generate exactly what it did before.
 */

const RECHT = 'https://regels.overheid.nl/services/recht-op-subsidie-thuisbatterij-flevoland';
const OTHER = 'https://example.org/services/other';
const OWN = 'https://regels.overheid.nl/services/hoogte-subsidie';

const baseState = (serviceOverrides = {}) => ({
  service: {
    identifier: 'hoogte-subsidie',
    name: 'Hoogte subsidie',
    description: '',
    thematicArea: '',
    sector: '',
    customSector: '',
    keywords: '',
    language: 'nl',
    requires: [],
    ...serviceOverrides,
  },
  organization: { identifier: '', name: '', homepage: '', spatial: '', logo: '' },
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
});

// The cpsv:PublicService block of the service itself: from its subject line to
// the first line that closes a statement.
const serviceBlock = (ttl) => {
  const start = ttl.indexOf(`<${OWN}> a cpsv:PublicService ;`);
  const end = ttl.indexOf(' .\n', start);
  return ttl.slice(start, end + 3);
};

describe('dct:requires on the public service', () => {
  test('emits one dct:requires line per entry inside the service block', () => {
    const ttl = new TTLGenerator(baseState({ requires: [RECHT, OTHER] })).generate();
    const block = serviceBlock(ttl);

    expect(block).toContain(`    dct:requires <${RECHT}> ;\n`);
    // The generator closes a block with "  ." (it drops only the trailing ";\n").
    expect(block).toMatch(new RegExp(`    dct:requires <${OTHER}>\\s+\\.\\n$`));
  });

  test('emits no cpsv:PublicService type stub for a required service', () => {
    const ttl = new TTLGenerator(baseState({ requires: [RECHT, OTHER] })).generate();

    expect(ttl).not.toContain(`<${RECHT}> a cpsv:PublicService`);
    expect(ttl).not.toContain(`<${OTHER}> a cpsv:PublicService`);
    // The service itself is still the one and only PublicService in the file.
    expect(ttl.match(/ a cpsv:PublicService/g)).toHaveLength(1);
  });

  test('empty requires generates exactly what it did before', () => {
    const withEmpty = new TTLGenerator(baseState({ requires: [] })).generate();
    const legacy = baseState();
    delete legacy.service.requires;
    const withoutKey = new TTLGenerator(legacy).generate();

    expect(withEmpty).toBe(withoutKey);
    expect(withEmpty).not.toContain('dct:requires');
  });

  test('missing requires key does not throw', () => {
    const legacy = baseState();
    delete legacy.service.requires;

    expect(() => new TTLGenerator(legacy).generate()).not.toThrow();
  });

  test('never emits the service as requiring itself', () => {
    const ttl = new TTLGenerator(baseState({ requires: [OWN, RECHT] })).generate();

    expect(ttl).not.toContain(`dct:requires <${OWN}>`);
    expect(ttl).toContain(`dct:requires <${RECHT}>`);
  });

  test('the closing line stays valid when requires is the last property', () => {
    const ttl = new TTLGenerator(baseState({ requires: [RECHT], language: '' })).generate();

    expect(serviceBlock(ttl)).toMatch(new RegExp(`dct:requires <${RECHT}>\\s+\\.\\n$`));
    expect(ttl).toContain(`dct:requires <${RECHT}>  .\n\n`);
  });
});
