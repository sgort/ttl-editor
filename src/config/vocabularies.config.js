// vocabularies.config.js
// Configuration file for vocabulary mappings in TTL Editor
// Allows the parser to recognize multiple vocabulary prefixes

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

  // RDF types that map to editor sections
  // Each type can have multiple accepted prefix variations
  entityTypes: {
    service: {
      acceptedTypes: ['cpsv:PublicService', 'cpsv-ap:PublicService'],
      canonicalType: 'cpsv:PublicService',
    },
    organization: {
      acceptedTypes: ['cv:PublicOrganisation'],
      canonicalType: 'cv:PublicOrganisation',
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

  // Property aliases - map variations to canonical form
  // This allows the parser to recognize different vocabulary properties
  propertyAliases: {
    // Organization properties
    'foaf:name': 'skos:prefLabel',
    'org:name': 'skos:prefLabel',

    // Service properties - CPSV-AP to CV mapping
    'cpsv-ap:hasCompetentAuthority': 'cv:hasCompetentAuthority',
    'cpsv-ap:thematicArea': 'cv:thematicArea',
    'cpsv-ap:sector': 'cv:sector',
    'cpsv-ap:hasChannel': 'cv:hasChannel',
    'cpsv-ap:hasContactPoint': 'cv:hasContactPoint',
    'cpsv-ap:hasCost': 'cv:hasCost',
    'cpsv-ap:hasOutput': 'cv:hasOutput',
    'cpsv-ap:hasLegalResource': 'cv:hasLegalResource',

    // Temporal rule properties - CPRMV to RONL mapping
    'cprmv:validFrom': 'ronl:validFrom',
    'cprmv:validUntil': 'ronl:validUntil',
    'cprmv:confidence': 'ronl:confidenceLevel',
    'cprmv:confidenceLevel': 'ronl:confidenceLevel',
    'cprmv:extends': 'ronl:extends',
  },
};

// Helper function: Check if a line contains any of the accepted types for an entity
export const detectEntityType = (line) => {
  for (const [entityName, config] of Object.entries(VOCABULARY_CONFIG.entityTypes)) {
    for (const acceptedType of config.acceptedTypes) {
      if (line.includes(`a ${acceptedType}`)) {
        return entityName;
      }
      // ========================================
      // DMN-Related Entities (v1.5.0)
      // ========================================

      // DMN Decision Model (skip - export only, not imported)
      if (line.includes('a cprmv:DecisionModel') || line.includes('a cprmv:decisionModel')) {
        return 'dmnModel';
      }

      // DMN Input Variables (skip - export only, not imported)
      if (line.includes('a cpsv:Input') || line.includes('a cv:Input')) {
        return 'dmnInput';
      }

      // DMN Decision Rules (skip - export only, not imported)
      if (
        line.includes('a cprmv:DecisionRule') ||
        line.includes(', cprmv:DecisionRule') // For dual typing like "a cpsv:Rule, cprmv:DecisionRule"
      ) {
        return 'dmnRule';
      }
    }
  }
  return null;
};

// Helper function: Normalize property names using aliases
export const normalizeProperty = (property) => {
  return VOCABULARY_CONFIG.propertyAliases[property] || property;
};

// Helper function: Get canonical type for entity
export const getCanonicalType = (entityName) => {
  return VOCABULARY_CONFIG.entityTypes[entityName]?.canonicalType || null;
};

// Helper function: Extract prefix map from TTL content
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

// Helper function: Validate that required prefixes are present
export const validatePrefixes = (ttlContent) => {
  const prefixMap = extractPrefixMap(ttlContent);
  const warnings = [];

  // Check for essential prefixes
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
  };
};

export default VOCABULARY_CONFIG;
