export const VOCABULARY_CONFIG = {
  version: '1.0.0',
  lastUpdated: '2025-10-27',

  // Namespace URI to prefix mappings
  namespaces: {
    'http://purl.org/vocab/cpsv#': ['cpsv'],
    'http://data.europa.eu/m8g/': ['cv', 'cpsv-ap'],
    'http://www.w3.org/ns/org#': ['org'],
    'http://xmlns.com/foaf/0.1/': ['foaf'],
    'http://data.europa.eu/eli/ontology#': ['eli'],
    'https://regels.overheid.nl/termen/': ['ronl'],
    'https://cprmv.open-regels.nl/0.3.0/': ['cprmv'],
    'http://purl.org/dc/terms/': ['dct'],
    'http://www.w3.org/ns/dcat#': ['dcat'],
    'http://www.w3.org/2004/02/skos/core#': ['skos'],
    'http://www.w3.org/2001/XMLSchema#': ['xsd'],
  },

  entityTypes: {
    service: {
      acceptedTypes: ['cpsv:PublicService', 'cpsv-ap:PublicService'],
      canonicalType: 'cpsv:PublicService',
    },
    organization: {
      acceptedTypes: ['cv:PublicOrganisation'],
      canonicalType: 'cv:PublicOrganisation',
    },
    concept: {
      acceptedTypes: ['skos:Concept'],
      canonicalType: 'skos:Concept',
    },
    cost: {
      acceptedTypes: ['cv:Cost'],
      canonicalType: 'cv:Cost',
    },
    output: {
      acceptedTypes: ['cv:Output'],
      canonicalType: 'cv:Output',
    },
    legalResource: {
      acceptedTypes: ['eli:LegalResource'],
      canonicalType: 'eli:LegalResource',
    },
    temporalRule: {
      acceptedTypes: ['cpsv:Rule', 'ronl:TemporalRule'],
      canonicalType: 'cpsv:Rule',
    },
    parameter: {
      acceptedTypes: ['skos:Concept', 'ronl:ParameterWaarde'],
      canonicalType: 'ronl:ParameterWaarde',
    },
    cprmvRule: {
      acceptedTypes: ['cprmv:Rule'],
      canonicalType: 'cprmv:Rule',
    },
  },

  propertyAliases: {
    'foaf:name': 'skos:prefLabel',
    'org:name': 'skos:prefLabel',
    'cpsv-ap:hasCompetentAuthority': 'cv:hasCompetentAuthority',
    'cpsv-ap:thematicArea': 'cv:thematicArea',
    'cpsv-ap:sector': 'cv:sector',
    'cpsv-ap:hasChannel': 'cv:hasChannel',
    'cpsv-ap:hasContactPoint': 'cv:hasContactPoint',
    'cpsv-ap:hasCost': 'cv:hasCost',
    'cpsv-ap:hasOutput': 'cv:hasOutput',
    'cpsv-ap:hasLegalResource': 'cv:hasLegalResource',
    'cprmv:validFrom': 'ronl:validFrom',
    'cprmv:validUntil': 'ronl:validUntil',
    'cprmv:confidence': 'ronl:confidenceLevel',
    'cprmv:confidenceLevel': 'ronl:confidenceLevel',
    'cprmv:extends': 'ronl:extends',
  },
};

// *** CRITICAL: DMN DETECTION MUST BE FIRST ***
export const detectEntityType = (line) => {
  // DMN entities checked BEFORE regular entityTypes
  if (line.includes('a cprmv:DecisionModel') || line.includes('a cprmv:decisionModel')) {
    return 'dmnModel';
  }
  if (line.includes('a cpsv:Input') || line.includes('a cv:Input')) {
    return 'dmnInput';
  }
  // Only detect cpsv:Output (DMN), NOT cv:Output (service)
  if (line.includes('a cpsv:Output')) {
    return 'dmnOutput';
  }
  if (line.includes('a cprmv:DecisionRule') || line.includes(', cprmv:DecisionRule')) {
    return 'dmnRule';
  }
  // Concept detection - must be exact "a skos:Concept" not "a skos:ConceptScheme"
  if (
    line.includes('a skos:Concept ') ||
    line.includes('a skos:Concept;') ||
    line.includes('a skos:Concept.')
  ) {
    return 'concept';
  }

  // Regular entity detection
  for (const [entityName, config] of Object.entries(VOCABULARY_CONFIG.entityTypes)) {
    // Skip 'concept' - already handled above with precise matching
    if (entityName === 'concept') continue;

    for (const acceptedType of config.acceptedTypes) {
      if (line.includes(`a ${acceptedType}`)) {
        return entityName;
      }
    }
  }
  return null;
};

// Other helper functions remain unchanged...
export const normalizeProperty = (property) => {
  return VOCABULARY_CONFIG.propertyAliases[property] || property;
};

export const getCanonicalType = (entityName) => {
  return VOCABULARY_CONFIG.entityTypes[entityName]?.canonicalType || null;
};

export const extractPrefixMap = (ttlContent) => {
  const prefixMap = {};
  const lines = ttlContent.split('\n');
  lines.forEach((line) => {
    if (line.trim().startsWith('@prefix')) {
      const match = line.match(/@prefix\s+([^:]+):\s+<([^>]+)>/);
      if (match) {
        prefixMap[match[1]] = match[2];
      }
    }
  });
  return prefixMap;
};

export const validatePrefixes = (ttlContent, options = {}) => {
  const prefixMap = extractPrefixMap(ttlContent);
  const warnings = [];
  const essentialPrefixes = [
    { prefix: 'cpsv', alternatives: ['cpsv-ap'], namespace: 'http://purl.org/vocab/cpsv#' },
    { prefix: 'cv', alternatives: ['cpsv-ap'], namespace: 'http://data.europa.eu/m8g/' },
    { prefix: 'dct', alternatives: [], namespace: 'http://purl.org/dc/terms/' },
  ];

  essentialPrefixes.forEach(({ prefix, alternatives, namespace }) => {
    const hasPrefix = prefixMap[prefix] === namespace;
    const hasAlternative = alternatives.some((alt) => prefixMap[alt] === namespace);
    if (!hasPrefix && !hasAlternative) {
      warnings.push(`Missing recommended prefix: @prefix ${prefix}: <${namespace}>`);
    }
  });

  return {
    valid: warnings.length === 0,
    warnings,
    silent: options.silent || false,
  };
};

export default VOCABULARY_CONFIG;
