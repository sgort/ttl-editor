import parseTTLEnhanced from '../parseTTL.enhanced';
import {
  applyImportedData,
  handleTTLImport,
  parseTTL,
  processTTLImport,
  readFileContent,
  validateTTLFile,
} from './importHandler';

vi.mock('../parseTTL.enhanced');

/**
 * The TTL import path, from a file input to editor state.
 *
 * This module had no unit tests at all. The round-trip Playwright journey drives
 * it end to end, which is why it worked, but that covers exactly one shape of
 * document — a complete one, exported by this editor. The interesting behaviour
 * is the other shape: parseTTL exists precisely to normalise a partial parse
 * into something the controlled components can render, and every field it
 * touches is a decision about what "missing" should become.
 *
 * parseTTLEnhanced is mocked throughout. This file is about the normalising and
 * the state application around it, not about parsing Turtle — parseTTL.enhanced
 * has its own tests.
 */

/** A parse result with every field present, so each fallback takes its left side. */
const fullParse = {
  service: {
    identifier: 'svc-1',
    name: 'Zorgtoeslag',
    description: 'Beschrijving',
    thematicArea: 'Sociale zaken',
    sector: 'https://example.org/NATIONAL',
    keywords: 'zorg, toeslag',
    language: 'en',
  },
  organization: {
    identifier: 'svb',
    name: 'SVB',
    homepage: 'https://svb.nl',
    spatial: 'NL',
    logo: 'data:image/png;base64,x',
  },
  legalResource: {
    bwbId: 'BWBR0018451',
    version: '2026-01-01',
    title: 'Zorgtoeslagwet',
    description: 'De wet',
  },
  ronlAnalysis: 'https://regels.overheid.nl/analysis',
  ronlMethod: 'https://regels.overheid.nl/method',
  temporalRules: [{ id: 1, identifier: 'r1', title: 'Regel 1', extra: 'kept' }],
  parameters: [{ id: 1, name: 'leeftijd' }],
  cprmvRules: [{ id: 1, identifier: 'c1' }],
  concepts: [{ id: 1, variableName: 'leeftijd' }],
  cost: { identifier: 'cost-1', value: '0', currency: 'USD', description: 'Gratis' },
  output: { identifier: 'out-1', name: 'Besluit', description: 'Het besluit', type: 'Decision' },
  vendorService: {
    selectedVendor: 'https://example.org/vendor',
    contact: {
      organizationName: 'Vendor BV',
      contactPerson: 'A. Persoon',
      email: 'a@example.org',
      phone: '0600000000',
      website: 'https://vendor.example',
      logo: 'data:image/png;base64,y',
    },
    serviceNotes: 'Notities',
    technical: {
      serviceUrl: 'https://api.vendor.example',
      license: 'EUPL-1.2',
      accessType: 'iam-required',
    },
    certification: {
      status: 'certified',
      certifiedBy: 'https://example.org/certifier',
      certifiedAt: '2026-01-01',
      certificationNote: 'Gecontroleerd',
    },
  },
  hasDmnData: true,
  importedDmnBlocks: '<dmn />',
  dmnValidationStatus: 'validated',
  dmnValidatedBy: 'https://example.org/org',
  dmnValidatedAt: '2026-02-02',
  dmnValidationNote: 'Akkoord',
};

const ttlFile = (name = 'service.ttl', content = '@prefix ex: <x> .') =>
  new File([content], name, { type: 'text/turtle' });

const changeEvent = (file) => ({ target: { files: file ? [file] : [] } });

const allSetters = () => ({
  setService: vi.fn(),
  setOrganization: vi.fn(),
  setLegalResource: vi.fn(),
  setRonlAnalysis: vi.fn(),
  setRonlMethod: vi.fn(),
  setTemporalRules: vi.fn(),
  setParameters: vi.fn(),
  setCprmvRules: vi.fn(),
  setConcepts: vi.fn(),
  setCost: vi.fn(),
  setOutput: vi.fn(),
  setVendorService: vi.fn(),
  setDmnData: vi.fn(),
  setIknowMappingConfig: vi.fn(),
});

