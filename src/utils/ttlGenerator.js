import {
  extractInputsFromTestResult,
  extractOutputsFromTestResult,
  extractRulesFromDMN,
  sanitizeServiceIdentifier,
} from './dmnHelpers';
import {
  buildResourceUri,
  encodeURIComponentTTL,
  escapeTTLString,
  sanitizeIri,
  sanitizeRuleIdPath,
  TTL_NAMESPACES,
} from './index';

// Base namespace for the editor's own NL-SBB concept URIs.
const CONCEPT_NS = 'https://regels.overheid.nl/concepts/';

/**
 * Normalize a skos:exactMatch IRI. After the standard IRI sanitization, internal
 * concept URIs (under CONCEPT_NS) also get hyphens converted to underscores in their
 * local name, so they match the underscore-style concept subject URIs. External
 * exactMatch links (other domains/paths) are left untouched so legitimate hyphenated
 * URIs are not mangled.
 *
 * @param {string} uri
 * @returns {string}
 */
const sanitizeExactMatchIri = (uri) => {
  const s = sanitizeIri(uri);
  if (!s.startsWith(CONCEPT_NS)) return s;
  return CONCEPT_NS + s.slice(CONCEPT_NS.length).replace(/-/g, '_');
};

/**
 * TTL Generator Class
 * Generates complete TTL documents from editor state
 */
// CPRMV vocabulary namespace per supported export target. 0.3.2 uses the
// versioned-path form the LDE /v1/norms flat query expects (and matches the
// hand-published 0.3.2 files); 0.4.1 uses the canonical standaarden.open-regels
// term namespace. Selecting a version swaps the cprmv: prefix and the wrapper
// section (Dataset for 0.3.2, RuleSet for 0.4.1).
const CPRMV_TTL_NAMESPACE = {
  '0.3.2': 'https://cprmv.open-regels.nl/0.3.2/',
  '0.4.1': 'https://standaarden.open-regels.nl/standards/cprmv/0.4.1#',
};
const DEFAULT_CPRMV_VERSION = '0.4.1';

export class TTLGenerator {
  constructor(state) {
    // Store all state we need
    this.service = state.service;
    this.organization = state.organization;
    this.legalResource = state.legalResource;
    this.ronlAnalysis = state.ronlAnalysis || '';
    this.ronlMethod = state.ronlMethod || '';
    this.temporalRules = state.temporalRules;
    this.parameters = state.parameters;
    this.cprmvRules = state.cprmvRules;
    this.cost = state.cost;
    this.output = state.output;
    this.dmnData = state.dmnData;
    this.concepts = state.concepts || [];
    this.vendorService = state.vendorService || {};
    // CPRMV target vocabulary version for this export: '0.4.1' (RuleSet/hasPart
    // model) or '0.3.2' (flat cprmv:Rule + cprmv:Dataset model). Drives the
    // cprmv: namespace and which wrapper section is emitted.
    this.cprmvVersion = CPRMV_TTL_NAMESPACE[state.cprmvVersion]
      ? state.cprmvVersion
      : DEFAULT_CPRMV_VERSION;

    // Compute service URI once
    const sanitizedIdentifier =
      sanitizeServiceIdentifier(this.service.identifier) || 'unknown-service';
    this.serviceUri = `https://regels.overheid.nl/services/${sanitizedIdentifier}`;
    this.sanitizedIdentifier = sanitizedIdentifier;
  }

  /**
   * Generate complete TTL document
   * @returns {string} Complete TTL content
   */
  generate() {
    let ttl = '';

    // Namespaces (no header needed)
    ttl += this.generateNamespaces();

    // Service section
    if (this.service.identifier) {
      ttl += this.generateSectionHeader('Public Service');
      ttl += this.generateServiceSection();
    }

    // Cost section
    if (this.cost.identifier) {
      ttl += this.generateSectionHeader('Cost');
      ttl += this.generateCostSection();
    }

    // Output section
    if (this.output.identifier) {
      ttl += this.generateSectionHeader('Output');
      ttl += this.generateOutputSection();
    }

    // Organization section
    if (this.organization.identifier) {
      ttl += this.generateSectionHeader('Organization');
      ttl += this.generateOrganizationSection();
    }

    // Legal Resource section
    if (this.legalResource.bwbId) {
      ttl += this.generateSectionHeader('Legal Resource');
      ttl += this.generateLegalResourceSection();
    }

    // Temporal Rules section
    if (this.hasTemporalRules()) {
      ttl += this.generateSectionHeader('Temporal Rules');
      ttl += this.generateTemporalRulesSection();
    }

    // Parameters section
    if (this.hasParameters()) {
      ttl += this.generateSectionHeader('Parameters');
      ttl += this.generateParametersSection();
    }

    // CPRMV wrapper section for the Rules below. The 0.4.1 model wraps rules in
    // a cprmv:RuleSet (+ RuleMethod); the 0.3.2 model groups them under a
    // cprmv:Dataset instead (what the LDE /v1/norms dataset_versions query reads).
    if (this.hasCprmvRules()) {
      if (this.cprmvVersion === '0.3.2') {
        ttl += this.generateSectionHeader('CPRMV Dataset');
        ttl += this.generateDatasetsSection();
      } else {
        ttl += this.generateSectionHeader('CPRMV RuleSet');
        ttl += this.generateRuleSetsSection();
      }
    }

    // CPRMV Rules section — flat cprmv:Rule resources, emitted for both targets.
    if (this.hasCprmvRules()) {
      ttl += this.generateSectionHeader('CPRMV Rules');
      ttl += this.generateCprmvRulesSection();
    }

    // DMN section
    if (this.hasDMN()) {
      ttl += this.generateSectionHeader('DMN Decision Model');
      ttl += this.generateDmnSection();
    }

    // NL-SBB Concepts section
    if (this.hasDMN()) {
      ttl += this.generateConceptsSection();
    }

    // Vendor Service section
    if (this.hasVendorService()) {
      ttl += this.generateSectionHeader('Vendor Service');
      ttl += this.generateVendorServiceSection();
    }

    return ttl;
  }

  /**
   * Generate namespace prefixes
   * @returns {string} TTL namespace declarations
   */
  generateNamespaces() {
    // Bind the cprmv: prefix to the selected target version's namespace; all
    // other prefixes are stable.
    const ns = CPRMV_TTL_NAMESPACE[this.cprmvVersion] || CPRMV_TTL_NAMESPACE[DEFAULT_CPRMV_VERSION];
    return TTL_NAMESPACES.replace(/@prefix cprmv: <[^>]*> \./, `@prefix cprmv: <${ns}> .`);
  }

  /**
   * Generate section header comment
   * @param {string} title - Section title
   * @returns {string} Formatted header comment
   */
  generateSectionHeader(title) {
    const line = '='.repeat(60);
    return `\n# ${line}\n#  ${title}\n# ${line}\n\n`;
  }

  /**
   * Check if temporal rules exist
   * @returns {boolean}
   */
  hasTemporalRules() {
    return this.temporalRules.length > 0;
  }

  /**
   * Check if parameters exist
   * @returns {boolean}
   */
  hasParameters() {
    return this.parameters.length > 0;
  }

