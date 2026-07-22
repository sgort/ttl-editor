import {
  applyMapping,
  extractValue,
  getAvailableFields,
  parseCognitatieAnnotation,
  parseIKnowXML,
  parseSemanticsExport,
} from './iknowParser';

const COGNITATIE_XML = `<?xml version="1.0"?>
<knowledgedomain name="Algemene Ouderdomswet" exportdatetime="2026-01-01T00:00:00">
  <concepts>
    <concept id="c1" name="pensioengerechtigde leeftijd" url="https://example.com/c1" status="Approved" createdate="2025-01-01" updatedate="2025-06-01" type="Variabele">
      <definition>Leeftijd van een jaar</definition>
    </concept>
  </concepts>
  <textannotations>
    <textannotation id="a1" url="https://example.com/a1" juriconnect="jci1.31:c:BWBR0002221" status="Approved" createdate="2025-01-01" updatedate="2025-06-01" type="Variabele" document="d1" concept="c1">
      <text>pensioengerechtigde leeftijd</text>
    </textannotation>
  </textannotations>
  <textblocks>
    <textblock id="b1" url="https://example.com/b1" juriconnect="jci1.31:c:BWBR0002221" status="Approved" createdate="2025-01-01" updatedate="2025-06-01" type="Wet" document="d1" />
  </textblocks>
  <documents>
    <document id="d1" name="Algemene Ouderdomswet" url="https://example.com/d1" status="Approved" createdate="2025-01-01" updatedate="2025-06-01" validfrom="2025-01-01 00:00:00" type="Wet" version="1" />
  </documents>
</knowledgedomain>`;

const SEMANTICS_XML = `<?xml version="1.0"?>
<knowledgedomain Id="kd1" Name="Algemene Ouderdomswet" Language="nl">
  <ConceptModel>
    <Languages>
      <Language>
        <Concept CreatedBy="jan" CreatedOn="2025-01-01" Version="1" EditedBy="piet" UpdatedOn="2025-06-01">
          <Id>concept-1</Id>
          <State>NEW</State>
          <Terms>
            <Term Preferred="true" CreatedBy="jan" CreatedOn="2025-01-01" TermType="Preferred" UpdatedOn="2025-06-01">
              <Value>65</Value>
            </Term>
          </Terms>
          <Definitions>
            <Definition CreatedBy="jan" CreatedOn="2025-01-01" UpdatedOn="2025-06-01">
              <Value>De leeftijd waarop AOW ingaat</Value>
            </Definition>
          </Definitions>
        </Concept>
      </Language>
    </Languages>
  </ConceptModel>
</knowledgedomain>`;

describe('parseCognitatieAnnotation', () => {
  test('parses concepts, text annotations, text blocks, and documents', () => {
    const result = parseCognitatieAnnotation(COGNITATIE_XML);

    expect(result.type).toBe('CognitatieAnnotation');
    expect(result.metadata).toEqual({
      name: 'Algemene Ouderdomswet',
      exportDateTime: '2026-01-01T00:00:00',
    });
    expect(result.concepts).toEqual([
      {
        id: 'c1',
        name: 'pensioengerechtigde leeftijd',
        url: 'https://example.com/c1',
        status: 'Approved',
        createDate: '2025-01-01',
        updateDate: '2025-06-01',
        type: 'Variabele',
        definition: 'Leeftijd van een jaar',
      },
    ]);
    expect(result.textAnnotations).toHaveLength(1);
    expect(result.textAnnotations[0].text).toBe('pensioengerechtigde leeftijd');
    expect(result.textAnnotations[0].concept).toBe('c1');
    expect(result.textBlocks).toHaveLength(1);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].name).toBe('Algemene Ouderdomswet');
  });

  test('a textannotation with no concept attribute reports null, not empty string', () => {
    const xml = COGNITATIE_XML.replace(' concept="c1"', '');
    const result = parseCognitatieAnnotation(xml);
    expect(result.textAnnotations[0].concept).toBeNull();
  });

  test('throws when the knowledgedomain root is missing', () => {
    expect(() => parseCognitatieAnnotation('<?xml version="1.0"?><wrongroot />')).toThrow(
      'Invalid CognitatieAnnotationExport format: missing knowledgedomain root'
    );
  });

  test('throws a descriptive error on malformed XML', () => {
    expect(() => parseCognitatieAnnotation('<not<valid')).toThrow('XML parsing error');
  });
});

describe('parseSemanticsExport', () => {
  test('parses metadata, concept terms, and definitions', () => {
    const result = parseSemanticsExport(SEMANTICS_XML);

    expect(result.type).toBe('SemanticsExport');
    expect(result.metadata).toEqual({ id: 'kd1', name: 'Algemene Ouderdomswet', language: 'nl' });
    expect(result.concepts).toHaveLength(1);

    const concept = result.concepts[0];
    expect(concept.id).toBe('concept-1');
    expect(concept.state).toBe('NEW');
    expect(concept.terms).toEqual([
      {
        value: '65',
        preferred: true,
        createdBy: 'jan',
        createdOn: '2025-01-01',
        termType: 'Preferred',
        updatedOn: '2025-06-01',
      },
    ]);
    expect(concept.definitions).toEqual([
      {
        value: 'De leeftijd waarop AOW ingaat',
        createdBy: 'jan',
        createdOn: '2025-01-01',
        updatedOn: '2025-06-01',
      },
    ]);
  });

  test('throws when the knowledgedomain root is missing', () => {
    expect(() => parseSemanticsExport('<?xml version="1.0"?><wrongroot />')).toThrow(
      'Invalid SemanticsExport format: missing knowledgedomain root'
    );
  });
});