beforeEach(() => {
  // Call history accumulates across tests otherwise, and two assertions here
  // are about a function NOT being called.
  vi.clearAllMocks();
  parseTTLEnhanced.mockReturnValue(fullParse);
});

describe('parseTTL', () => {
  test('passes every field through when the parse is complete', () => {
    const result = parseTTL('@prefix ex: <x> .');

    expect(result.service).toEqual(fullParse.service);
    expect(result.organization).toEqual(fullParse.organization);
    expect(result.legalResource).toEqual(fullParse.legalResource);
    expect(result.cost).toEqual(fullParse.cost);
    expect(result.output).toEqual(fullParse.output);
    expect(result.vendorService).toEqual(fullParse.vendorService);
    expect(result.ronlAnalysis).toBe(fullParse.ronlAnalysis);
    expect(result.ronlMethod).toBe(fullParse.ronlMethod);
    expect(result.hasDmnData).toBe(true);
    expect(result.importedDmnBlocks).toBe('<dmn />');
    expect(result.dmnValidationStatus).toBe('validated');
  });

  test('substitutes a default for every field the parse omitted', () => {
    // The editor's inputs are controlled, so undefined would make them
    // uncontrolled and React would warn. Every string becomes '', every list
    // becomes [], and the four fields with a meaningful default get it.
    parseTTLEnhanced.mockReturnValue({});

    const result = parseTTL('');

    expect(result.service).toEqual({
      identifier: '',
      name: '',
      description: '',
      thematicArea: '',
      sector: '',
      keywords: '',
      language: 'nl',
    });
    expect(result.organization).toEqual({
      identifier: '',
      name: '',
      homepage: '',
      spatial: '',
      logo: '',
    });
    expect(result.legalResource).toEqual({
      bwbId: '',
      version: '',
      title: '',
      description: '',
    });
    expect(result.cost).toEqual({
      identifier: '',
      value: '',
      currency: 'EUR',
      description: '',
    });
    expect(result.output).toEqual({ identifier: '', name: '', description: '', type: '' });
    expect(result.ronlAnalysis).toBe('');
    expect(result.ronlMethod).toBe('');
    expect(result.temporalRules).toEqual([]);
    expect(result.parameters).toEqual([]);
    expect(result.cprmvRules).toEqual([]);
    expect(result.concepts).toEqual([]);
  });

  test('the vendor service defaults name a state, not an empty one', () => {
    parseTTLEnhanced.mockReturnValue({});

    const { vendorService } = parseTTL('');

    // 'fair-use' and 'not-certified' are real answers rather than blanks: an
    // imported service with no vendor block is unrestricted and uncertified,
    // and the Vendor tab's radios need a value to be controlled.
    expect(vendorService.technical.accessType).toBe('fair-use');
    expect(vendorService.certification.status).toBe('not-certified');
    expect(vendorService.contact).toEqual({
      organizationName: '',
      contactPerson: '',
      email: '',
      phone: '',
      website: '',
      logo: '',
    });
    expect(vendorService.selectedVendor).toBe('');
    expect(vendorService.serviceNotes).toBe('');
    expect(vendorService.technical.serviceUrl).toBe('');
    expect(vendorService.technical.license).toBe('');
  });

  test('the DMN preservation fields default to "nothing imported"', () => {
    parseTTLEnhanced.mockReturnValue({});

    const result = parseTTL('');

    expect(result.hasDmnData).toBe(false);
    expect(result.importedDmnBlocks).toBeNull();
    expect(result.dmnValidationStatus).toBe('not-validated');
    expect(result.dmnValidatedBy).toBe('');
    expect(result.dmnValidatedAt).toBe('');
    expect(result.dmnValidationNote).toBe('');
  });

  test('a temporal rule keeps its own fields while gaining defaults for the two named', () => {
    parseTTLEnhanced.mockReturnValue({
      temporalRules: [
        { id: 7, extra: 'preserved' },
        { id: 8, identifier: 'r8', title: 'Regel 8' },
      ],
    });

    expect(parseTTL('').temporalRules).toEqual([
      { id: 7, extra: 'preserved', identifier: '', title: '' },
      { id: 8, identifier: 'r8', title: 'Regel 8' },
    ]);
  });
});

