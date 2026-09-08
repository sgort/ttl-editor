import { TTLGenerator } from './ttlGenerator';

/**
 * The per-entity sections: parameters, cost, output and the vendor service.
 *
 * Each is built the same way — a subject line, then one optional predicate per
 * populated field — so the interesting behaviour is uniformly what happens to
 * the fields that are *not* filled in. An empty field must produce no triple at
 * all rather than a triple with an empty literal, because the published graph is
 * validated against CPSV-AP shapes and an empty object is not the same as an
 * absent one.
 *
 * ttlGenerator.sections.test.js covers which sections appear; this covers what
 * goes inside them.
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

const gen = (overrides) => new TTLGenerator({ ...baseState(), ...overrides });

describe('parameters', () => {
  const paramsOf = (parameters) => gen({ parameters }).generateParametersSection();

  test('a parameter with a label, notation, value and unit emits all four', () => {
    const ttl = paramsOf([
      { id: 1, label: 'Leeftijdsgrens', notation: 'AOW-leeftijd', value: '67', unit: 'JAR' },
    ]);

    expect(ttl).toContain('a cprmv:ParameterWaarde');
    expect(ttl).toContain('skos:prefLabel "Leeftijdsgrens"@nl');
    expect(ttl).toContain('skos:notation "AOW-leeftijd"');
    expect(ttl).toContain('schema:value "67"^^xsd:decimal');
    expect(ttl).toContain('schema:unitCode "JAR"');
  });

  test('a parameter with none of notation, value or label is skipped', () => {
    // A blank row left behind while authoring must not become a subject.
    expect(paramsOf([{ id: 1, unit: 'JAR' }])).toBe('');
  });

  test('any one of notation, value or label is enough', () => {
    expect(paramsOf([{ id: 1, label: 'Alleen label' }])).toContain('cprmv:ParameterWaarde');
    expect(paramsOf([{ id: 1, notation: 'alleen-notatie' }])).toContain('cprmv:ParameterWaarde');
    expect(paramsOf([{ id: 1, value: '1' }])).toContain('cprmv:ParameterWaarde');
  });

  test('unset fields emit no predicate rather than an empty literal', () => {
    const ttl = paramsOf([{ id: 1, value: '67' }]);

    expect(ttl).not.toContain('skos:prefLabel');
    expect(ttl).not.toContain('skos:notation');
    expect(ttl).not.toContain('schema:unitCode');
  });

  test('parameter URIs are numbered by position and scoped to the service', () => {
    const ttl = paramsOf([
      { id: 9, value: '1' },
      { id: 4, value: '2' },
    ]);

    expect(ttl).toContain('/parameters/zorgtoeslag/param-1');
    expect(ttl).toContain('/parameters/zorgtoeslag/param-2');
  });

  test('parameters fall back to a generic path when the service has no identifier', () => {
    const ttl = new TTLGenerator({
      ...baseState(),
      service: { identifier: '', language: 'nl' },
      parameters: [{ id: 1, value: '1' }],
    }).generateParametersSection();

    expect(ttl).toContain('/parameters/service/param-1');
  });
});

describe('cost', () => {
  const costOf = (cost) => gen({ cost }).generateCostSection();

  test('is empty without an identifier', () => {
    expect(costOf({ identifier: '', value: '10', description: 'x' })).toBe('');
  });

  test('emits the identifier alone when nothing else is set', () => {
    const ttl = costOf({ identifier: 'cost-1', value: '', currency: 'EUR', description: '' });

    expect(ttl).toContain('a cv:Cost');
    expect(ttl).toContain('dct:identifier "cost-1"');
    expect(ttl).not.toContain('cv:value');
  });

  test('emits the value when it is set', () => {
    const ttl = costOf({
      identifier: 'cost-1',
      value: '0',
      currency: 'EUR',
      description: 'Gratis',
    });

    expect(ttl).toContain('cv:value "0"');
  });

  test('percent-encodes an identifier that is not URI-safe', () => {
    // The identifier becomes the last segment of the cost URI, so a space or
    // slash would otherwise produce an invalid subject.
    expect(costOf({ identifier: 'kosten 2026', value: '', description: '' })).toContain(
      '/costs/kosten%202026'
    );
  });
});

describe('output', () => {
  const outputOf = (output) => gen({ output }).generateOutputSection();

  test('is empty without an identifier', () => {
    expect(outputOf({ identifier: '', name: 'Besluit', description: '', type: '' })).toBe('');
  });

  test('emits title, description and type when they are set', () => {
    const ttl = outputOf({
      identifier: 'out-1',
      name: 'Besluit',
      description: 'Het besluit',
      type: 'https://example.org/Decision',
    });

    expect(ttl).toContain('a cv:Output');
    expect(ttl).toContain('dct:title "Besluit"@nl');
    expect(ttl).toContain('dct:description "Het besluit"@nl');
    expect(ttl).toContain('dct:type <https://example.org/Decision>');
  });

  test('emits none of them when they are unset', () => {
    const ttl = outputOf({ identifier: 'out-1', name: '', description: '', type: '' });

    expect(ttl).toContain('dct:identifier "out-1"');
    expect(ttl).not.toContain('dct:title');
    expect(ttl).not.toContain('dct:description');
    expect(ttl).not.toContain('dct:type');
  });
});

describe('vendor service', () => {
  const fullVendor = {
    selectedVendor: 'https://example.org/vendors/Blueriq',
    contact: {
      organizationName: 'Blueriq BV',
      contactPerson: 'A. Persoon',
      email: 'a@blueriq.example',
      phone: '0600000000',
      website: 'https://blueriq.example',
      logo: 'data:image/png;base64,x',
    },
    serviceNotes: 'Draait in productie',
    technical: {
      serviceUrl: 'https://api.blueriq.example',
      license: 'EUPL-1.2',
      accessType: 'iam-required',
    },
    certification: {
      status: 'certified',
      certifiedBy: 'https://example.org/certifier',
      certifiedAt: '2026-01-01',
      certificationNote: 'Gecontroleerd',
    },
  };

  const bareVendor = {
    selectedVendor: 'https://example.org/vendors/Blueriq',
    contact: {
      organizationName: '',
      contactPerson: '',
      email: '',
      phone: '',
      website: '',
      logo: '',
    },
    serviceNotes: '   ',
    technical: { serviceUrl: '', license: '', accessType: '' },
    certification: {
      status: 'not-certified',
      certifiedBy: '',
      certifiedAt: '',
      certificationNote: '',
    },
  };

  const vendorOf = (vendorService) => gen({ vendorService }).generateVendorServiceSection();

  test('a fully described vendor emits contact, contact point, technical and certification', () => {
    const ttl = vendorOf(fullVendor);

    expect(ttl).toContain('a ronl:VendorService');
    expect(ttl).toContain('ronl:implementedBy <https://example.org/vendors/Blueriq>');
    expect(ttl).toContain('schema:provider [');
    expect(ttl).toContain('schema:name "Blueriq BV"');
    expect(ttl).toContain('schema:contactPoint [');
    expect(ttl).toContain('schema:email "a@blueriq.example"');
    expect(ttl).toContain('schema:telephone "0600000000"');
    expect(ttl).toContain('foaf:homepage <https://blueriq.example>');
    expect(ttl).toContain('schema:url <https://api.blueriq.example>');
    expect(ttl).toContain('schema:license "EUPL-1.2"');
    expect(ttl).toContain('ronl:accessType "iam-required"');
    expect(ttl).toContain('dct:description "Draait in productie"@nl');
  });

  test('a vendor logo becomes an asset path named after the vendor', () => {
    // Same reasoning as the organization logo: the image is uploaded separately
    // and referenced, never inlined as base64.
    const ttl = vendorOf(fullVendor);

    expect(ttl).toContain('schema:image <./assets/Blueriq_vendor_logo.png>');
    expect(ttl).not.toContain('base64');
  });

  test('certification metadata is emitted only once the status is not "not-certified"', () => {
    const ttl = vendorOf(fullVendor);

    expect(ttl).toContain('ronl:certificationStatus "certified"^^xsd:string');
    expect(ttl).toContain('ronl:certifiedBy <https://example.org/certifier>');
    expect(ttl).toContain('ronl:certifiedAt "2026-01-01"^^xsd:date');
    expect(ttl).toContain('ronl:certificationNote "Gecontroleerd"@nl');
  });

  test('an uncertified vendor emits no certification metadata at all', () => {
    // "not-certified" is the default every service carries, so emitting it
    // would put a meaningless claim in every published graph.
    const ttl = vendorOf(bareVendor);

    expect(ttl).not.toContain('ronl:certificationStatus');
    expect(ttl).not.toContain('ronl:certifiedBy');
  });

  test('a certified vendor with no supporting details emits only the status', () => {
    const ttl = vendorOf({
      ...bareVendor,
      certification: {
        status: 'self-declared',
        certifiedBy: '   ',
        certifiedAt: '',
        certificationNote: '  ',
      },
    });

    expect(ttl).toContain('ronl:certificationStatus "self-declared"');
    expect(ttl).not.toContain('ronl:certifiedBy');
    expect(ttl).not.toContain('ronl:certifiedAt');
    expect(ttl).not.toContain('ronl:certificationNote');
  });

  test('a vendor with no contact details emits no provider block', () => {
    const ttl = vendorOf(bareVendor);

    expect(ttl).toContain('a ronl:VendorService');
    expect(ttl).not.toContain('schema:provider');
    expect(ttl).not.toContain('schema:url');
    expect(ttl).not.toContain('ronl:accessType');
  });

  test('whitespace-only service notes are not a description', () => {
    expect(vendorOf(bareVendor)).not.toContain('dct:description');
  });

  test('an organisation name without a contact point emits the provider but no contactPoint', () => {
    const ttl = vendorOf({
      ...bareVendor,
      contact: { ...bareVendor.contact, organizationName: 'Alleen naam' },
    });

    expect(ttl).toContain('schema:name "Alleen naam"');
    expect(ttl).not.toContain('schema:contactPoint');
  });

  test('a website alone is enough to produce a provider block', () => {
    const ttl = vendorOf({
      ...bareVendor,
      contact: { ...bareVendor.contact, website: 'https://only.example' },
    });

    expect(ttl).toContain('schema:provider [');
    expect(ttl).toContain('foaf:homepage <https://only.example>');
  });

  test('is empty when no vendor is selected', () => {
    expect(vendorOf({ ...bareVendor, selectedVendor: '' })).toBe('');
  });
});
