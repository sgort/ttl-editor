import {
  isValidDate,
  validateForm,
  validateLegalResource,
  validateOrganization,
  validateParameter,
  validateService,
  validateTemporalRule,
  validateVendorService,
} from './validators';

describe('validateService', () => {
  test('requires identifier and name', () => {
    expect(validateService({})).toEqual([
      'Service identifier is required',
      'Service name is required',
    ]);
  });

  test('passes with both fields present', () => {
    expect(validateService({ identifier: 'foo', name: 'Foo Service' })).toEqual([]);
  });
});

describe('validateOrganization', () => {
  test('is fully optional when empty', () => {
    expect(validateOrganization({})).toEqual([
      'Organization geographic jurisdiction (cv:spatial) is required',
    ]);
  });

  test('requires name once identifier is set', () => {
    const errors = validateOrganization({ identifier: 'org-1', spatial: 'NL' });
    expect(errors).toContain('Organization name is required when identifier is provided');
  });

  test('rejects a malformed homepage URL', () => {
    const errors = validateOrganization({ homepage: 'not a url', spatial: 'NL' });
    expect(errors).toContain('Organization homepage must be a valid URL');
  });

  test('accepts a well-formed homepage URL', () => {
    const errors = validateOrganization({ homepage: 'https://example.com', spatial: 'NL' });
    expect(errors).not.toContain('Organization homepage must be a valid URL');
  });
});

describe('validateLegalResource', () => {
  test('accepts a BWB id', () => {
    const errors = validateLegalResource({ bwbId: 'BWBR0002820' }, 'analysis', 'method');
    expect(errors).toEqual([]);
  });

  test('accepts a CVDR id', () => {
    const errors = validateLegalResource({ bwbId: 'CVDR603544' }, 'analysis', 'method');
    expect(errors).toEqual([]);
  });

  test('accepts a full URI containing a BWB id', () => {
    const errors = validateLegalResource(
      { bwbId: 'https://wetten.overheid.nl/BWBR0002820' },
      'analysis',
      'method'
    );
    expect(errors).toEqual([]);
  });

  test('rejects a full URI containing neither a BWB nor CVDR id', () => {
    const errors = validateLegalResource({ bwbId: 'https://example.com/foo' }, 'a', 'm');
    expect(errors).toContain('Full URI must contain a BWB ID or CVDR ID');
  });

  test('rejects a bwbId that is not BWB, CVDR, or a URI', () => {
    const errors = validateLegalResource({ bwbId: 'not-an-id' }, 'a', 'm');
    expect(errors.some((e) => e.includes('must be a BWB ID'))).toBe(true);
  });

  test('requires ronlAnalysis and ronlMethod', () => {
    const errors = validateLegalResource({}, '', '');
    expect(errors).toEqual(
      expect.arrayContaining([
        'RONL Analysis concept is required',
        'RONL Method concept is required',
      ])
    );
  });
});

describe('validateTemporalRule', () => {
  test('requires identifier and title', () => {
    const errors = validateTemporalRule({}, 0);
    expect(errors).toEqual(
      expect.arrayContaining([
        'Rule 1: Rule identifier (dct:identifier) is required',
        'Rule 1: Rule title (dct:title) is required',
      ])
    );
  });

  test('rejects validFrom after validUntil', () => {
    const errors = validateTemporalRule(
      { identifier: 'r1', title: 'Rule 1', validFrom: '2026-06-01', validUntil: '2026-01-01' },
      0
    );
    expect(errors).toContain('Rule 1: Valid From date must be before Valid Until date');
  });

  test('rejects a malformed extends URL', () => {
    const errors = validateTemporalRule(
      { identifier: 'r1', title: 'Rule 1', extends: 'not-a-url' },
      2
    );
    expect(errors).toContain('Rule 3: Extends must be a valid URL');
  });

  test('passes a fully valid rule', () => {
    const errors = validateTemporalRule(
      {
        identifier: 'r1',
        title: 'Rule 1',
        uri: 'https://regels.overheid.nl/rules/r1',
        extends: 'https://wetten.overheid.nl/BWBR0002820',
        validFrom: '2026-01-01',
        validUntil: '2026-12-31',
      },
      0
    );
    expect(errors).toEqual([]);
  });
});

describe('validateParameter', () => {
  test('requires notation and label', () => {
    const errors = validateParameter({}, 0);
    expect(errors).toEqual(
      expect.arrayContaining([
        'Parameter 1: Notation (skos:notation) is required',
        'Parameter 1: Label (skos:prefLabel) is required',
      ])
    );
  });

  test('rejects a non-numeric value', () => {
    const errors = validateParameter({ notation: 'N', label: 'L', value: 'abc' }, 0);
    expect(errors).toContain('Parameter 1: Value must be a valid number');
  });

  test('accepts a numeric value', () => {
    const errors = validateParameter({ notation: 'N', label: 'L', value: '42.5' }, 0);
    expect(errors).toEqual([]);
  });

  test('rejects validFrom after validUntil', () => {
    const errors = validateParameter(
      { notation: 'N', label: 'L', validFrom: '2026-06-01', validUntil: '2026-01-01' },
      0
    );
    expect(errors).toContain('Parameter 1: Valid From date must be before Valid Until date');
  });
});

describe('validateVendorService', () => {
  test('skips all validation when no vendor is selected', () => {
    expect(validateVendorService({ contact: { website: 'not-a-url' } })).toEqual([]);
  });

  test('validates website and serviceUrl once a vendor is selected', () => {
    const errors = validateVendorService({
      selectedVendor: 'blueriq',
      contact: { website: 'not-a-url' },
      technical: { serviceUrl: 'also-not-a-url' },
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        'Vendor website must be a valid URL (e.g., https://www.blueriq.com)',
        'Service URL must be a valid URL (e.g., https://api.blueriq.com/service)',
      ])
    );
  });
});

describe('validateForm', () => {
  test('aggregates errors across all sections, including array fields', () => {
    const { isValid, errors } = validateForm({
      service: {},
      organization: { spatial: 'NL' },
      legalResource: {},
      ronlAnalysis: '',
      ronlMethod: '',
      temporalRules: [{}],
      parameters: [{}],
      vendorService: {},
    });

    expect(isValid).toBe(false);
    expect(errors).toEqual(expect.arrayContaining(['Service identifier is required']));
    expect(errors).toEqual(
      expect.arrayContaining(['Rule 1: Rule identifier (dct:identifier) is required'])
    );
    expect(errors).toEqual(
      expect.arrayContaining(['Parameter 1: Notation (skos:notation) is required'])
    );
  });

  test('is valid when every section is filled in correctly', () => {
    const { isValid, errors } = validateForm({
      service: { identifier: 'svc', name: 'Service' },
      organization: { spatial: 'NL' },
      legalResource: { bwbId: 'BWBR0002820' },
      ronlAnalysis: 'https://regels.overheid.nl/termen/analysis',
      ronlMethod: 'https://regels.overheid.nl/termen/method',
      temporalRules: [],
      parameters: [],
      vendorService: {},
    });

    expect(errors).toEqual([]);
    expect(isValid).toBe(true);
  });

  test('tolerates a missing formState entirely', () => {
    const { isValid, errors } = validateForm(undefined);
    expect(isValid).toBe(false);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('isValidDate', () => {
  test.each([
    ['2026-01-01', true],
    ['not a date', false],
    ['', false],
    [undefined, false],
  ])('isValidDate(%p) -> %p', (input, expected) => {
    expect(isValidDate(input)).toBe(expected);
  });
});
