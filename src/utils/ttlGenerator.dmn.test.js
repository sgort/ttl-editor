import { TTLGenerator } from './ttlGenerator';

/**
 * The DMN section for a locally uploaded model.
 *
 * An imported model takes a different path entirely — its preserved blocks are
 * stripped and normalised rather than regenerated — so this file is about the
 * other branch: a model uploaded, deployed, tested and validated in this editor,
 * where every piece of that history is optional and each becomes a predicate
 * only once it exists.
 *
 * The validation metadata is the part worth guarding. It says who signed off on
 * a decision model and when, it is published into the graph, and it is emitted
 * only when the status is something other than the default 'not-validated' —
 * otherwise every service would carry a meaningless claim of non-validation.
 */

const baseState = () => ({
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
});

/** The minimum that makes hasDMN() true for an uploaded model. */
const bareDmn = {
  isImported: false,
  importedDmnBlocks: null,
  fileName: 'zorgtoeslag.dmn',
  content: '<definitions />',
  decisionKey: '',
  deploymentId: null,
  deployedAt: null,
  apiEndpoint: '',
  lastTestResult: null,
  lastTestTimestamp: null,
  validationStatus: 'not-validated',
  validatedBy: '',
  validatedAt: '',
  validationNote: '',
};

const deployedDmn = {
  ...bareDmn,
  decisionKey: 'BepaalRechtEnHoogte',
  deploymentId: 'dep-42',
  deployedAt: '2026-09-01T10:00:00Z',
  apiEndpoint: 'https://operaton.open-regels.nl/engine-rest',
  lastTestResult: { zorgtoeslag: 1150 },
  lastTestTimestamp: '2026-09-01T10:05:00Z',
  validationStatus: 'validated',
  validatedBy: 'https://example.org/org/svb',
  validatedAt: '2026-09-02',
  validationNote: 'Gecontroleerd tegen de tabellen',
};

const dmnOf = (dmnData) => new TTLGenerator({ ...baseState(), dmnData }).generateDmnSection();

describe('DMN section for an uploaded model', () => {
  test('a bare upload emits the model and nothing it has not done yet', () => {
    const ttl = dmnOf(bareDmn);

    expect(ttl).toContain('a cprmv:DecisionModel');
    expect(ttl).toContain('dct:title "zorgtoeslag.dmn"@nl');
    expect(ttl).not.toContain('cprmv:deploymentId');
    expect(ttl).not.toContain('cprmv:deployedAt');
    expect(ttl).not.toContain('cprmv:implementedBy');
    expect(ttl).not.toContain('cprmv:lastTested');
    expect(ttl).not.toContain('ronl:validationStatus');
  });

  test('an unnamed decision falls back to "unknown" rather than an empty identifier', () => {
    expect(dmnOf(bareDmn)).toContain('dct:identifier "unknown"');
  });

  test('a deployed and tested model records where, when and with what result', () => {
    const ttl = dmnOf(deployedDmn);

    expect(ttl).toContain('dct:identifier "BepaalRechtEnHoogte"');
    expect(ttl).toContain('cprmv:deploymentId "dep-42"');
    expect(ttl).toContain('cprmv:deployedAt "2026-09-01T10:00:00Z"^^xsd:dateTime');
    expect(ttl).toContain('cprmv:implementedBy <https://operaton.open-regels.nl/engine-rest>');
    expect(ttl).toContain('cprmv:lastTested "2026-09-01T10:05:00Z"^^xsd:dateTime');
    expect(ttl).toContain('cprmv:testStatus "passed"');
  });

  test('a test result without a timestamp records neither', () => {
    // Both halves are required: an undated test is not evidence of anything.
    const ttl = dmnOf({ ...deployedDmn, lastTestTimestamp: null });

    expect(ttl).not.toContain('cprmv:lastTested');
    expect(ttl).not.toContain('cprmv:testStatus');
  });

  test('a timestamp without a result records neither', () => {
    const ttl = dmnOf({ ...deployedDmn, lastTestResult: null });

    expect(ttl).not.toContain('cprmv:lastTested');
  });
});

describe('DMN validation metadata', () => {
  test('a validated model publishes who validated it and when', () => {
    const ttl = dmnOf(deployedDmn);

    expect(ttl).toContain('ronl:validationStatus "validated"^^xsd:string');
    expect(ttl).toContain('ronl:validatedBy <https://example.org/org/svb>');
    expect(ttl).toContain('ronl:validatedAt "2026-09-02"^^xsd:date');
    expect(ttl).toContain('ronl:validationNote "Gecontroleerd tegen de tabellen"@nl');
  });

  test('the default status publishes nothing at all', () => {
    // 'not-validated' is what every model starts as, so emitting it would put a
    // meaningless claim in every published graph.
    const ttl = dmnOf({ ...deployedDmn, validationStatus: 'not-validated' });

    expect(ttl).not.toContain('ronl:validationStatus');
    expect(ttl).not.toContain('ronl:validatedBy');
    expect(ttl).not.toContain('ronl:validatedAt');
    expect(ttl).not.toContain('ronl:validationNote');
  });

  test('an empty status publishes nothing either', () => {
    expect(dmnOf({ ...deployedDmn, validationStatus: '' })).not.toContain('ronl:validationStatus');
  });

  test('a status with no supporting detail publishes only the status', () => {
    const ttl = dmnOf({
      ...deployedDmn,
      validationStatus: 'in-review',
      validatedBy: '   ',
      validatedAt: '  ',
      validationNote: ' ',
    });

    expect(ttl).toContain('ronl:validationStatus "in-review"');
    expect(ttl).not.toContain('ronl:validatedBy');
    expect(ttl).not.toContain('ronl:validatedAt');
    expect(ttl).not.toContain('ronl:validationNote');
  });
});

describe('the two DMN sources', () => {
  test('an imported model takes the preservation path, not the generator', () => {
    // Imported blocks are normalised rather than rebuilt, so none of the
    // deployment predicates above appear even when the fields are set.
    const ttl = dmnOf({
      ...deployedDmn,
      isImported: true,
      importedDmnBlocks: '<https://example.org/svc/dmn> a cprmv:DecisionModel .\n',
    });

    expect(ttl).not.toContain('cprmv:deploymentId');
    expect(ttl).toContain('cprmv:DecisionModel');
  });

  test('neither source produces nothing', () => {
    expect(dmnOf({ ...bareDmn, fileName: '', content: '' })).toBeFalsy();
  });
});
