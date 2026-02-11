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
  sanitizeRuleIdPath,
  TTL_NAMESPACES,
} from './index';

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
    this.ronlAnalysis = state.ronlAnalysis || '';
    this.ronlMethod = state.ronlMethod || '';
    this.temporalRules = state.temporalRules;
    this.parameters = state.parameters;
    this.cprmvRules = state.cprmvRules;
    this.cost = state.cost;
    this.output = state.output;
    this.dmnData = state.dmnData;
    this.concepts = state.concepts || [];

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

    // NL-SBB Concepts section
    if (this.hasDMN()) {
      ttl += this.generateConceptsSection();
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
      ttl += `    cv:spatial <${this.organization.spatial}> ;\n`;
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

    // Determine the legal URI based on identifier type
    let legalUri;
    const identifier = this.legalResource.bwbId;
    const isFullUri = identifier.startsWith('http://') || identifier.startsWith('https://');

    if (isFullUri) {
      // Use the provided URI directly
      legalUri = identifier;
    } else {
      // Detect BWB or CVDR and generate appropriate URI
      const isBWB = /BWB[A-Z]?\d+/i.test(identifier);
      const isCVDR = /CVDR\d+/i.test(identifier);

      if (isBWB) {
        legalUri = `https://wetten.overheid.nl/${identifier}`;
      } else if (isCVDR) {
        // CVDR URIs include version number, default to /1
        legalUri = `https://lokaleregelgeving.overheid.nl/${identifier}/1`;
      } else {
        // Fallback: assume BWB format
        legalUri = `https://wetten.overheid.nl/${identifier}`;
      }
    }

    ttl += `<${legalUri}> a eli:LegalResource ;\n`;

    // Extract just the ID portion (without URI prefix) for dct:identifier
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
      ttl += `    ronl:hasAnalysis ${analysisUri} ;\n`;
    }

    if (this.ronlMethod) {
      const methodUri = this.ronlMethod.startsWith('http')
        ? `<${this.ronlMethod}>`
        : this.ronlMethod;
      ttl += `    ronl:hasMethod ${methodUri} ;\n`;
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

  generateCprmvRulesSection() {
    let ttl = '';

    this.cprmvRules.forEach((rule) => {
      // Write if at least the core identifiers exist
      const hasMinimalData = rule.ruleId || rule.rulesetId || rule.definition;

      if (hasMinimalData) {
        // Generate URI using ruleIdPath for uniqueness (FIXED!)
        // Fallback to rulesetId_ruleId if ruleIdPath is not available
        let ruleUriIdentifier;
        if (rule.ruleIdPath) {
          ruleUriIdentifier = sanitizeRuleIdPath(rule.ruleIdPath);
        } else {
          const ruleId = rule.ruleId || 'incomplete';
          const rulesetId = rule.rulesetId || 'incomplete';
          ruleUriIdentifier = `${encodeURIComponentTTL(rulesetId)}_${encodeURIComponentTTL(ruleId)}`;
        }

        const ruleUri = `https://cprmv.open-regels.nl/rules/${ruleUriIdentifier}`;

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

        // Auto-link to legal resource (versioned if available)
        if (this.legalResource && this.legalResource.bwbId) {
          let legalUri;
          const identifier = this.legalResource.bwbId;
          const isFullUri = identifier.startsWith('http://') || identifier.startsWith('https://');

          if (isFullUri) {
            legalUri = identifier;
          } else {
            const isBWB = /BWB[A-Z]?\d+/i.test(identifier);
            const isCVDR = /CVDR\d+/i.test(identifier);

            if (isBWB) {
              legalUri = `https://wetten.overheid.nl/${identifier}`;
            } else if (isCVDR) {
              legalUri = `https://lokaleregelgeving.overheid.nl/${identifier}/1`;
            } else {
              legalUri = `https://wetten.overheid.nl/${identifier}`;
            }
          }

          // If version exists, append it to create versioned URI
          if (this.legalResource.version) {
            legalUri = `${legalUri}/${this.legalResource.version}`;
          }

          ttl += `    cprmv:implements <${legalUri}> ;\n`;
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
   * Generate DMN section
   * Handles both imported (preserved) and newly created DMN
   * @returns {string} DMN TTL
   */
  generateDmnSection() {
    // Imported DMN (preserved blocks)
    if (this.dmnData.isImported && this.dmnData.importedDmnBlocks) {
      return this.stripDmnHeaders(this.dmnData.importedDmnBlocks);
    }

    // Regular DMN (generate fresh TTL)
    if (this.dmnData && this.dmnData.fileName && this.dmnData.content) {
      let ttl = '';
      const dmnUri = `${this.serviceUri}/dmn`;

      // 1. DMN Model metadata
      ttl += `<${dmnUri}> a cprmv:DecisionModel ;\n`;
      ttl += `    dct:identifier "${this.dmnData.decisionKey || 'unknown'}" ;\n`;
      ttl += `    dct:title "${this.dmnData.fileName}"@nl ;\n`;
      ttl += `    ronl:implements <${this.serviceUri}> ;\n`;
      ttl += `    dct:source <${this.serviceUri}/dmn/file> ;\n`;

      if (this.dmnData.deploymentId) {
        ttl += `    cprmv:deploymentId "${this.dmnData.deploymentId}" ;\n`;
      }

      if (this.dmnData.deployedAt) {
        ttl += `    cprmv:deployedAt "${this.dmnData.deployedAt}"^^xsd:dateTime ;\n`;
      }

      if (this.dmnData.apiEndpoint) {
        ttl += `    ronl:implementedBy <${this.dmnData.apiEndpoint}> ;\n`;
      }

      if (this.dmnData.lastTestResult && this.dmnData.lastTestTimestamp) {
        ttl += `    cprmv:lastTested "${this.dmnData.lastTestTimestamp}"^^xsd:dateTime ;\n`;
        ttl += `    cprmv:testStatus "passed" ;\n`;
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
          ttl += `    cpsv:implements <${this.serviceUri}> ;\n`;

          if (rule.extends) {
            const extendsUri = rule.extends.startsWith('http')
              ? rule.extends
              : `https://wetten.overheid.nl/${rule.extends}`;
            ttl += `    cprmv:extends <${extendsUri}> ;\n`;
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
        ttl += `<${concept.uri}> a skos:Concept ;\n`;
        ttl += `    skos:prefLabel "${escapeTTLString(concept.prefLabel)}"@nl ;\n`;
        ttl += `    skos:definition "${escapeTTLString(concept.definition)}"@nl ;\n`;
        ttl += `    skos:notation "${concept.notation}" ;\n`;
        ttl += `    dct:subject <${this.serviceUri}/dmn/${concept.linkedTo}> ;\n`;
        ttl += `    dct:type "${concept.type}" ;\n`;

        if (concept.exactMatch && concept.exactMatch.trim() !== '') {
          ttl += `    skos:exactMatch <${concept.exactMatch}> ;\n`;
        }

        ttl += `    skos:inScheme <${schemeUri}> .\n\n`;
      });
    }

    // 3. Output Concepts
    if (outputConcepts.length > 0) {
      ttl += '# Output Variable Concepts\n\n';

      outputConcepts.forEach((concept) => {
        ttl += `<${concept.uri}> a skos:Concept ;\n`;
        ttl += `    skos:prefLabel "${escapeTTLString(concept.prefLabel)}"@nl ;\n`;
        ttl += `    skos:definition "${escapeTTLString(concept.definition)}"@nl ;\n`;
        ttl += `    skos:notation "${concept.notation}" ;\n`;
        ttl += `    dct:subject <${this.serviceUri}/dmn/${concept.linkedTo}> ;\n`;
        ttl += `    dct:type "${concept.type}" ;\n`;

        if (concept.exactMatch && concept.exactMatch.trim() !== '') {
          ttl += `    skos:exactMatch <${concept.exactMatch}> ;\n`;
        }

        ttl += `    skos:inScheme <${schemeUri}> .\n\n`;
      });
    }

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