  /**
   * Check if CPRMV rules exist
   * @returns {boolean}
   */
  hasCprmvRules() {
    return this.cprmvRules.length > 0;
  }

  /**
   * Check if DMN data exists
   * @returns {boolean}
   */
  hasDMN() {
    return (
      (this.dmnData.isImported && this.dmnData.importedDmnBlocks) ||
      (this.dmnData.fileName && this.dmnData.content)
    );
  }

  hasVendorService() {
    return (
      this.vendorService &&
      this.vendorService.selectedVendor &&
      this.vendorService.selectedVendor.trim() !== ''
    );
  }

  /**
   * Generate Service section
   * @returns {string} Service TTL
   */
  generateServiceSection() {
    if (!this.service.identifier) {
      return '';
    }

    let ttl = '';

    ttl += `<${this.serviceUri}> a cpsv:PublicService ;\n`;
    ttl += `    dct:identifier "${escapeTTLString(this.sanitizedIdentifier)}" ;\n`;

    if (this.service.name) {
      ttl += `    dct:title "${escapeTTLString(this.service.name)}"@${this.service.language} ;\n`;
    }

    if (this.service.description) {
      ttl += `    dct:description "${escapeTTLString(this.service.description)}"@${this.service.language} ;\n`;
    }

    if (this.service.thematicArea) {
      ttl += `    cv:thematicArea <${this.service.thematicArea}> ;\n`;
    }

    if (this.service.sector && this.service.sector !== 'custom') {
      ttl += `    cv:sector <${this.service.sector}> ;\n`;
    } else if (this.service.sector === 'custom' && this.service.customSector) {
      ttl += `    cv:sector <${this.service.customSector}> ;\n`;
    }

    if (this.service.keywords) {
      ttl += `    dcat:keyword "${escapeTTLString(this.service.keywords)}"@${this.service.language} ;\n`;
    }

    if (this.service.language) {
      const languageUri = `https://publications.europa.eu/resource/authority/language/${this.service.language.toUpperCase()}`;
      ttl += `    dct:language <${languageUri}> ;\n`;
    }

    // Relationships
    if (this.organization.identifier) {
      const orgUri = buildResourceUri(
        this.organization.identifier,
        'https://regels.overheid.nl/organizations/'
      );
      ttl += `    cv:hasCompetentAuthority <${orgUri}> ;\n`;
    }

    if (this.legalResource.bwbId) {
      const lowerBwbId = this.legalResource.bwbId.toLowerCase();
      const legalUri =
        lowerBwbId.startsWith('http://') || lowerBwbId.startsWith('https://')
          ? this.legalResource.bwbId
          : `https://wetten.overheid.nl/${this.legalResource.bwbId}`;
      ttl += `    cv:hasLegalResource <${legalUri}> ;\n`;
    }

    if (this.cost.identifier) {
      const encodedCostId = encodeURIComponent(this.cost.identifier);
      ttl += `    cv:hasCost <https://regels.overheid.nl/costs/${encodedCostId}> ;\n`;
    }

    if (this.output.identifier) {
      const encodedOutputId = encodeURIComponent(this.output.identifier);
      ttl += `    cpsv:produces <https://regels.overheid.nl/outputs/${encodedOutputId}> ;\n`;
    }

    // DMN reference
    if (this.hasDMN()) {
      ttl += `    cprmv:hasDecisionModel <${this.serviceUri}/dmn> ;\n`;
    }

    // Close statement
    ttl = ttl.slice(0, -2) + ' .\n\n';

    // Type the controlled-vocabulary references the PublicService points at, so the
    // file-local SHACL sh:class checks (no entailment) pass: language →
    // dct:LinguisticSystem, sector / thematicArea → skos:Concept.
    if (this.service.language) {
      const languageUri = `https://publications.europa.eu/resource/authority/language/${this.service.language.toUpperCase()}`;
      ttl += `<${languageUri}> a dct:LinguisticSystem .\n\n`;
    }
    const sectorUri =
      this.service.sector && this.service.sector !== 'custom'
        ? this.service.sector
        : this.service.sector === 'custom' && this.service.customSector
          ? this.service.customSector
          : null;
    if (sectorUri) {
      ttl += `<${sectorUri}> a skos:Concept .\n\n`;
    }
    if (this.service.thematicArea) {
      ttl += `<${this.service.thematicArea}> a skos:Concept .\n\n`;
    }

    return ttl;
  }

  /**
   * Generate Organization section
   * @returns {string} Organization TTL
   */
  generateOrganizationSection() {
    if (!this.organization.identifier) {
      return '';
    }

    let ttl = '';

    const orgUri = buildResourceUri(
      this.organization.identifier,
      'https://regels.overheid.nl/organizations/'
    );

    ttl += `<${orgUri}> a cv:PublicOrganisation ;\n`;
    // Extract just the ID part if it's a full URI
    const orgId = this.organization.identifier.startsWith('http')
      ? this.organization.identifier.split('/').pop()
      : this.organization.identifier;

    ttl += `    dct:identifier "${escapeTTLString(orgId)}" ;\n`;

    if (this.organization.name) {
      ttl += `    skos:prefLabel "${escapeTTLString(this.organization.name)}"@nl ;\n`;
    }

    if (this.organization.homepage) {
      ttl += `    foaf:homepage <${this.organization.homepage}> ;\n`;
    }

    if (this.organization.spatial) {
      // dct:spatial (not cv:spatial) — PublicOrganisationShape requires dct:spatial
      // with a dct:Location value (typed below).
      ttl += `    dct:spatial <${this.organization.spatial}> ;\n`;
    }

    // Logo output
    if (this.organization.logo) {
      // Check if it's a data URL or external URL
      if (this.organization.logo.startsWith('data:')) {
        // For base64 data URLs, we'll reference an asset file instead
        // The actual file will be uploaded separately to TriplyDB
        const logoFileName = `${orgId}_logo.png`;
        ttl += `    foaf:logo <./assets/${logoFileName}> ;\n`;
        ttl += `    schema:image <./assets/${logoFileName}> ;\n`;
      } else {
        // External URL
        ttl += `    foaf:logo <${this.organization.logo}> ;\n`;
        ttl += `    schema:image <${this.organization.logo}> ;\n`;
      }
    }

    ttl = ttl.slice(0, -2) + ' .\n\n';

    // Type the spatial reference as dct:Location so PublicOrganisationShape's
    // sh:class dct:Location check passes (file-local, no entailment).
    if (this.organization.spatial) {
      ttl += `<${this.organization.spatial}> a dct:Location .\n\n`;
    }

    return ttl;
  }

