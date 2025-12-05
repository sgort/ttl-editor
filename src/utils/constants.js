// Default state values for form initialization and reset
// These match the CPSV-AP 3.2.0 structure

export const DEFAULT_SERVICE = {
  identifier: '',
  name: '',
  description: '',
  type: 'PublicService',
  sector: '',
  thematicArea: '',
  keywords: '',
  language: 'nl',
};

export const DEFAULT_ORGANIZATION = {
  identifier: '',
  name: '',
  homepage: '',
  spatial: 'https://publications.europa.eu/resource/authority/country/NLD', // default
};

export const DEFAULT_LEGAL_RESOURCE = {
  bwbId: '',
  version: '',
  title: '',
  description: '',
};

export const DEFAULT_TEMPORAL_RULE = {
  id: 1,
  uri: '',
  extends: '',
  validFrom: '',
  validUntil: '',
  confidenceLevel: 'high',
  description: '',
};

export const DEFAULT_PARAMETER = {
  id: 1,
  notation: '',
  label: '',
  value: '',
  unit: 'EUR',
  description: '',
  validFrom: '',
  validUntil: '',
};

export const DEFAULT_COST = {
  identifier: '',
  value: '',
  currency: 'EUR',
  description: '',
};

export const DEFAULT_OUTPUT = {
  identifier: '',
  name: '',
  description: '',
  type: '',
};

// TTL Namespace declarations
export const TTL_NAMESPACES = `@prefix cpsv: <http://purl.org/vocab/cpsv#> .
@prefix cv: <http://data.europa.eu/m8g/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix eli: <http://data.europa.eu/eli/ontology#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix org: <http://www.w3.org/ns/org#> .
@prefix ronl: <https://regels.overheid.nl/termen/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix schema: <http://schema.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix cprmv: <https://cprmv.open-regels.nl/0.3.0/> .

`;

// Base URIs for generated resources
export const BASE_URIS = {
  services: 'https://regels.overheid.nl/services/',
  organizations: 'https://regels.overheid.nl/organizations/',
  rules: 'https://regels.overheid.nl/rules/',
  parameters: 'https://regels.overheid.nl/parameters/',
  costs: 'https://regels.overheid.nl/costs/',
  outputs: 'https://regels.overheid.nl/outputs/',
  legal: 'https://identifier.overheid.nl/tooi/def/thes/kern/c_',
};

// Dropdown options
export const LANGUAGE_OPTIONS = [
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'English' },
];

export const CONFIDENCE_LEVELS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const UNIT_OPTIONS = [
  { value: 'EUR', label: 'EUR (Euro)' },
  { value: 'PCT', label: '% (Percentage)' },
  { value: 'NUM', label: 'Number' },
  { value: 'MONTHS', label: 'Months' },
  { value: 'YEARS', label: 'Years' },
  { value: 'DAYS', label: 'Days' },
];

export const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR' },
  { value: 'USD', label: 'USD' },
  { value: 'GBP', label: 'GBP' },
];

export const DEFAULT_CPRMV_RULE = {
  id: 1,
  ruleId: '', // cprmv:id
  rulesetId: '', // cprmv:rulesetId
  definition: '', // cprmv:definition
  situatie: '', // cprmv:situatie
  norm: '', // cprmv:norm
  ruleIdPath: '', // cprmv:ruleIdPath
};
