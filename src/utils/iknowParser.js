// iknowParser.js - Parser for iKnow XML exports (CognitatieAnnotationExport.xml and SemanticsExport.xml)

/**
 * Parse CognitatieAnnotationExport.xml format
 * Structure: knowledgedomain > annotations > (concepts, textannotations, textblocks, documents)
 */
export const parseCognitatieAnnotation = (xmlText) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`XML parsing error: ${parserError.textContent}`);
  }

  const knowledgeDomain = xmlDoc.querySelector('knowledgedomain');
  if (!knowledgeDomain) {
    throw new Error('Invalid CognitatieAnnotationExport format: missing knowledgedomain root');
  }

  const result = {
    type: 'CognitatieAnnotation',
    metadata: {
      name: knowledgeDomain.getAttribute('name'),
      exportDateTime: knowledgeDomain.getAttribute('exportdatetime'),
    },
    concepts: [],
    textAnnotations: [],
    textBlocks: [],
    documents: [],
  };

  // Parse concepts
  const concepts = xmlDoc.querySelectorAll('concepts > concept');
  concepts.forEach((concept) => {
    const definition = concept.querySelector('definition');
    result.concepts.push({
      id: concept.getAttribute('id'),
      name: concept.getAttribute('name'),
      url: concept.getAttribute('url'),
      status: concept.getAttribute('status'),
      createDate: concept.getAttribute('createdate'),
      updateDate: concept.getAttribute('updatedate'),
      type: concept.getAttribute('type'),
      definition: definition ? definition.textContent.trim() : '',
    });
  });

  // Parse text annotations
  const textAnnotations = xmlDoc.querySelectorAll('textannotations > textannotation');
  textAnnotations.forEach((annotation) => {
    const textNode = annotation.querySelector('text');
    result.textAnnotations.push({
      id: annotation.getAttribute('id'),
      url: annotation.getAttribute('url'),
      juriconnect: annotation.getAttribute('juriconnect'),
      status: annotation.getAttribute('status'),
      createDate: annotation.getAttribute('createdate'),
      updateDate: annotation.getAttribute('updatedate'),
      type: annotation.getAttribute('type'),
      document: annotation.getAttribute('document'),
      concept: annotation.getAttribute('concept') || null,
      text: textNode ? textNode.textContent.trim() : '',
    });
  });

  // Parse text blocks
  const textBlocks = xmlDoc.querySelectorAll('textblocks > textblock');
  textBlocks.forEach((block) => {
    result.textBlocks.push({
      id: block.getAttribute('id'),
      url: block.getAttribute('url'),
      juriconnect: block.getAttribute('juriconnect'),
      status: block.getAttribute('status'),
      createDate: block.getAttribute('createdate'),
      updateDate: block.getAttribute('updatedate'),
      type: block.getAttribute('type'),
      document: block.getAttribute('document'),
    });
  });

  // Parse documents
  const documents = xmlDoc.querySelectorAll('documents > document');
  documents.forEach((doc) => {
    result.documents.push({
      id: doc.getAttribute('id'),
      name: doc.getAttribute('name'),
      url: doc.getAttribute('url'),
      status: doc.getAttribute('status'),
      createDate: doc.getAttribute('createdate'),
      updateDate: doc.getAttribute('updatedate'),
      validFrom: doc.getAttribute('validfrom'),
      type: doc.getAttribute('type'),
      version: doc.getAttribute('version'),
    });
  });

  return result;
};

/**
 * Parse SemanticsExport.xml format
 * Structure: knowledgedomain > ConceptModel > Languages > Language > Concept
 */
export const parseSemanticsExport = (xmlText) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`XML parsing error: ${parserError.textContent}`);
  }

  const knowledgeDomain = xmlDoc.querySelector('knowledgedomain');
  if (!knowledgeDomain) {
    throw new Error('Invalid SemanticsExport format: missing knowledgedomain root');
  }

  const result = {
    type: 'SemanticsExport',
    metadata: {
      id: knowledgeDomain.getAttribute('Id'),
      name: knowledgeDomain.getAttribute('Name'),
      language: knowledgeDomain.getAttribute('Language'),
    },
    concepts: [],
  };

  // Parse concepts
  const concepts = xmlDoc.querySelectorAll('Language > Concept');
  concepts.forEach((concept) => {
    const conceptId = concept.querySelector('Id');
    const state = concept.querySelector('State');

    // Parse terms
    const terms = [];
    const termNodes = concept.querySelectorAll('Terms > Term');
    termNodes.forEach((term) => {
      const value = term.querySelector('Value');
      terms.push({
        value: value ? value.textContent.trim() : '',
        preferred: term.getAttribute('Preferred') === 'true',
        createdBy: term.getAttribute('CreatedBy'),
        createdOn: term.getAttribute('CreatedOn'),
        termType: term.getAttribute('TermType'),
        updatedOn: term.getAttribute('UpdatedOn'),
      });
    });

    // Parse definitions
    const definitions = [];
    const defNodes = concept.querySelectorAll('Definitions > Definition');
    defNodes.forEach((def) => {
      const value = def.querySelector('Value');
      definitions.push({
        value: value ? value.textContent.trim() : '',
        createdBy: def.getAttribute('CreatedBy'),
        createdOn: def.getAttribute('CreatedOn'),
        updatedOn: def.getAttribute('UpdatedOn'),
      });
    });

    result.concepts.push({
      id: conceptId ? conceptId.textContent.trim() : '',
      state: state ? state.textContent.trim() : '',
      createdBy: concept.getAttribute('CreatedBy'),
      createdOn: concept.getAttribute('CreatedOn'),
      version: concept.getAttribute('Version'),
      editedBy: concept.getAttribute('EditedBy'),
      updatedOn: concept.getAttribute('UpdatedOn'),
      terms,
      definitions,
    });
  });

  return result;
};