describe('validateTTLFile', () => {
  test('rejects a missing file', () => {
    expect(validateTTLFile(null)).toEqual({ valid: false, error: 'No file selected' });
  });

  test('rejects a file that is not .ttl', () => {
    expect(validateTTLFile(ttlFile('service.txt'))).toEqual({
      valid: false,
      error: 'Please select a .ttl file',
    });
  });

  test('accepts a .ttl file', () => {
    expect(validateTTLFile(ttlFile())).toEqual({ valid: true });
  });
});

describe('readFileContent', () => {
  test('resolves with the file text', async () => {
    await expect(readFileContent(ttlFile('x.ttl', 'hello'))).resolves.toBe('hello');
  });

  test('rejects with a readable message when the read fails', async () => {
    // FileReader has no way to fail on demand, so it is replaced for this test.
    const RealFileReader = globalThis.FileReader;
    globalThis.FileReader = class {
      readAsText() {
        this.onerror();
      }
    };

    await expect(readFileContent(ttlFile())).rejects.toThrow(
      'Error reading file. Please try again.'
    );

    globalThis.FileReader = RealFileReader;
  });
});

describe('processTTLImport', () => {
  test('refuses a file that fails validation, without reading it', async () => {
    const result = await processTTLImport(ttlFile('notes.txt'));

    expect(result).toEqual({ success: false, error: 'Please select a .ttl file', data: null });
    expect(parseTTLEnhanced).not.toHaveBeenCalled();
  });

  test('reports preserved DMN data in its message when the file carried some', async () => {
    const result = await processTTLImport(ttlFile());

    expect(result.success).toBe(true);
    expect(result.hasDMN).toBe('<dmn />');
    expect(result.message).toBe(
      'TTL imported successfully. DMN data preserved but cannot be edited.'
    );
  });

  test('uses the plain message when the file carried no DMN', async () => {
    parseTTLEnhanced.mockReturnValue({});

    const result = await processTTLImport(ttlFile());

    expect(result.success).toBe(true);
    expect(result.message).toBe('TTL imported successfully');
    expect(result.hasDMN).toBeFalsy();
  });

  test('turns a parse failure into a message rather than an exception', async () => {
    parseTTLEnhanced.mockImplementation(() => {
      throw new Error('unexpected token');
    });

    const result = await processTTLImport(ttlFile());

    expect(result).toEqual({
      success: false,
      error: 'Import error: unexpected token',
      data: null,
    });
  });
});

