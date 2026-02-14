/**
 * Vocabulary Configuration v2.0.0
 * Central configuration for RDF vocabularies and namespace management
 *
 * BREAKING CHANGE in v2.0.0:
 * - Migrated rule properties from ronl: to cprmv:
 * - ronl: now used exclusively for validation/certification governance
 * - Backward compatibility via ronl-legacy alias
 */

export const VOCABULARY_CONFIG = {
  version: '2.0.0',
  lastUpdated: '2026-02-15',

  // Namespace URI to prefix mappings
  namespaces: {
    'http://purl.org/vocab/cpsv#': ['cpsv'],
    'http://data.europa.eu/m8g/': ['cv', 'cpsv-ap'],
    'http://www.w3.org/ns/org#': ['org'],
    'http://xmlns.com/foaf/0.1/': ['foaf'],
    'http://data.europa.eu/eli/ontology#': ['eli'],

    // NEW: Current ronl namespace (validation/governance only)
    'https://regels.overheid.nl/ontology#': ['ronl'],

    // NEW: Legacy ronl namespace (backward compatibility - IMPORT ONLY)
    'https://regels.overheid.nl/termen/': ['ronl-legacy'],

    'https://cprmv.open-regels.nl/0.3.0/': ['cprmv'],
    'http://purl.org/dc/terms/': ['dct'],
    'http://www.w3.org/ns/dcat#': ['dcat'],
    'http://www.w3.org/2004/02/skos/core#': ['skos'],
    'http://www.w3.org/2001/XMLSchema#': ['xsd'],
    'http://schema.org/': ['schema'],
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
      acceptedTypes: [
        'cprmv:TemporalRule', // NEW (primary) - v2.0.0
        'cpsv:Rule', // Standard CPSV
        'ronl:TemporalRule', // OLD (backward compat)
      ],
      canonicalType: 'cprmv:TemporalRule',
    },
    parameter: {
      acceptedTypes: [
        'cprmv:ParameterWaarde', // NEW (primary) - v2.0.0
        'skos:Concept', // Standard SKOS
        'ronl:ParameterWaarde', // OLD (backward compat)
      ],
      canonicalType: 'cprmv:ParameterWaarde',
    },
    cprmvRule: {
      acceptedTypes: ['cprmv:Rule'],
      canonicalType: 'cprmv:Rule',
    },
  },

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

    // NEW v2.0.0: Backward compatibility - Map old ronl properties to cprmv
    'ronl-legacy:hasAnalysis': 'cprmv:hasAnalysis',
    'ronl-legacy:hasMethod': 'cprmv:hasMethod',
    'ronl-legacy:implements': 'cprmv:implements',
    'ronl-legacy:implementedBy': 'cprmv:implementedBy',
    'ronl-legacy:confidenceLevel': 'cprmv:confidenceLevel',
    'ronl-legacy:validFrom': 'cprmv:validFrom',
    'ronl-legacy:validUntil': 'cprmv:validUntil',
    'ronl-legacy:extends': 'cprmv:extends',

    // Existing CPRMV aliases (keep for flexibility)
    'cprmv:validFrom': 'cprmv:validFrom',
    'cprmv:validUntil': 'cprmv:validUntil',
    'cprmv:confidence': 'cprmv:confidenceLevel',
    'cprmv:confidenceLevel': 'cprmv:confidenceLevel',
    'cprmv:extends': 'cprmv:extends',
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

  // Concept detection - exclude ConceptScheme
  if (line.includes('a skos:Concept') && !line.includes('skos:ConceptScheme')) {
    return 'concept';
  }

  // Regular entity detection
  for (const [entityName, config] of Object.entries(VOCABULARY_CONFIG.entityTypes)) {
    if (entityName === 'concept') continue; // Already handled above

    for (const acceptedType of config.acceptedTypes) {
      // NEW: Special handling for skos:Concept - exclude ConceptScheme
      if (acceptedType === 'skos:Concept' && line.includes('skos:ConceptScheme')) {
        continue; // Skip this type check - it's a ConceptScheme, not a Concept
      }

      if (line.includes(`a ${acceptedType}`)) {
        return entityName;
      }
    }
  }
  return null;
};

// Other helper functions remain unchanged
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