describe('parseIKnowXML', () => {
  test('auto-detects and dispatches a SemanticsExport document', () => {
    expect(parseIKnowXML(SEMANTICS_XML).type).toBe('SemanticsExport');
  });

  test('auto-detects and dispatches a CognitatieAnnotationExport document', () => {
    expect(parseIKnowXML(COGNITATIE_XML).type).toBe('CognitatieAnnotation');
  });

  test('throws on an unrecognized format', () => {
    expect(() => parseIKnowXML('<?xml version="1.0"?><somethingElse />')).toThrow(
      'Unknown iKnow XML format'
    );
  });
});

describe('getAvailableFields', () => {
  test('returns the CognitatieAnnotation field map', () => {
    const fields = getAvailableFields({ type: 'CognitatieAnnotation' });
    expect(Object.keys(fields)).toEqual(['concepts', 'textAnnotations', 'documents']);
  });

  test('returns the SemanticsExport field map', () => {
    const fields = getAvailableFields({ type: 'SemanticsExport' });
    expect(Object.keys(fields)).toEqual(['concepts', 'metadata']);
  });

  test('returns {} for an unrecognized type', () => {
    expect(getAvailableFields({ type: 'SomethingElse' })).toEqual({});
  });
});

describe('extractValue', () => {
  test('resolves a simple dot path', () => {
    expect(extractValue({ concept: { name: 'foo' } }, 'concept.name')).toBe('foo');
  });

  test('resolves array-index access like terms[0].value', () => {
    expect(extractValue({ terms: [{ value: '65' }] }, 'terms[0].value')).toBe('65');
  });

  test('returns null when a path segment is missing', () => {
    expect(extractValue({ concept: {} }, 'concept.name')).toBeNull();
  });

  test('returns null (not throwing) when traversing through a missing intermediate object', () => {
    expect(extractValue({}, 'a.b.c')).toBeNull();
  });
});

describe('applyMapping', () => {
  const parsedData = {
    concepts: [
      {
        name: 'pensioengerechtigde leeftijd',
        type: 'Variabele',
        definition: 'Leeftijd van een jaar',
        id: 'c1',
      },
    ],
    textAnnotations: [{ text: 'AOW', type: 'Wet', juriconnect: 'jci1.31:c:BWBR0002221' }],
    documents: [{ name: 'AOW', url: 'BWBR0002221', validFrom: '2025-01-01' }],
    metadata: { name: 'Algemene Ouderdomswet', language: 'nl' },
  };

  test('maps a simple concept field to a nested target field', () => {
    const mapping = { mappings: { 'service.name': { source: 'concepts', path: 'name' } } };
    const result = applyMapping(parsedData, mapping);
    expect(result.service.name).toBe('pensioengerechtigde leeftijd');
  });

  test('renames legal.url to legal.bwbId', () => {
    const mapping = { mappings: { 'legal.url': { source: 'documents', path: 'url' } } };
    const result = applyMapping(parsedData, mapping);
    expect(result.legal.bwbId).toBe('BWBR0002221');
    expect(result.legal.url).toBeUndefined();
  });

  test('applies a filter before extracting the first match', () => {
    const mapping = {
      mappings: {
        'organization.name': {
          source: 'textAnnotations',
          path: 'text',
          filter: { type: 'Wet' },
        },
      },
    };
    const result = applyMapping(parsedData, mapping);
    expect(result.organization.name).toBe('AOW');
  });

  test('skips a mapping when the filter matches nothing', () => {
    const mapping = {
      mappings: {
        'organization.name': {
          source: 'textAnnotations',
          path: 'text',
          filter: { type: 'NoSuchType' },
        },
      },
    };
    const result = applyMapping(parsedData, mapping);
    expect(result.organization.name).toBeUndefined();
  });

  test('applies a prefix transform', () => {
    const mapping = {
      mappings: {
        'service.identifier': {
          source: 'concepts',
          path: 'id',
          transform: { type: 'prefix', value: 'svc-' },
        },
      },
    };
    const result = applyMapping(parsedData, mapping);
    expect(result.service.identifier).toBe('svc-c1');
  });

  test('applies a uri transform', () => {
    const mapping = {
      mappings: {
        'service.identifier': {
          source: 'concepts',
          path: 'name',
          transform: { type: 'uri' },
        },
      },
    };
    const result = applyMapping(parsedData, mapping);
    expect(result.service.identifier).toBe(encodeURIComponent('pensioengerechtigde leeftijd'));
  });

  test('groups parameters.* mappings into a single parameter object', () => {
    const mapping = {
      mappings: {
        'parameters.name': { source: 'concepts', path: 'name' },
        'parameters.value': { source: 'concepts', path: 'definition' },
      },
    };
    const result = applyMapping(parsedData, mapping);
    expect(result.parameters).toEqual([
      { name: 'pensioengerechtigde leeftijd', value: 'Leeftijd van een jaar' },
    ]);
  });

  test('does not add a parameter when neither name nor value resolved', () => {
    const mapping = {
      mappings: {
        'parameters.description': {
          source: 'concepts',
          path: 'definition',
          filter: { type: 'NoSuchType' },
        },
      },
    };
    const result = applyMapping(parsedData, mapping);
    expect(result.parameters).toEqual([]);
  });
});