describe('applyImportedData', () => {
  test('sends each section to its own setter', () => {
    const setters = allSetters();
    const data = parseTTL('');

    applyImportedData(data, setters);

    expect(setters.setService).toHaveBeenCalledWith(data.service);
    expect(setters.setOrganization).toHaveBeenCalledWith(data.organization);
    expect(setters.setLegalResource).toHaveBeenCalledWith(data.legalResource);
    expect(setters.setRonlAnalysis).toHaveBeenCalledWith(data.ronlAnalysis);
    expect(setters.setRonlMethod).toHaveBeenCalledWith(data.ronlMethod);
    expect(setters.setTemporalRules).toHaveBeenCalledWith(data.temporalRules);
    expect(setters.setParameters).toHaveBeenCalledWith(data.parameters);
    expect(setters.setCprmvRules).toHaveBeenCalledWith(data.cprmvRules);
    expect(setters.setCost).toHaveBeenCalledWith(data.cost);
    expect(setters.setOutput).toHaveBeenCalledWith(data.output);
    expect(setters.setVendorService).toHaveBeenCalledWith(data.vendorService);
  });

  test('resets the iKnow mapping configuration on every import', () => {
    // The mapping describes the previous document's shape; carrying it into
    // the next import would silently map the wrong fields.
    const setters = allSetters();

    applyImportedData(parseTTL(''), setters);

    expect(setters.setIknowMappingConfig).toHaveBeenCalledWith({ mappings: {} });
  });

  test('falls back to an empty concept list when the field is absent', () => {
    const setters = allSetters();

    applyImportedData({ ...parseTTL(''), concepts: undefined }, setters);

    expect(setters.setConcepts).toHaveBeenCalledWith([]);
  });

  test('marks DMN data as imported and read-only, carrying its validation metadata', () => {
    const setters = allSetters();

    applyImportedData(parseTTL(''), setters);

    expect(setters.setDmnData).toHaveBeenCalledWith(
      expect.objectContaining({
        isImported: true,
        importedDmnBlocks: '<dmn />',
        validationStatus: 'validated',
        validatedBy: 'https://example.org/org',
        validatedAt: '2026-02-02',
        validationNote: 'Akkoord',
        deployed: false,
        fileName: '',
      })
    );
  });

  test('supplies validation defaults when the imported DMN carried none', () => {
    const setters = allSetters();

    applyImportedData(
      {
        ...parseTTL(''),
        dmnValidationStatus: '',
        dmnValidatedBy: '',
        dmnValidatedAt: '',
        dmnValidationNote: '',
      },
      setters
    );

    expect(setters.setDmnData).toHaveBeenCalledWith(
      expect.objectContaining({ isImported: true, validationStatus: 'not-validated' })
    );
  });

  test('resets DMN state when the file carried none', () => {
    parseTTLEnhanced.mockReturnValue({});
    const setters = allSetters();

    applyImportedData(parseTTL(''), setters);

    // Not merely "left alone" — a previous document's DMN must not survive the
    // import of one without it.
    expect(setters.setDmnData).toHaveBeenCalledWith(
      expect.objectContaining({
        isImported: false,
        importedDmnBlocks: null,
        validationStatus: 'not-validated',
        validatedBy: '',
        deployed: false,
      })
    );
  });

  test('resets DMN state when there are blocks but the flag is false', () => {
    // Both halves are required; a stray block list without the flag is not an
    // import worth preserving.
    const setters = allSetters();

    applyImportedData({ ...parseTTL(''), hasDmnData: false }, setters);

    expect(setters.setDmnData).toHaveBeenCalledWith(
      expect.objectContaining({ isImported: false, importedDmnBlocks: null })
    );
  });
});

describe('handleTTLImport', () => {
  // shouldAdvanceTime, because the success path awaits a real FileReader:
  // with time frozen its callback never fires and the test times out. Real time
  // still advances; advanceTimersByTime below drives the 4s auto-hide.
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  test('applies the data and reports success, then hides the message', async () => {
    const setters = allSetters();
    const setImportStatus = vi.fn();

    await handleTTLImport(changeEvent(ttlFile()), setters, setImportStatus);

    expect(setters.setService).toHaveBeenCalled();
    expect(setImportStatus).toHaveBeenCalledWith({
      show: true,
      success: true,
      message: 'TTL imported successfully. DMN data preserved but cannot be edited.',
    });

    vi.advanceTimersByTime(4000);

    expect(setImportStatus).toHaveBeenLastCalledWith({
      show: false,
      success: false,
      message: '',
    });
  });

  test('reports the failure and touches no setter', async () => {
    const setters = allSetters();
    const setImportStatus = vi.fn();

    await handleTTLImport(changeEvent(ttlFile('notes.txt')), setters, setImportStatus);

    expect(setters.setService).not.toHaveBeenCalled();
    expect(setImportStatus).toHaveBeenCalledWith({
      show: true,
      success: false,
      message: 'Please select a .ttl file',
    });

    vi.advanceTimersByTime(4000);

    expect(setImportStatus).toHaveBeenLastCalledWith({
      show: false,
      success: false,
      message: '',
    });
  });

  test('treats an empty file list as no file selected', async () => {
    const setImportStatus = vi.fn();

    await handleTTLImport(changeEvent(null), allSetters(), setImportStatus);

    expect(setImportStatus).toHaveBeenCalledWith({
      show: true,
      success: false,
      message: 'No file selected',
    });
  });
});
