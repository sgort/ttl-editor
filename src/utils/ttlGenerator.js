/* eslint-disable no-unused-vars */
import { generateCompleteDMNSection, sanitizeServiceIdentifier } from './dmnHelpers';
import { buildResourceUri, encodeURIComponentTTL, escapeTTLString, TTL_NAMESPACES } from './index';

/**
 * TTL Generator Class
 * Generates complete TTL documents from editor state
 */
export class TTLGenerator {
  constructor(state) {
    // Store all state we need
    this.service = state.service;
    this.organization = state.organization;
    this.legalResource = state.legalResource;
    this.temporalRules = state.temporalRules;
    this.parameters = state.parameters;
    this.cprmvRules = state.cprmvRules;
    this.cost = state.cost;
    this.output = state.output;
    this.dmnData = state.dmnData;

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

    // CPRMV Rules section
    if (this.hasCprmvRules()) {
      ttl += this.generateSectionHeader('CPRMV Rules');
      ttl += this.generateCprmvRulesSection();
    }

    // DMN section
    if (this.hasDMN()) {
      ttl += this.generateSectionHeader('DMN Decision Model');
      ttl += this.generateDmnSection();
    }

    return ttl;
  }

  /**
   * Generate namespace prefixes
   * @returns {string} TTL namespace declarations
   */
  generateNamespaces() {
    return TTL_NAMESPACES;
  }

  /**
   * Generate section header comment
   * @param {string} title - Section title
   * @returns {string} Formatted header comment
   */
  generateSectionHeader(title) {
    return `# ========================================\n# ${title}\n# ========================================\n\n`;
  }

  /**
   * Check if temporal rules exist
   * @returns {boolean}
   */
  hasTemporalRules() {
    return this.temporalRules.some(
      (rule) =>
        rule.uri ||
        rule.extends ||
        rule.identifier ||
        rule.title ||
        rule.validFrom ||
        rule.validUntil ||
        rule.confidenceLevel ||
        rule.description
    );
  }

  /**
   * Check if parameters exist
   * @returns {boolean}
   */
  hasParameters() {
    return this.parameters.some((param) => param.notation || param.value || param.label);
  }

  /**
   * Check if CPRMV rules exist
   * @returns {boolean}
   */
  hasCprmvRules() {
    return this.cprmvRules.some((rule) => rule.ruleId || rule.rulesetId || rule.definition);
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
    if (this.dmnData && this.dmnData.fileName) {
      ttl += `    cprmv:hasDecisionModel <${this.serviceUri}/dmn> ;\n`;
    }

    // Close statement
    ttl = ttl.slice(0, -2) + ' .\n\n';

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
    ttl += `    dct:identifier "${escapeTTLString(this.organization.identifier)}" ;\n`;

    if (this.organization.name) {
      ttl += `    skos:prefLabel "${escapeTTLString(this.organization.name)}"@nl ;\n`;
    }

    if (this.organization.homepage) {
      ttl += `    foaf:homepage <${this.organization.homepage}> ;\n`;
    }

    if (this.organization.spatial) {
      ttl += `    cv:spatial <${this.organization.spatial}> ;\n`;
    }

    ttl = ttl.slice(0, -2) + ' .\n\n';

    return ttl;
  }