  /**
   * Generate Legal Resource section
   * @returns {string} Legal Resource TTL
   */
  generateLegalResourceSection() {
    if (!this.legalResource || !this.legalResource.bwbId) {
      return '';
    }

    let ttl = '';

    // Subject URI: canonical un-versioned form, regardless of whether bwbId
    // arrived clean from the parser or carries a legacy /version[/index] suffix.
    const legalUri = this.buildLegalUriForRulesetId(this.legalResource.bwbId, '');
    const identifier = this.legalResource.bwbId;

    ttl += `<${legalUri}> a eli:LegalResource ;\n`;

    // dct:identifier: strip http prefix and any trailing /<digits> for a clean
    // human-readable identifier (e.g. "BWBR0015703").
    const identifierOnly = identifier.replace(/^https?:\/\/[^/]+\//, '').replace(/\/\d+$/, '');
    ttl += `    dct:identifier "${escapeTTLString(identifierOnly)}" ;\n`;

    if (this.legalResource.title) {
      ttl += `    dct:title "${escapeTTLString(this.legalResource.title)}"@nl ;\n`;
    }

    if (this.legalResource.description) {
      ttl += `    dct:description "${escapeTTLString(this.legalResource.description)}"@nl ;\n`;
    }

    if (this.ronlAnalysis) {
      const analysisUri = this.ronlAnalysis.startsWith('http')
        ? `<${this.ronlAnalysis}>`
        : this.ronlAnalysis;
      ttl += `    cprmv:hasAnalysis ${analysisUri} ;\n`;
    }

    if (this.ronlMethod) {
      const methodUri = this.ronlMethod.startsWith('http')
        ? `<${this.ronlMethod}>`
        : this.ronlMethod;
      ttl += `    cprmv:hasMethod ${methodUri} ;\n`;
    }

    // eli:is_realized_by: versioned manifestation URI.
    // The version is derived from the date the rules actually carry (their BWB
    // in-force date) so the manifestation matches the rules' applicable_date;
    // it falls back to the manually-entered version when no dated rule exists.
    // Reuses buildLegalUriForRulesetId so the version always appears exactly
    // once, even if bwbId itself still carries a version from legacy state.
    const realizedVersion = this.primaryRulesetDate();
    if (realizedVersion) {
      const versionedUri = this.buildLegalUriForRulesetId(
        this.legalResource.bwbId,
        realizedVersion
      );
      ttl += `    eli:is_realized_by <${versionedUri}> ;\n`;
    }

    ttl = ttl.slice(0, -2) + ' .\n\n';

    return ttl;
  }

  /**
   * Generate Temporal Rules section
   * @returns {string} Temporal Rules TTL
   */
  generateTemporalRulesSection() {
    let ttl = '';

    this.temporalRules.forEach((rule, index) => {
      // Write if ANY meaningful field has data
      const hasData =
        rule.uri ||
        rule.extends ||
        rule.identifier ||
        rule.title ||
        rule.validFrom ||
        rule.validUntil ||
        rule.confidenceLevel ||
        rule.description;

      if (hasData) {
        const ruleUri = rule.uri || `https://regels.overheid.nl/rules/rule${index + 1}`;

        ttl += `<${ruleUri}> a cpsv:Rule, cprmv:TemporalRule ;\n`;

        // cpsv:implements must resolve to an eli:LegalResource (CPSV-AP RuleShape);
        // emit it only when a legal resource exists rather than pointing at the service.
        const legalSubjectUri = this.legalResourceSubjectUri();
        if (legalSubjectUri) {
          ttl += `    cpsv:implements <${legalSubjectUri}> ;\n`;
        }

        // dct:identifier / dct:title / dct:description are required (minCount 1).
        const ruleIdentifier = rule.identifier || `temporal-rule-${index + 1}`;
        ttl += `    dct:identifier "${escapeTTLString(ruleIdentifier)}" ;\n`;
        ttl += `    dct:title "${escapeTTLString(rule.title || ruleIdentifier)}"@nl ;\n`;
        ttl += `    dct:description "${escapeTTLString(rule.description || rule.title || ruleIdentifier)}"@nl ;\n`;

        if (rule.extends) {
          const extendsUri = rule.extends.startsWith('http')
            ? rule.extends
            : `https://regels.overheid.nl/rules/${encodeURIComponentTTL(rule.extends)}`;
          ttl += `    cprmv:isBasedOn <${extendsUri}> ;\n`;
        }

        if (rule.validFrom) {
          ttl += `    cprmv:validFrom "${rule.validFrom}"^^xsd:date ;\n`;
        }

        if (rule.validUntil) {
          ttl += `    cprmv:validUntil "${rule.validUntil}"^^xsd:date ;\n`;
        }

        if (rule.confidenceLevel) {
          ttl += `    cprmv:confidenceLevel "${escapeTTLString(rule.confidenceLevel)}" ;\n`;
        }

        ttl = ttl.slice(0, -2) + ' .\n\n';
      }
    });

    return ttl;
  }

  /**
   * Generate Parameters section
   * @returns {string} Parameters TTL
   */
  generateParametersSection() {
    let ttl = '';

    this.parameters.forEach((param, index) => {
      // Write if notation OR value exists (either is meaningful)
      const hasData = param.notation || param.value || param.label;

      if (hasData) {
        const paramUri = `https://regels.overheid.nl/parameters/${encodeURIComponent(
          this.service.identifier || 'service'
        )}/param-${index + 1}`;

        ttl += `<${paramUri}> a cprmv:ParameterWaarde ;\n`;

        if (param.label) {
          ttl += `    skos:prefLabel "${escapeTTLString(param.label)}"@nl ;\n`;
        }

        if (param.notation) {
          ttl += `    skos:notation "${escapeTTLString(param.notation)}" ;\n`;
        }

        if (param.value) {
          ttl += `    schema:value "${param.value}"^^xsd:decimal ;\n`;
        }

        if (param.unit) {
          ttl += `    schema:unitCode "${param.unit}" ;\n`;
        }

        if (param.description) {
          ttl += `    dct:description "${escapeTTLString(param.description)}"@nl ;\n`;
        }

        if (param.validFrom) {
          ttl += `    cprmv:validFrom "${param.validFrom}"^^xsd:date ;\n`;
        }

        if (param.validUntil) {
          ttl += `    cprmv:validUntil "${param.validUntil}"^^xsd:date ;\n`;
        }

        ttl = ttl.slice(0, -2) + ' .\n\n';
      }
    });

    return ttl;
  }

  /**
   * Generate Cost section
   * @returns {string} Cost TTL
   */
  generateCostSection() {
    if (!this.cost.identifier) {
      return '';
    }

    let ttl = '';

    const encodedCostId = encodeURIComponent(this.cost.identifier);
    ttl += `<https://regels.overheid.nl/costs/${encodedCostId}> a cv:Cost ;\n`;
    ttl += `    dct:identifier "${escapeTTLString(this.cost.identifier)}" ;\n`;

    if (this.cost.value) {
      ttl += `    cv:value "${escapeTTLString(this.cost.value)}" ;\n`;
    }

    if (this.cost.currency) {
      ttl += `    cv:currency "${escapeTTLString(this.cost.currency)}" ;\n`;
    }

    if (this.cost.description) {
      ttl += `    dct:description "${escapeTTLString(this.cost.description)}"@nl ;\n`;
    }

    ttl = ttl.slice(0, -2) + ' .\n\n';

    return ttl;
  }

  /**
   * Generate Output section
   * @returns {string} Output TTL
   */
  generateOutputSection() {
    if (!this.output.identifier) {
      return '';
    }

    let ttl = '';

    const encodedOutputId = encodeURIComponent(this.output.identifier);
    ttl += `<https://regels.overheid.nl/outputs/${encodedOutputId}> a cv:Output ;\n`;
    ttl += `    dct:identifier "${escapeTTLString(this.output.identifier)}" ;\n`;

    if (this.output.name) {
      ttl += `    dct:title "${escapeTTLString(this.output.name)}"@nl ;\n`;
    }

    if (this.output.description) {
      ttl += `    dct:description "${escapeTTLString(this.output.description)}"@nl ;\n`;
    }

    if (this.output.type) {
      ttl += `    dct:type <${this.output.type}> ;\n`;
    }

    ttl = ttl.slice(0, -2) + ' .\n\n';

    return ttl;
  }

  /**
   * Build a versioned legal-resource URI from a rulesetId.
   * Used by both the Rule emitter (with legalResource.bwbId) and the Dataset
   * emitter (with each Dataset's own rulesetId).
   *
   * @param {string} rulesetId - BWB / CVDR identifier or full URI
   * @param {string} version   - Optional version suffix; appended when truthy
   * @returns {string|null}    - Canonical legal URI, or null when rulesetId is empty
   */
  buildLegalUriForRulesetId(rulesetId, version = '') {
    if (!rulesetId) return null;

    const isFullUri = rulesetId.startsWith('http://') || rulesetId.startsWith('https://');
    let baseUri;

    if (isFullUri) {
      // Normalize: strip any trailing /YYYY-MM-DD[/INDEX] from the input URI.
      // The base URI should not carry a version — `version` is re-appended below
      // from the dedicated field. This makes the function robust to inputs that
      // arrived already-versioned (parsed subject URIs, user-pasted URLs, etc).
      baseUri = rulesetId.replace(/\/\d{4}-\d{2}-\d{2}(?:\/\d+)?$/, '');
    } else {
      const isBWB = /BWB[A-Z]?\d+/i.test(rulesetId);
      const isCVDR = /CVDR\d+/i.test(rulesetId);

      if (isBWB) {
        baseUri = `https://wetten.overheid.nl/${rulesetId}`;
      } else if (isCVDR) {
        baseUri = `https://lokaleregelgeving.overheid.nl/${rulesetId}/1`;
      } else {
        baseUri = `https://wetten.overheid.nl/${rulesetId}`;
      }
    }

    if (version) {
      baseUri = `${baseUri}/${version}`;
    }

    return baseUri;
  }

  /**
   * Build versioned URI for the service's primary Legal Resource.
   * Thin wrapper for backwards-compatibility with the Rule emitter.
   */
  buildLegalResourceUri() {
    return this.buildLegalUriForRulesetId(
      this.legalResource?.bwbId,
      this.legalResource?.version || ''
    );
  }

  /**
   * The eli:LegalResource subject URI (un-versioned form, matching the subject of
   * the Legal Resource section), or null when no legal resource is set. Used as the
   * cpsv:implements target for cpsv:Rule nodes, whose CPSV-AP RuleShape requires
   * that value to be an eli:LegalResource.
   */
  legalResourceSubjectUri() {
    return this.legalResource?.bwbId
      ? this.buildLegalUriForRulesetId(this.legalResource.bwbId, '')
      : null;
  }

  /**
   * Resolve the validFrom date (xsd:date) for a RuleSet. Prefers the legal
   * resource's version when it is an ISO date; otherwise falls back to today,
   * since cprmv:validFrom is required by the 0.4.1 RuleSetShape.
   */
  cprmvValidFrom() {
    const v = this.legalResource?.version || '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Extract the BWB consolidation date carried by a RuleSet's rules in their
   * cprmv:ruleIdPath — the `_YYYY-MM-DD_` segment, e.g.
   * "BWBR0015703_2026-04-03_0, Artikel 20, ..." → "2026-04-03". This is the
   * in-force date the CPRMV API actually resolved, so it is authoritative for
   * the RuleSet/LegalResource version and keeps the published date aligned with
   * the rules' applicable_date (rather than a hand-entered consolidation date).
   * Returns the first dated path found in the group, or null when none carry one.
   *
   * @param {Array<{ruleIdPath?: string}>} rules
   * @returns {string|null}
   */
  rulesetDateFromRules(rules) {
    for (const rule of rules || []) {
      const match = (rule.ruleIdPath || '').match(/_(\d{4}-\d{2}-\d{2})_/);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Effective consolidation date for the primary ruleset: derived from its
   * rules when available, otherwise the manually-entered legalResource.version.
   * Drives eli:is_realized_by so the LegalResource manifestation URI matches the
   * date the rules came from.
   *
   * @returns {string} ISO date or '' when neither source yields one
   */
  primaryRulesetDate() {
    const primary = this.primaryRulesetId();
    const rules = (this.cprmvRules || []).filter((rule) => (rule.rulesetId || primary) === primary);
    return this.rulesetDateFromRules(rules) || this.legalResource?.version || '';
  }

  /**
   * Deterministic subject URI for a CPRMV Rule. Shared by the RuleSet emitter
   * (to build the hasPart list) and the Rule emitter (to emit matching subjects),
   * so the list members always resolve to real cprmv:Rule nodes.
   */
  cprmvRuleUri(rule) {
    return this.cprmvRuleUriMap().get(rule) || this.cprmvRuleBaseUri(rule);
  }

  /**
   * Path-derived subject URI for a rule, before duplicate disambiguation.
   * Prefers the ruleIdPath; falls back to rulesetId_ruleId.
   */
  cprmvRuleBaseUri(rule) {
    let ruleUriIdentifier;
    if (rule.ruleIdPath) {
      ruleUriIdentifier = sanitizeRuleIdPath(rule.ruleIdPath);
    } else {
      const ruleId = rule.ruleId || 'incomplete';
      const rulesetId = rule.rulesetId || 'incomplete';
      ruleUriIdentifier = `${encodeURIComponentTTL(rulesetId)}_${encodeURIComponentTTL(ruleId)}`;
    }
    return `https://cprmv.open-regels.nl/rules/${ruleUriIdentifier}`;
  }

  /**
   * Unique subject URI per cprmv:Rule, even when several rules share a
   * ruleIdPath — e.g. range bounds ("meer dan X, doch minder dan Y") or
   * multiple maxima ("per maand" / "per kalenderjaar") for one legal path.
   * Without this, such rules collapse onto a single RDF subject and norm values
   * are silently lost on publish (the 66-vs-69 case). The first occurrence keeps
   * the path-derived URI; each subsequent duplicate gets an _N suffix (_2, _3,…)
   * in document order. Memoised because the RuleSet hasPart list and the flat
   * Rule emitter must resolve every rule to the same URI.
   *
   * @returns {Map<object, string>} rule object → unique URI
   */
  cprmvRuleUriMap() {
    if (this._cprmvRuleUriMap) return this._cprmvRuleUriMap;
    const map = new Map();
    const counts = new Map();
    (this.cprmvRules || []).forEach((rule) => {
      const base = this.cprmvRuleBaseUri(rule);
      const n = (counts.get(base) || 0) + 1;
      counts.set(base, n);
      map.set(rule, n === 1 ? base : `${base}_${n}`);
    });
    this._cprmvRuleUriMap = map;
    return map;
  }

  /**
   * Bare primary rulesetId (BWB / CVDR) parsed from the service's legal resource.
   * Rules that carry no rulesetId of their own are grouped under this RuleSet.
   */
  primaryRulesetId() {
    const primaryBwbId = this.legalResource?.bwbId || '';
    const primaryMatch = primaryBwbId.match(/(BWB[A-Z]?\d+|CVDR\d+)/i);
    return primaryMatch ? primaryMatch[0] : 'default';
  }

  /**
   * Generate the CPRMV RuleSet section (CPRMV 0.4.1 conformant).
   *
   * One cprmv:RuleSet per unique rulesetId, each carrying the RuleSetShape-required
   * properties: cprmv:id, cprmv:validFrom^^xsd:date, cprmv:isOutputOf → the
   * cpsv:PublicService, cprmv:hasMethod → a typed cprmv:RuleMethod, and an ordered
   * cprmv:hasPart list of its Rules, plus a prov:wasDerivedFrom link to the legal
   * source for provenance continuity.
   *
   * @returns {string} CPRMV RuleSet TTL
   */
  generateRuleSetsSection() {
    if (this.cprmvRules.length === 0) return '';

    const primaryRulesetId = this.primaryRulesetId();
    const manualVersion = this.legalResource?.version || '';

    // Group rules by rulesetId; rules without one attach to the primary RuleSet.
    const groups = new Map();
    this.cprmvRules.forEach((rule) => {
      const key = rule.rulesetId || primaryRulesetId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(rule);
    });

    let ttl = '';

    for (const [rulesetId, rules] of groups) {
      const isPrimary = rulesetId === primaryRulesetId;
      // Date axis: derive each RuleSet's version from the BWB date its own rules
      // carry (ruleIdPath) so cprmv:validFrom and the versioned id match the
      // rules' applicable_date. This also dates non-primary rulesets correctly
      // (previously they were version-less). Fall back to the manually-entered
      // version (primary only), then to today via cprmvValidFrom().
      const derivedDate = this.rulesetDateFromRules(rules);
      const rulesetVersion = derivedDate || (isPrimary ? manualVersion : '');
      const isIsoVersion = /^\d{4}-\d{2}-\d{2}$/.test(rulesetVersion);
      const validFrom = isIsoVersion ? rulesetVersion : this.cprmvValidFrom();
      const idSuffix = isIsoVersion ? `${rulesetId}_${rulesetVersion}` : rulesetId;
      const rulesetUri = `https://cprmv.open-regels.nl/rulesets/${encodeURIComponentTTL(idSuffix)}`;
      const methodUri = `${rulesetUri}/method`;
      const legalUri = this.buildLegalUriForRulesetId(rulesetId, rulesetVersion);

      // RuleMethod — dual-typed so `sh:class cprmv:RuleMethod` passes without
      // subclass entailment (the SHACL validator performs none).
      ttl += `<${methodUri}> a cprmv:RuleMethod, cprmv:CodificationMethod ;\n`;
      ttl += `    cprmv:id "${escapeTTLString(rulesetId)}-method" .\n\n`;

      // RuleSet — typed only cprmv:RuleSet. We deliberately do NOT co-type it as
      // dcat:Dataset: the 0.4.1 ontology models a RuleSet as *part of* a dcat:Dataset
      // (cprmv:is_part_of), not as one, and the dcat:Dataset shape would otherwise
      // require dct:title/description/publisher we don't have.
      ttl += `<${rulesetUri}> a cprmv:RuleSet ;\n`;
      ttl += `    cprmv:id "${escapeTTLString(idSuffix)}" ;\n`;
      ttl += `    cprmv:validFrom "${validFrom}"^^xsd:date ;\n`;
      if (this.service?.identifier) {
        ttl += `    cprmv:isOutputOf <${this.serviceUri}> ;\n`;
      }
      ttl += `    cprmv:hasMethod <${methodUri}> ;\n`;
      if (legalUri) {
        ttl += `    prov:wasDerivedFrom <${legalUri}> ;\n`;
      }
      if (isPrimary && this.legalResource?.title) {
        ttl += `    dct:title "${escapeTTLString(this.legalResource.title)}"@nl ;\n`;
      }
      ttl += `    cprmv:rulesetId "${escapeTTLString(rulesetId)}" ;\n`;

      const memberUris = rules.map((rule) => `<${this.cprmvRuleUri(rule)}>`).join(' ');
      ttl += `    cprmv:hasPart (${memberUris}) .\n\n`;
    }

    return ttl;
  }

  /**
   * Generate the CPRMV Dataset section (CPRMV 0.3.x publish shape). One
   * cprmv:Dataset / dcat:Dataset per unique rulesetId, carrying the metadata the
   * LDE /v1/norms dataset_versions query reads: cprmv:rulesetId and dct:issued
   * (always), plus dcat:version and dct:title. The version is the date the
   * ruleset's own rules carry (see rulesetDateFromRules), so each Dataset's
   * dcat:version matches its rules' applicable_date by construction; dct:title is
   * emitted for the primary ruleset only. Used for the 0.3.2 target in place of
   * the 0.4.1 RuleSet section.
   *
   * @returns {string} CPRMV Dataset TTL
   */
  generateDatasetsSection() {
    if (this.cprmvRules.length === 0) return '';

    const primaryRulesetId = this.primaryRulesetId();
    const manualVersion = this.legalResource?.version || '';
    // xsd:dateTime publication timestamp without milliseconds.
    const issued = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    const groups = new Map();
    this.cprmvRules.forEach((rule) => {
      const key = rule.rulesetId || primaryRulesetId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(rule);
    });

    let ttl = '';

    for (const [rulesetId, rules] of groups) {
      const isPrimary = rulesetId === primaryRulesetId;
      // Date derived from the ruleset's own rules; manual version is a primary-
      // only fallback. Drives both dcat:version and the dataset/legal URIs.
      const derivedDate = this.rulesetDateFromRules(rules) || (isPrimary ? manualVersion : '');
      const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(derivedDate);
      const datasetId = isIsoDate ? `${rulesetId}_${derivedDate}` : rulesetId;
      const datasetUri = `https://cprmv.open-regels.nl/datasets/${encodeURIComponentTTL(datasetId)}`;
      const legalUri = this.buildLegalUriForRulesetId(rulesetId, isIsoDate ? derivedDate : '');

      ttl += `<${datasetUri}> a cprmv:Dataset, dcat:Dataset ;\n`;
      ttl += `    dct:identifier "${escapeTTLString(datasetId)}" ;\n`;
      if (isPrimary && this.legalResource?.title) {
        ttl += `    dct:title "${escapeTTLString(this.legalResource.title)}"@nl ;\n`;
      }
      ttl += `    cprmv:rulesetId "${escapeTTLString(rulesetId)}" ;\n`;
      if (legalUri) {
        ttl += `    cprmv:implements <${legalUri}> ;\n`;
      }
      if (isIsoDate) {
        ttl += `    dcat:version "${derivedDate}" ;\n`;
      }
      ttl += `    dct:issued "${issued}"^^xsd:dateTime ;\n`;
      if (legalUri) {
        ttl += `    dcat:landingPage <${legalUri}> ;\n`;
      }
      ttl = ttl.slice(0, -2) + ' .\n\n';
    }

    return ttl;
  }

  generateCprmvRulesSection() {
    let ttl = '';

    this.cprmvRules.forEach((rule) => {
      // Write if at least the core identifiers exist
      const hasMinimalData = rule.ruleId || rule.rulesetId || rule.definition;

      if (hasMinimalData) {
        // Deterministic subject URI shared with the RuleSet hasPart list emitter.
        const ruleUri = this.cprmvRuleUri(rule);

        ttl += `<${ruleUri}> a cprmv:Rule ;\n`;

        // cprmv:id is required by RuleShape — always emit one, falling back to the
        // rule id path (or a placeholder) when no explicit ruleId was provided.
        const ruleIdValue = rule.ruleId || rule.ruleIdPath || 'rule';
        ttl += `    cprmv:id "${escapeTTLString(ruleIdValue)}" ;\n`;

        if (rule.rulesetId) {
          ttl += `    cprmv:rulesetId "${escapeTTLString(rule.rulesetId)}" ;\n`;
        }

        if (rule.definition) {
          ttl += `    cprmv:definition "${escapeTTLString(rule.definition)}"@nl ;\n`;
        }

        if (rule.situatie) {
          ttl += `    cprmv:situatie "${escapeTTLString(rule.situatie)}"@nl ;\n`;
        }

        if (rule.norm) {
          ttl += `    cprmv:norm "${escapeTTLString(rule.norm)}" ;\n`;
        }

        if (rule.ruleIdPath) {
          ttl += `    cprmv:ruleIdPath "${escapeTTLString(rule.ruleIdPath)}" ;\n`;
        }

        // Auto-link to legal resource at the rule level.
        // Preference order:
        //   1. The rule's own rulesetId — most accurate for multi-BWB services;
        //      the version is inherited from the service's legalResource only when
        //      the rule's rulesetId matches the service's primary (since that's
        //      the only ruleset whose version we know with confidence).
        //   2. The service's primary legal resource — fallback for rules without
        //      a rulesetId, preserves prior single-BWB behaviour.
        let ruleLegalUri = null;

        if (rule.rulesetId) {
          // Extract bare rulesetId from the service's legalResource for comparison
          // (handles both "BWBR0015703" and the full-URI form)
          const primaryBwbId = this.legalResource?.bwbId || '';
          const primaryMatch = primaryBwbId.match(/(BWB[A-Z]?\d+|CVDR\d+)/i);
          const primaryRulesetId = primaryMatch ? primaryMatch[0] : '';
          const isPrimary = rule.rulesetId === primaryRulesetId;
          const version = isPrimary ? this.legalResource?.version || '' : '';

          ruleLegalUri = this.buildLegalUriForRulesetId(rule.rulesetId, version);
        } else {
          ruleLegalUri = this.buildLegalResourceUri();
        }

        if (ruleLegalUri) {
          ttl += `    cprmv:implements <${ruleLegalUri}> ;\n`;
        }

        ttl = ttl.slice(0, -2) + ' .\n\n';
      }
    });

    return ttl;
  }

  /**
   * Strip DMN section headers from imported blocks
   * Removes only the section header, no comment preservation
   * @param {string} dmnBlocks - Raw DMN TTL blocks
   * @returns {string} DMN blocks without section header
   */
  stripDmnHeaders(dmnBlocks) {
    // Remove DMN section header (60 = chars, generated by generateSectionHeader)
    const sectionHeaderPattern = /^# ={20,}\s*\n# .*DMN.*\n# ={20,}\s*\n\n?/gm;
    let cleaned = dmnBlocks.replace(sectionHeaderPattern, '');

    // Remove NL-SBB concepts header block captured as trailing comment lines
    // These are re-generated by generateConceptsSection()
    cleaned = cleaned.replace(/\n?# ={20,}[^\n]*\n# NL-SBB[^\n]*\n# ={20,}[^\n]*/g, '');

    // Remove any leading whitespace
    cleaned = cleaned.replace(/^\s+/, '');

    return cleaned;
  }

  /**
   * Normalize preserved imported DMN Decision Rule blocks for CPSV-AP conformance.
   *
   * Imported DMN blocks are kept verbatim (Option 3 preservation), so Decision Rules
   * authored by older exports / foreign tools may miss the CPSV-AP RuleShape essentials:
   * a cpsv:Rule needs dct:title and dct:description, and cpsv:implements must resolve to
   * an eli:LegalResource (older exports pointed it at the cpsv:PublicService). This makes
   * only additive / repointing edits per cpsv:Rule block — no data is dropped — so a
   * re-imported project validates clean without losing the preserved DMN triples.
   *
   * @param {string} ttl - preserved DMN TTL (after stripDmnHeaders)
   * @returns {string} normalized DMN TTL
   */
  normalizeImportedDmnBlocks(ttl) {
    const legalUri = this.legalResourceSubjectUri();

    const injectAfterTypeLine = (block, predicate) => {
      const nl = block.indexOf('\n');
      if (nl === -1) return block;
      return `${block.slice(0, nl + 1)}    ${predicate} ;\n${block.slice(nl + 1)}`;
    };

    return ttl
      .split('\n\n')
      .map((block) => {
        // Only touch cpsv:Rule subjects (Decision Rules); leave DecisionModel / Input /
        // Output / Concept blocks untouched.
        if (!/\ba\s+[^.;]*\bcpsv:Rule\b/.test(block)) return block;

        // Rule id: prefer dct:identifier, else the trailing URI path segment.
        let id = (block.match(/dct:identifier\s+"([^"]*)"/) || [])[1];
        if (!id) {
          const m = block.match(/\/rules\/([^>\s]+)>/);
          id = m ? decodeURIComponent(m[1]) : 'decision-rule';
        }

        // cpsv:implements must point at an eli:LegalResource. Only repoint the known-bad
        // case (it points at a PublicService); leave any other existing target alone.
        const implementsMatch = block.match(/cpsv:implements\s+<([^>]*)>/);
        if (implementsMatch && implementsMatch[1].includes('/services/')) {
          if (legalUri) {
            block = block.replace(/cpsv:implements\s+<[^>]*>/, `cpsv:implements <${legalUri}>`);
          } else {
            // No legal resource to point at — drop the non-conformant predicate.
            block = block
              .replace(/\n[ \t]*cpsv:implements\s+<[^>]*>\s*;/, '')
              .replace(/;\s*\n[ \t]*cpsv:implements\s+<[^>]*>\s*\./, ' .');
          }
        }

        if (!/\bdct:title\b/.test(block)) {
          block = injectAfterTypeLine(block, `dct:title "Decision rule ${escapeTTLString(id)}"@nl`);
        }
        if (!/\bdct:description\b/.test(block)) {
          block = injectAfterTypeLine(
            block,
            `dct:description "${escapeTTLString(`Decision rule ${id} of the DMN decision model.`)}"@nl`
          );
        }
        return block;
      })
      .join('\n\n');
  }

  /**
   * Generate DMN section
   * Handles both imported (preserved) and newly created DMN
   * @returns {string} DMN TTL
   */
  generateDmnSection() {
    // Imported DMN (preserved blocks) — normalized for CPSV-AP conformance.
    if (this.dmnData.isImported && this.dmnData.importedDmnBlocks) {
      return this.normalizeImportedDmnBlocks(this.stripDmnHeaders(this.dmnData.importedDmnBlocks));
    }

    // Regular DMN (generate fresh TTL)
    if (this.dmnData && this.dmnData.fileName && this.dmnData.content) {
      let ttl = '';
      const dmnUri = `${this.serviceUri}/dmn`;

      // 1. DMN Model metadata
      ttl += `<${dmnUri}> a cprmv:DecisionModel ;\n`;
      ttl += `    dct:identifier "${this.dmnData.decisionKey || 'unknown'}" ;\n`;
      ttl += `    dct:title "${this.dmnData.fileName}"@nl ;\n`;
      ttl += `    cprmv:implements <${this.serviceUri}> ;\n`;
      ttl += `    dct:source <${this.serviceUri}/dmn/file> ;\n`;

      if (this.dmnData.deploymentId) {
        ttl += `    cprmv:deploymentId "${this.dmnData.deploymentId}" ;\n`;
      }

      if (this.dmnData.deployedAt) {
        ttl += `    cprmv:deployedAt "${this.dmnData.deployedAt}"^^xsd:dateTime ;\n`;
      }

      if (this.dmnData.apiEndpoint) {
        ttl += `    cprmv:implementedBy <${this.dmnData.apiEndpoint}> ;\n`;
      }

      if (this.dmnData.lastTestResult && this.dmnData.lastTestTimestamp) {
        ttl += `    cprmv:lastTested "${this.dmnData.lastTestTimestamp}"^^xsd:dateTime ;\n`;
        ttl += `    cprmv:testStatus "passed" ;\n`;
      }

      // NEW: Validation metadata (only if status is not "not-validated")
      if (this.dmnData.validationStatus && this.dmnData.validationStatus !== 'not-validated') {
        ttl += `    ronl:validationStatus "${this.dmnData.validationStatus}"^^xsd:string ;\n`;

        if (this.dmnData.validatedBy && this.dmnData.validatedBy.trim() !== '') {
          ttl += `    ronl:validatedBy <${this.dmnData.validatedBy}> ;\n`;
        }

        if (this.dmnData.validatedAt && this.dmnData.validatedAt.trim() !== '') {
          ttl += `    ronl:validatedAt "${this.dmnData.validatedAt}"^^xsd:date ;\n`;
        }

        if (this.dmnData.validationNote && this.dmnData.validationNote.trim() !== '') {
          ttl += `    ronl:validationNote "${escapeTTLString(this.dmnData.validationNote)}"@nl ;\n`;
        }
      }

      ttl += `    dct:description "DMN decision model for service evaluation"@nl .\n\n`;

      // 2. Extract inputs
      const inputs = extractInputsFromTestResult(this.dmnData);
      if (inputs.length > 0) {
        inputs.forEach((input, index) => {
          const inputUri = `${dmnUri}/input/${index + 1}`;
          ttl += `<${inputUri}> a cpsv:Input ;\n`;
          ttl += `    dct:identifier "${input.name}" ;\n`;
          ttl += `    dct:title "${input.name}"@nl ;\n`;
          ttl += `    dct:type "${input.type}" ;\n`;
          if (input.exampleValue !== null && input.exampleValue !== undefined) {
            const valueStr =
              typeof input.exampleValue === 'string'
                ? `"${escapeTTLString(input.exampleValue)}"`
                : input.exampleValue;
            ttl += `    schema:value ${valueStr} ;\n`;
          }
          ttl += `    cpsv:isRequiredBy <${dmnUri}> .\n\n`;
        });
      }

      // 3. Extract outputs (NEW!)
      const outputs = extractOutputsFromTestResult(this.dmnData);
      if (outputs.length > 0) {
        outputs.forEach((output, index) => {
          const outputUri = `${dmnUri}/output/${index + 1}`;
          ttl += `<${outputUri}> a cpsv:Output ;\n`;
          ttl += `    dct:identifier "${output.name}" ;\n`;
          ttl += `    dct:title "${output.name}"@nl ;\n`;
          ttl += `    dct:type "${output.type}" ;\n`;
          if (output.exampleValue !== null && output.exampleValue !== undefined) {
            const valueStr =
              typeof output.exampleValue === 'string'
                ? `"${escapeTTLString(output.exampleValue)}"`
                : output.exampleValue;
            ttl += `    schema:value ${valueStr} ;\n`;
          }
          ttl += `    cpsv:produces <${dmnUri}> .\n\n`;
        });
      }

      // 4. Extract DMN rules
      const rules = extractRulesFromDMN(this.dmnData.content, this.serviceUri);
      if (rules.length > 0) {
        rules.forEach((rule) => {
          ttl += `<${rule.uri}> a cpsv:Rule, cprmv:DecisionRule ;\n`;
          ttl += `    dct:identifier "${rule.id}" ;\n`;
          // dct:title / dct:description are required by CPSV-AP RuleShape (minCount 1).
          ttl += `    dct:title "Decision rule ${escapeTTLString(rule.id)}"@nl ;\n`;
          ttl += `    dct:description "${escapeTTLString(rule.note || 'Decision rule ' + rule.id + ' of the DMN decision model.')}"@nl ;\n`;
          // cpsv:implements must resolve to an eli:LegalResource; emit only when present.
          const legalSubjectUri = this.legalResourceSubjectUri();
          if (legalSubjectUri) {
            ttl += `    cpsv:implements <${legalSubjectUri}> ;\n`;
          }

          if (rule.extends) {
            const extendsUri = rule.extends.startsWith('http')
              ? rule.extends
              : `https://wetten.overheid.nl/${rule.extends}`;
            ttl += `    cprmv:isBasedOn <${extendsUri}> ;\n`;
          }

          if (rule.validFrom) {
            ttl += `    cprmv:validFrom "${rule.validFrom}"^^xsd:date ;\n`;
          }

          if (rule.validUntil) {
            ttl += `    cprmv:validUntil "${rule.validUntil}"^^xsd:date ;\n`;
          }

          ttl += `    cprmv:ruleType "${rule.ruleType}" ;\n`;
          ttl += `    cprmv:confidence "${rule.confidence}" ;\n`;

          if (rule.note) {
            ttl += `    cprmv:note "${escapeTTLString(rule.note)}"@nl ;\n`;
          }

          ttl += `    cprmv:decisionTable "${rule.tableId}" ;\n`;
          ttl += `    cprmv:rulesetType "${rule.rulesetType}" .\n\n`;
        });
      }

      return ttl;
    }

    return '';
  }

  /**
   * Generate NL-SBB concept definitions from state
   * @returns {string} TTL representation of concepts
   */
  generateConceptsSection() {
    if (!this.concepts || this.concepts.length === 0) {
      return '';
    }

    let ttl = '';

    ttl += '# =====================================\n';
    ttl += '# NL-SBB Concept Definitions (DMN Variables)\n';
    ttl += '# =====================================\n\n';

    // 1. Concept Scheme
    const schemeUri = 'https://regels.overheid.nl/schemes/dmn-variables';
    ttl += `<${schemeUri}> a skos:ConceptScheme ;\n`;
    ttl += `    dct:title "DMN Variabelen Begrippenkader"@nl ;\n`;
    ttl += `    dct:description "Begrippenkader voor invoer- en uitvoervariabelen van DMN beslisregels in het RONL stelsel."@nl ;\n`;
    ttl += `    dct:creator "RONL" ;\n`;
    ttl += `    dct:created "${new Date().toISOString().split('T')[0]}"^^xsd:date .\n\n`;

    // Separate inputs and outputs
    const inputConcepts = this.concepts.filter((c) => c.linkedToType === 'input');
    const outputConcepts = this.concepts.filter((c) => c.linkedToType === 'output');

    // 2. Input Concepts
    if (inputConcepts.length > 0) {
      ttl += '# Input Variable Concepts\n\n';

      inputConcepts.forEach((concept) => {
        ttl += `<${sanitizeIri(concept.uri)}> a skos:Concept ;\n`;
        ttl += `    skos:prefLabel "${escapeTTLString(concept.prefLabel)}"@nl ;\n`;
        ttl += `    skos:definition "${escapeTTLString(concept.definition)}"@nl ;\n`;
        ttl += `    skos:notation "${concept.notation}" ;\n`;
        ttl += `    dct:subject <${sanitizeIri(`${this.serviceUri}/dmn/${concept.linkedTo}`)}> ;\n`;
        ttl += `    dct:type "${concept.type}" ;\n`;

        if (concept.exactMatch && concept.exactMatch.trim() !== '') {
          ttl += `    skos:exactMatch <${sanitizeExactMatchIri(concept.exactMatch)}> ;\n`;
        }

        ttl += `    skos:inScheme <${schemeUri}> .\n\n`;
      });
    }

    // 3. Output Concepts
    if (outputConcepts.length > 0) {
      ttl += '# Output Variable Concepts\n\n';

      outputConcepts.forEach((concept) => {
        ttl += `<${sanitizeIri(concept.uri)}> a skos:Concept ;\n`;
        ttl += `    skos:prefLabel "${escapeTTLString(concept.prefLabel)}"@nl ;\n`;
        ttl += `    skos:definition "${escapeTTLString(concept.definition)}"@nl ;\n`;
        ttl += `    skos:notation "${concept.notation}" ;\n`;
        ttl += `    dct:subject <${sanitizeIri(`${this.serviceUri}/dmn/${concept.linkedTo}`)}> ;\n`;
        ttl += `    dct:type "${concept.type}" ;\n`;

        if (concept.exactMatch && concept.exactMatch.trim() !== '') {
          ttl += `    skos:exactMatch <${sanitizeExactMatchIri(concept.exactMatch)}> ;\n`;
        }

        ttl += `    skos:inScheme <${schemeUri}> .\n\n`;
      });
    }

    return ttl;
  }

  /**
   * Generate Vendor Service section
   * @returns {string} Vendor Service TTL
   */
  generateVendorServiceSection() {
    if (!this.hasVendorService()) {
      return '';
    }

    const vendor = this.vendorService;
    const vendorUri = `${this.serviceUri}/vendor`;

    let ttl = '';

    // Main vendor service entity
    ttl += `<${vendorUri}> a ronl:VendorService ;\n`;
    ttl += `    ronl:basedOn <${this.serviceUri}/dmn> ;\n`;
    ttl += `    ronl:implementedBy <${vendor.selectedVendor}> ;\n`;

    // Contact information (if any field is filled)
    const hasContact =
      vendor.contact.organizationName ||
      vendor.contact.contactPerson ||
      vendor.contact.email ||
      vendor.contact.phone ||
      vendor.contact.website ||
      vendor.contact.logo;

    if (hasContact) {
      ttl += `    schema:provider [\n`;
      ttl += `        a schema:Organization ;\n`;

      if (vendor.contact.organizationName) {
        ttl += `        schema:name "${escapeTTLString(vendor.contact.organizationName)}" ;\n`;
      }

      // Logo - generate asset path reference (actual upload happens during publish)
      if (vendor.contact.logo && vendor.contact.logo.trim() !== '') {
        // Extract vendor name from URI for filename
        const vendorUri = vendor.selectedVendor;
        const vendorName = vendorUri.split('/').pop(); // e.g., "Blueriq"
        const logoPath = `./assets/${vendorName}_vendor_logo.png`;

        ttl += `        schema:image <${logoPath}> ;\n`;
      }

      const hasContactPoint =
        vendor.contact.contactPerson || vendor.contact.email || vendor.contact.phone;

      if (hasContactPoint) {
        ttl += `        schema:contactPoint [\n`;

        if (vendor.contact.contactPerson) {
          ttl += `            schema:name "${escapeTTLString(vendor.contact.contactPerson)}" ;\n`;
        }
        if (vendor.contact.email) {
          ttl += `            schema:email "${escapeTTLString(vendor.contact.email)}" ;\n`;
        }
        if (vendor.contact.phone) {
          ttl += `            schema:telephone "${escapeTTLString(vendor.contact.phone)}" ;\n`;
        }

        // Remove trailing semicolon and close contactPoint
        ttl = ttl.slice(0, -2) + '\n';
        ttl += `        ] ;\n`;
      }

      if (vendor.contact.website) {
        ttl += `        foaf:homepage <${vendor.contact.website}> ;\n`;
      }

      // Remove trailing semicolon and close provider
      ttl = ttl.slice(0, -2) + '\n';
      ttl += `    ] ;\n`;
    }

    // Technical information
    if (vendor.technical.serviceUrl) {
      ttl += `    schema:url <${vendor.technical.serviceUrl}> ;\n`;
    }

    if (vendor.technical.license) {
      ttl += `    schema:license "${escapeTTLString(vendor.technical.license)}" ;\n`;
    }

    if (vendor.technical.accessType) {
      ttl += `    ronl:accessType "${vendor.technical.accessType}" ;\n`;
    }

    // Service notes
    if (vendor.serviceNotes && vendor.serviceNotes.trim() !== '') {
      ttl += `    dct:description "${escapeTTLString(vendor.serviceNotes)}"@nl ;\n`;
    }

    // Certification metadata (only if status is not "not-certified")
    if (vendor.certification.status && vendor.certification.status !== 'not-certified') {
      ttl += `    ronl:certificationStatus "${vendor.certification.status}"^^xsd:string ;\n`;

      if (vendor.certification.certifiedBy && vendor.certification.certifiedBy.trim() !== '') {
        ttl += `    ronl:certifiedBy <${vendor.certification.certifiedBy}> ;\n`;
      }

      if (vendor.certification.certifiedAt && vendor.certification.certifiedAt.trim() !== '') {
        ttl += `    ronl:certifiedAt "${vendor.certification.certifiedAt}"^^xsd:date ;\n`;
      }

      if (
        vendor.certification.certificationNote &&
        vendor.certification.certificationNote.trim() !== ''
      ) {
        ttl += `    ronl:certificationNote "${escapeTTLString(vendor.certification.certificationNote)}"@nl ;\n`;
      }
    }

    // Close statement
    ttl = ttl.slice(0, -2) + ' .\n\n';

    return ttl;
  }
}

/**
 * Convenience function for easy use in App.js
 * @param {Object} state - Complete editor state
 * @returns {string} Generated TTL
 */
export const generateTTL = (state) => {
  const generator = new TTLGenerator(state);
  return generator.generate();
};