/**
 * Auto-detect XML format and parse accordingly
 */
export const parseIKnowXML = (xmlText) => {
  // Try to detect format by looking for distinctive elements
  if (xmlText.includes('<ConceptModel>')) {
    return parseSemanticsExport(xmlText);
  } else if (xmlText.includes('<textannotations>')) {
    return parseCognitatieAnnotation(xmlText);
  } else {
    throw new Error(
      'Unknown iKnow XML format. Expected CognitatieAnnotationExport or SemanticsExport.'
    );
  }
};

/**
 * Get available fields for mapping based on parsed data type
 */
export const getAvailableFields = (parsedData) => {
  if (parsedData.type === 'CognitatieAnnotation') {
    return {
      concepts: [
        { path: 'name', label: 'Concept Name', example: 'pensioengerechtigde leeftijd' },
        { path: 'type', label: 'Concept Type', example: 'Variabele' },
        { path: 'definition', label: 'Concept Definition', example: 'Leeftijd van een jaar' },
        { path: 'id', label: 'Concept ID', example: 'f524c950-2210-4c95-85c5-96736e59d567' },
      ],
      textAnnotations: [
        { path: 'text', label: 'Annotation Text', example: 'pensioengerechtigde leeftijd' },
        { path: 'type', label: 'Annotation Type', example: 'Variabele' },
        {
          path: 'juriconnect',
          label: 'JuriConnect Reference',
          example: 'jci1.31:c:BWBR0002221...',
        },
      ],
      documents: [
        { path: 'name', label: 'Document Name', example: 'Algemene Ouderdomswet' },
        { path: 'type', label: 'Document Type', example: 'Wet' },
        { path: 'url', label: 'Document URL', example: 'https://ictu.pna-web.com/...' },
        { path: 'validFrom', label: 'Valid From Date', example: '2025-01-01 00:00:00' },
      ],
    };
  } else if (parsedData.type === 'SemanticsExport') {
    return {
      concepts: [
        { path: 'concept.terms[0].value', label: 'Preferred Term', example: '65' },
        { path: 'concept.definitions[0].value', label: 'Definition', example: '3e3e3e' },
        {
          path: 'concept.id',
          label: 'Concept ID',
          example: '650b68cb-fc45-4ab9-a4fa-129248e915ec',
        },
        { path: 'concept.state', label: 'State', example: 'NEW' },
      ],
      metadata: [
        { path: 'metadata.name', label: 'Knowledge Domain Name', example: 'Algemene Ouderdomswet' },
        { path: 'metadata.language', label: 'Language', example: 'nl' },
      ],
    };
  }
  return {};
};

/**
 * Extract value from parsed data using a path expression
 * Path examples: 'concept.name', 'textAnnotation.text', 'concept.terms[0].value'
 */
export const extractValue = (item, path) => {
  const parts = path.split('.');
  let value = item;

  for (const part of parts) {
    if (!value) return null;

    // Handle array access like terms[0]
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayName, index] = arrayMatch;
      value = value[arrayName]?.[parseInt(index)];
    } else {
      value = value[part];
    }
  }

  return value || null;
};

/**
 * Apply mapping configuration to parsed iKnow data to generate CPSV-AP compliant data
 */
export const applyMapping = (parsedData, mappingConfig) => {
  const result = {
    service: {},
    organization: {},
    legal: {},
    rules: [],
    parameters: [],
  };

  // Apply mappings based on configuration
  Object.entries(mappingConfig.mappings).forEach(([targetField, sourceConfig]) => {
    const { source, path, transform } = sourceConfig;

    // Determine which collection to iterate over
    let sourceData = [];
    if (source === 'concepts') {
      sourceData = parsedData.concepts;
    } else if (source === 'textAnnotations') {
      sourceData = parsedData.textAnnotations;
    } else if (source === 'documents') {
      sourceData = parsedData.documents;
    } else if (source === 'metadata') {
      sourceData = [parsedData.metadata];
    }

    // Extract and transform values
    sourceData.forEach((item) => {
      let value = extractValue(item, path);

      // Apply transformation if specified
      if (transform && value) {
        value = applyTransform(value, transform);
      }

      // Map to target field in result
      setNestedValue(result, targetField, value);
    });
  });

  return result;
};

/**
 * Apply transformation function to extracted value
 */
const applyTransform = (value, transform) => {
  switch (transform.type) {
    case 'prefix':
      return `${transform.value}${value}`;
    case 'suffix':
      return `${value}${transform.value}`;
    case 'replace':
      return value.replace(new RegExp(transform.pattern, 'g'), transform.replacement);
    case 'uri':
      return encodeURIComponent(value);
    case 'date':
      // Parse and format date
      return new Date(value).toISOString().split('T')[0];
    case 'custom':
      // Allow custom JavaScript function
      return transform.fn(value);
    default:
      return value;
  }
};

/**
 * Set nested value in object using dot notation
 * Example: setNestedValue(obj, 'service.name', 'Test') sets obj.service.name = 'Test'
 */
const setNestedValue = (obj, path, value) => {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }

  const lastPart = parts[parts.length - 1];

  // Handle array fields (like rules, parameters)
  if (Array.isArray(current)) {
    current.push(value);
  } else if (Array.isArray(current[lastPart])) {
    current[lastPart].push(value);
  } else {
    current[lastPart] = value;
  }
};
