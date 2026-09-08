import { TTLGenerator } from './ttlGenerator';

/**
 * Which sections the generator emits, and the guards that decide.
 *
 * The other ttlGenerator.*.test.js files each take one narrow subject —
 * cell grounding, the date axis, the CPRMV target version. This one covers the
 * skeleton they all sit in: `generate()` assembles a dozen optional sections,
 * each behind its own condition, and every section method guards itself again.
 *
 * The shape of the tests is deliberate. Two contrasting states — one with every
 * field populated, one with every field empty — drive both sides of most of
 * those conditions at once, and the targeted tests below them cover the
 * decisions that are more than present-or-absent: a listed sector versus a
 * custom one, an embedded logo versus a linked one, a temporal rule with
 * nothing in it.
 */

const emptyState = () => ({
  service: {
    identifier: '',
    name: '',
    description: '',
    thematicArea: '',
    sector: '',
    customSector: '',
    keywords: '',
    language: 'nl',
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

const fullState = () => ({
  ...emptyState(),
  service: {
    identifier: 'zorgtoeslag',
    name: 'Zorgtoeslag',
    description: 'Tegemoetkoming in de kosten',
    thematicArea: 'https://example.org/thematic/social',
    sector: 'https://example.org/sector/NATIONAL',
    customSector: '',
    keywords: 'zorg, toeslag',
    language: 'nl',
  },
  organization: {
    identifier: 'svb',
    name: 'SVB',
    homepage: 'https://svb.nl',
    spatial: 'https://example.org/nl',
    logo: 'https://svb.nl/logo.png',
  },
  legalResource: {
    bwbId: 'BWBR0018451',
    version: '2026-01-01',
    title: 'Zorgtoeslagwet',
    description: 'De wet',
  },
  ronlAnalysis: 'https://regels.overheid.nl/termen/analysis',
  ronlMethod: 'https://regels.overheid.nl/termen/method',
  temporalRules: [
    {
      id: 1,
      identifier: 'r1',
      title: 'Regel 1',
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      confidenceLevel: 'high',
      description: 'Een regel',
    },
  ],
  parameters: [{ id: 1, identifier: 'p1', name: 'leeftijd', value: '18', description: 'Leeftijd' }],
  cprmvRules: [
    {
      ruleId: 'onderdeel a.',
      rulesetId: 'BWBR0015703',
      definition: 'een alleenstaande: € 345,99;',
      situatie: 'een alleenstaande',
      norm: '345,99',
      ruleIdPath: 'BWBR0015703_2026-04-03_0, Artikel 20, lid 1, onderdeel a.',
    },
  ],
  concepts: [
    {
      id: 1,
      variableName: 'leeftijd',
      uri: 'https://example.org/concepts/leeftijd',
      linkedToType: 'input',
      prefLabel: 'Leeftijd',
    },
  ],
  cost: { identifier: 'cost-1', value: '0', currency: 'EUR', description: 'Gratis' },
  output: {
    identifier: 'out-1',
    name: 'Besluit',
    description: 'Het besluit',
    type: 'https://example.org/Decision',
  },
  dmnData: {
    isImported: false,
    importedDmnBlocks: null,
    fileName: 'zorg.dmn',
    content: '<definitions />',
    decisionKey: 'BepaalRecht',
    deployed: true,
  },
  vendorService: {
    selectedVendor: 'https://example.org/vendor',
    contact: { organizationName: 'Vendor BV' },
    technical: { accessType: 'fair-use' },
    certification: { status: 'not-certified' },
  },
});

const generate = (state) => new TTLGenerator(state).generate();

/** Section headers are a fixed banner shape, so the title alone identifies one. */
const hasSection = (ttl, title) => ttl.includes(`#  ${title}\n`);

describe('generate() section assembly', () => {
  test('an empty state produces namespaces and nothing else', () => {
    const ttl = generate(emptyState());

    expect(ttl).toContain('@prefix cprmv:');
    for (const title of [
      'Public Service',
      'Cost',
      'Output',
      'Organization',
      'Legal Resource',
      'Temporal Rules',
      'Parameters',
      'CPRMV RuleSet',
      'CPRMV Rules',
      'DMN Decision Model',
      'Vendor Service',
    ]) {
      expect(hasSection(ttl, title), `${title} should be absent for an empty state`).toBe(false);
    }
  });

  test('a fully populated state emits every section', () => {
    const ttl = generate(fullState());

    for (const title of [
      'Public Service',
      'Cost',
      'Output',
      'Organization',
      'Legal Resource',
      'Temporal Rules',
      'Parameters',
      'CPRMV RuleSet',
      'CPRMV Rules',
      'DMN Decision Model',
      'Vendor Service',
    ]) {
      expect(hasSection(ttl, title), `${title} should be present for a full state`).toBe(true);
    }
  });

  test('the 0.3.2 target swaps the RuleSet wrapper for a Dataset one', () => {
    const ttl = generate({ ...fullState(), cprmvVersion: '0.3.2' });

    expect(hasSection(ttl, 'CPRMV Dataset')).toBe(true);
    expect(hasSection(ttl, 'CPRMV RuleSet')).toBe(false);
    // Flat rules are emitted for both targets.
    expect(hasSection(ttl, 'CPRMV Rules')).toBe(true);
  });

  test('an unrecognised CPRMV version falls back to the default namespace', () => {
    const ttl = generate({ ...fullState(), cprmvVersion: '9.9.9' });

    expect(ttl).toContain('standards/cprmv/0.4.1#');
  });
});

describe('service identifier', () => {
  test('an identifier that sanitises away still yields a usable service URI', () => {
    // sanitizeServiceIdentifier can strip an identifier to nothing; the URI has
    // to remain well-formed or every subject in the document is broken.
    const gen = new TTLGenerator({
      ...fullState(),
      service: { identifier: '///', language: 'nl' },
    });

    expect(gen.serviceUri).toBe('https://regels.overheid.nl/services/unknown-service');
  });

  test('the section is empty without an identifier, whatever else is set', () => {
    const state = fullState();
    state.service = { ...state.service, identifier: '' };

    expect(new TTLGenerator(state).generateServiceSection()).toBe('');
  });
});

describe('service sector', () => {
  const sectorOf = (service) =>
    new TTLGenerator({
      ...fullState(),
      service: { ...fullState().service, ...service },
    }).generateServiceSection();

  test('a listed sector is emitted as its own URI', () => {
    expect(sectorOf({ sector: 'https://example.org/sector/LOCAL' })).toContain(
      'cv:sector <https://example.org/sector/LOCAL>'
    );
  });

  test('the custom sector URI is used when "custom" is chosen', () => {
    expect(
      sectorOf({ sector: 'custom', customSector: 'https://example.org/own-sector' })
    ).toContain('cv:sector <https://example.org/own-sector>');
  });

  test('"custom" with nothing filled in emits no sector at all', () => {
    // Rather than cv:sector <custom>, which would be a broken URI in the
    // published graph.
    expect(sectorOf({ sector: 'custom', customSector: '' })).not.toContain('cv:sector');
  });

  test('no sector emits none', () => {
    expect(sectorOf({ sector: '' })).not.toContain('cv:sector');
  });
});

describe('organization logo', () => {
  const logoOf = (logo) =>
    new TTLGenerator({
      ...fullState(),
      organization: { ...fullState().organization, logo },
    }).generateOrganizationSection();

  test('an embedded logo is published as an asset reference, not inlined', () => {
    // A base64 data URL would bloat the graph; the file is uploaded to TriplyDB
    // separately and referenced by path.
    const ttl = logoOf('data:image/png;base64,iVBORw0KGgo=');

    expect(ttl).toContain('foaf:logo <./assets/');
    expect(ttl).toContain('schema:image <./assets/');
    expect(ttl).not.toContain('base64');
  });

  test('a hosted logo is linked directly', () => {
    const ttl = logoOf('https://svb.nl/logo.png');

    expect(ttl).toContain('foaf:logo <https://svb.nl/logo.png>');
    expect(ttl).toContain('schema:image <https://svb.nl/logo.png>');
  });

  test('no logo emits neither predicate', () => {
    const ttl = logoOf('');

    expect(ttl).not.toContain('foaf:logo');
    expect(ttl).not.toContain('schema:image');
  });

  test('the section is empty without an organization identifier', () => {
    const state = fullState();
    state.organization = { ...state.organization, identifier: '' };

    expect(new TTLGenerator(state).generateOrganizationSection()).toBe('');
  });
});

describe('legal resource', () => {
  test('the section is empty without a bwbId', () => {
    const state = fullState();
    state.legalResource = { ...state.legalResource, bwbId: '' };

    expect(new TTLGenerator(state).generateLegalResourceSection()).toBe('');
  });

  test('the section is empty when there is no legal resource at all', () => {
    const state = fullState();
    state.legalResource = undefined;

    expect(new TTLGenerator(state).generateLegalResourceSection()).toBe('');
  });

  test('RONL analysis and method are wrapped as URIs when they are absolute', () => {
    const ttl = new TTLGenerator(fullState()).generateLegalResourceSection();

    expect(ttl).toContain('cprmv:hasAnalysis <https://regels.overheid.nl/termen/analysis>');
    expect(ttl).toContain('cprmv:hasMethod <https://regels.overheid.nl/termen/method>');
  });

  test('a prefixed RONL term is emitted as-is, without angle brackets', () => {
    // A CURIE is already a valid object; wrapping it would produce a relative
    // IRI that resolves against the document rather than the vocabulary.
    const ttl = new TTLGenerator({
      ...fullState(),
      ronlAnalysis: 'ronl:SomeAnalysis',
      ronlMethod: 'ronl:SomeMethod',
    }).generateLegalResourceSection();

    expect(ttl).toContain('cprmv:hasAnalysis ronl:SomeAnalysis');
    expect(ttl).toContain('cprmv:hasMethod ronl:SomeMethod');
  });

  test('neither predicate appears when the terms are unset', () => {
    const ttl = new TTLGenerator({
      ...fullState(),
      ronlAnalysis: '',
      ronlMethod: '',
    }).generateLegalResourceSection();

    expect(ttl).not.toContain('cprmv:hasAnalysis');
    expect(ttl).not.toContain('cprmv:hasMethod');
  });
});

describe('temporal rules', () => {
  const rulesOf = (temporalRules) =>
    new TTLGenerator({ ...fullState(), temporalRules }).generateTemporalRulesSection();

  test('a rule with no meaningful field is skipped entirely', () => {
    // Adding a row and leaving it blank is normal while authoring; an empty
    // cpsv:Rule subject in the published graph is not.
    expect(rulesOf([{ id: 1 }])).toBe('');
  });

  test('any single populated field is enough to emit the rule', () => {
    expect(rulesOf([{ id: 1, description: 'Alleen een beschrijving' }])).toContain(
      'a cpsv:Rule, cprmv:TemporalRule'
    );
  });

  test('a rule without a URI gets one derived from its position', () => {
    const ttl = rulesOf([
      { id: 1, title: 'Eerste' },
      { id: 2, title: 'Tweede' },
    ]);

    expect(ttl).toContain('<https://regels.overheid.nl/rules/rule1>');
    expect(ttl).toContain('<https://regels.overheid.nl/rules/rule2>');
  });

  test('a rule that carries its own URI keeps it', () => {
    const ttl = rulesOf([{ id: 1, uri: 'https://example.org/rules/mine', title: 'Eigen' }]);

    expect(ttl).toContain('<https://example.org/rules/mine>');
    expect(ttl).not.toContain('regels.overheid.nl/rules/rule1');
  });
});

describe('the DMN gate', () => {
  const hasDMN = (dmnData) => new TTLGenerator({ ...fullState(), dmnData }).hasDMN();

  test('an uploaded model needs both a file name and content', () => {
    expect(hasDMN({ fileName: 'x.dmn', content: '<definitions />' })).toBeTruthy();
    expect(hasDMN({ fileName: 'x.dmn', content: '' })).toBeFalsy();
    expect(hasDMN({ fileName: '', content: '<definitions />' })).toBeFalsy();
  });

  test('an imported model needs both the flag and the blocks', () => {
    expect(hasDMN({ isImported: true, importedDmnBlocks: '<dmn />' })).toBeTruthy();
    expect(hasDMN({ isImported: true, importedDmnBlocks: null })).toBeFalsy();
    expect(hasDMN({ isImported: false, importedDmnBlocks: '<dmn />' })).toBeFalsy();
  });

  test('neither source means no DMN section and no concepts section', () => {
    const ttl = generate({
      ...fullState(),
      dmnData: { isImported: false, importedDmnBlocks: null, fileName: '', content: '' },
    });

    expect(hasSection(ttl, 'DMN Decision Model')).toBe(false);
    expect(ttl).not.toContain('NL-SBB Concept Definitions');
  });
});

describe('the vendor service gate', () => {
  const hasVendor = (vendorService) =>
    new TTLGenerator({ ...fullState(), vendorService }).hasVendorService();

  test('a selected vendor enables the section', () => {
    expect(hasVendor({ selectedVendor: 'https://example.org/vendor' })).toBeTruthy();
  });

  test('an empty or whitespace-only selection does not', () => {
    // The select's placeholder option submits '', and a trimmed-empty value
    // would otherwise produce a vendor block with no vendor.
    expect(hasVendor({ selectedVendor: '' })).toBeFalsy();
    expect(hasVendor({ selectedVendor: '   ' })).toBeFalsy();
  });

  test('an absent vendorService does not', () => {
    expect(hasVendor(undefined)).toBeFalsy();
    expect(hasVendor({})).toBeFalsy();
  });
});