  /**
   * Generate Legal Resource section
   * @returns {string} Legal Resource TTL
   */
  generateLegalResourceSection() {
    if (!this.legalResource.bwbId) {
      return '';
    }

    let ttl = '';

    // Support both full URIs and plain BWB IDs
    const lowerBwbId = this.legalResource.bwbId.toLowerCase();
    const legalUri =
      lowerBwbId.startsWith('http://') || lowerBwbId.startsWith('https://')
        ? this.legalResource.bwbId
        : `https://wetten.overheid.nl/${this.legalResource.bwbId}`;

    ttl += `<${legalUri}> a eli:LegalResource ;\n`;

    // Extract just the BWB ID portion if it's a full URI
    const bwbIdOnly = this.legalResource.bwbId.replace(/^https?:\/\/[^/]+\//, '');
    ttl += `    dct:identifier "${escapeTTLString(bwbIdOnly)}" ;\n`;

    if (this.legalResource.title) {
      ttl += `    dct:title "${escapeTTLString(this.legalResource.title)}"@nl ;\n`;
    }

    if (this.legalResource.description) {
      ttl += `    dct:description "${escapeTTLString(this.legalResource.description)}"@nl ;\n`;
    }

    if (this.legalResource.version) {
      ttl += `    eli:is_realized_by <${legalUri}/${this.legalResource.version}> ;\n`;
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

        ttl += `<${ruleUri}> a cpsv:Rule, ronl:TemporalRule ;\n`;
        ttl += `    cpsv:implements <${this.serviceUri}> ;\n`;

        if (rule.identifier) {
          ttl += `    dct:identifier "${escapeTTLString(rule.identifier)}" ;\n`;
        }

        if (rule.title) {
          ttl += `    dct:title "${escapeTTLString(rule.title)}"@nl ;\n`;
        }

        if (rule.extends) {
          const extendsUri = rule.extends.startsWith('http')
            ? rule.extends
            : `https://regels.overheid.nl/rules/${encodeURIComponentTTL(rule.extends)}`;
          ttl += `    ronl:extends <${extendsUri}> ;\n`;
        }

        if (rule.validFrom) {
          ttl += `    ronl:validFrom "${rule.validFrom}"^^xsd:date ;\n`;
        }

        if (rule.validUntil) {
          ttl += `    ronl:validUntil "${rule.validUntil}"^^xsd:date ;\n`;
        }

        if (rule.confidenceLevel) {
          ttl += `    ronl:confidenceLevel "${escapeTTLString(rule.confidenceLevel)}" ;\n`;
        }

        if (rule.description) {
          ttl += `    dct:description "${escapeTTLString(rule.description)}"@nl ;\n`;
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

        ttl += `<${paramUri}> a ronl:ParameterWaarde ;\n`;

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
          ttl += `    ronl:validFrom "${param.validFrom}"^^xsd:date ;\n`;
        }

        if (param.validUntil) {
          ttl += `    ronl:validUntil "${param.validUntil}"^^xsd:date ;\n`;
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
   * Generate CPRMV Rules section
   * @returns {string} CPRMV Rules TTL
   */
  generateCprmvRulesSection() {
    let ttl = '';

    this.cprmvRules.forEach((rule) => {
      // Write if at least the core identifiers exist
      // (User might be filling in the form progressively)
      const hasMinimalData = rule.ruleId || rule.rulesetId || rule.definition;

      if (hasMinimalData) {
        // Generate URI (use placeholder if ruleId/rulesetId not yet filled)
        const ruleId = rule.ruleId || 'incomplete';
        const rulesetId = rule.rulesetId || 'incomplete';
        const ruleUri = `https://cprmv.open-regels.nl/rules/${encodeURIComponentTTL(rulesetId)}_${encodeURIComponentTTL(ruleId)}`;

        ttl += `<${ruleUri}> a cprmv:Rule ;\n`;

        if (rule.ruleId) {
          ttl += `    cprmv:id "${escapeTTLString(rule.ruleId)}" ;\n`;
        }

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

        ttl = ttl.slice(0, -2) + ' .\n\n';
      }
    });

    return ttl;
  }

  /**
   * Strip DMN section headers from imported blocks
   * Only removes the section header block, preserves custom comments
   * @param {string} dmnBlocks - Raw DMN TTL blocks
   * @returns {string} DMN blocks without section header
   */
  stripDmnHeaders(dmnBlocks) {
    const lines = dmnBlocks.split('\n');
    let inHeader = false;
    let headerLineCount = 0;
    const cleanedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Detect start of section header (line with many equals signs)
      if (trimmed.startsWith('#') && trimmed.includes('====')) {
        inHeader = true;
        headerLineCount = 0;
        continue;
      }

      // If we're in a header, count lines
      if (inHeader) {
        headerLineCount++;

        // Section headers have this pattern:
        // Line 1: # ================
        // Line 2: # DMN Decision Model (or similar)
        // Line 3: # ================
        // Line 4: (empty line)

        if (headerLineCount === 1) {
          // This is the title line (e.g., "# DMN Decision Model")
          // Check if it's a DMN-related title
          if (trimmed.startsWith('# DMN') || trimmed.includes('Preserved')) {
            continue; // Skip this line
          } else {
            // Not a DMN header, keep it as a custom comment
            inHeader = false;
            cleanedLines.push(line);
          }
        } else if (headerLineCount === 2) {
          // This should be the closing equals line
          if (trimmed.startsWith('#') && trimmed.includes('====')) {
            continue; // Skip this line
          } else {
            // Unexpected, keep the line
            inHeader = false;
            cleanedLines.push(line);
          }
        } else if (headerLineCount === 3 && trimmed === '') {
          // Empty line after header, skip it
          inHeader = false;
          continue;
        } else {
          // Something unexpected, stop treating as header
          inHeader = false;
          cleanedLines.push(line);
        }
      } else {
        // Not in header, keep the line (including custom comments)
        cleanedLines.push(line);
      }
    }

    // Remove any leading empty lines
    while (cleanedLines.length > 0 && cleanedLines[0].trim() === '') {
      cleanedLines.shift();
    }

    return cleanedLines.join('\n');
  }

  /**
   * Generate DMN section
   * Handles both imported (preserved) and newly created DMN
   * @returns {string} DMN TTL
   */
  generateDmnSection() {
    // Option 3: Imported DMN (preserved blocks)
    if (this.dmnData.isImported && this.dmnData.importedDmnBlocks) {
      // Strip any existing headers from preserved blocks
      // The header will be added by generate() method
      return this.stripDmnHeaders(this.dmnData.importedDmnBlocks);
    }

    // Regular DMN: newly created in DMN tab
    if (this.dmnData && this.dmnData.fileName && this.dmnData.content) {
      return generateCompleteDMNSection(this.dmnData, this.serviceUri);
    }

    return '';
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
