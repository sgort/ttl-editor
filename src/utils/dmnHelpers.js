/**
 * DMN TTL Generation Utilities
 * Functions to generate TTL metadata for DMN decision models
 */

/**
 * Generates TTL for DMN metadata
 * @param {Object} dmnData - DMN metadata object
 * @param {string} serviceUri - URI of the service this DMN implements
 * @returns {string} - TTL representation of DMN metadata
 */
export function generateDMNTTL(dmnData, serviceUri) {
  if (!dmnData || !dmnData.fileName) {
    return '';
  }

  const dmnUri = `${serviceUri}/dmn`;
  const sections = [];

  // DMN Resource
  sections.push(`# DMN Decision Model`);
  sections.push(`<${dmnUri}> a cprmv:DecisionModel ;`);
  sections.push(`    dct:identifier "${dmnData.decisionKey || 'unknown'}" ;`);
  sections.push(`    dct:title "${dmnData.fileName}"@nl ;`);
  sections.push(`    dct:format "application/dmn+xml" ;`);

  if (dmnData.deployedAt) {
    sections.push(`    dct:created "${dmnData.deployedAt}"^^xsd:dateTime ;`);
  }

  if (dmnData.deploymentId) {
    sections.push(`    cprmv:deploymentId "${dmnData.deploymentId}" ;`);
  }

  sections.push(`    cpsv:implements <${serviceUri}> ;`);

  // Add test results as metadata if available
  if (dmnData.lastTestResult && dmnData.lastTestTimestamp) {
    sections.push(`    cprmv:lastTested "${dmnData.lastTestTimestamp}"^^xsd:dateTime ;`);
    sections.push(`    cprmv:testStatus "passed" ;`);
  }

  sections.push(`    dct:description "DMN decision model for service evaluation"@nl .`);
  sections.push('');

  // Add API endpoint information
  if (dmnData.apiEndpoint) {
    const endpointUri = `${dmnUri}/endpoint`;
    sections.push(`# API Endpoint`);
    sections.push(`<${endpointUri}> a cprmv:APIEndpoint ;`);
    sections.push(`    cprmv:url "${dmnData.apiEndpoint}" ;`);
    sections.push(`    cprmv:method "POST" ;`);
    sections.push(`    cprmv:decisionModel <${dmnUri}> .`);
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Extracts rules from DMN content and generates TTL
 * @param {string} dmnContent - Raw DMN XML content
 * @param {string} serviceUri - URI of the service
 * @returns {Array} - Array of rule objects with TTL representation
 */
export function extractRulesFromDMN(dmnContent, serviceUri) {
  if (!dmnContent) return [];

  const rules = [];

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(dmnContent, 'text/xml');

    // Extract decision tables
    const decisionTables = xmlDoc.querySelectorAll('decisionTable');

    decisionTables.forEach((table, tableIndex) => {
      const tableId = table.getAttribute('id') || `table-${tableIndex}`;

      // Get cprmv:rulesetType if available
      const rulesetType = table.getAttribute('cprmv:rulesetType') || 'decision-table';

      // Extract rules from the decision table
      const ruleElements = table.querySelectorAll('rule');

      ruleElements.forEach((rule, ruleIndex) => {
        const ruleId = rule.getAttribute('id') || `rule-${ruleIndex}`;
        const ruleUri = `${serviceUri}/rules/${ruleId}`;

        // Extract CPRMV attributes
        const cprmvExtends = rule.getAttribute('cprmv:extends');
        const cprmvValidFrom = rule.getAttribute('cprmv:validFrom');
        const cprmvValidUntil = rule.getAttribute('cprmv:validUntil');
        const cprmvRuleType = rule.getAttribute('cprmv:ruleType') || 'decision-rule';
        const cprmvConfidence = rule.getAttribute('cprmv:confidence') || 'medium';
        const cprmvNote = rule.getAttribute('cprmv:note');

        // Extract input and output entries
        const inputs = Array.from(rule.querySelectorAll('inputEntry text')).map(
          (t) => t.textContent
        );
        const outputs = Array.from(rule.querySelectorAll('outputEntry text')).map(
          (t) => t.textContent
        );

        const ruleObj = {
          id: ruleId,
          uri: ruleUri,
          extends: cprmvExtends,
          validFrom: cprmvValidFrom,
          validUntil: cprmvValidUntil,
          ruleType: cprmvRuleType,
          confidence: cprmvConfidence,
          note: cprmvNote,
          inputs: inputs,
          outputs: outputs,
          tableId: tableId,
          rulesetType: rulesetType,
        };

        rules.push(ruleObj);
      });
    });
  } catch (error) {
    console.error('Error extracting rules from DMN:', error);
  }

  return rules;
}

/**
 * Generates TTL for extracted DMN rules
 * @param {Array} rules - Array of rule objects from extractRulesFromDMN
 * @param {string} serviceUri - URI of the service
 * @returns {string} - TTL representation of DMN rules
 */
export function generateRulesTTL(rules, serviceUri) {
  if (!rules || rules.length === 0) {
    return '';
  }

  const sections = [];
  sections.push('# Rules extracted from DMN');
  sections.push('');

  rules.forEach((rule) => {
    sections.push(`<${rule.uri}> a cpsv:Rule, cprmv:DecisionRule ;`);
    sections.push(`    dct:identifier "${rule.id}" ;`);
    sections.push(`    cpsv:implements <${serviceUri}> ;`);

    if (rule.extends) {
      sections.push(`    cprmv:extends <${rule.extends}> ;`);
    }

    if (rule.validFrom) {
      sections.push(`    cprmv:validFrom "${rule.validFrom}"^^xsd:date ;`);
    }

    if (rule.validUntil) {
      sections.push(`    cprmv:validUntil "${rule.validUntil}"^^xsd:date ;`);
    }

    sections.push(`    cprmv:ruleType "${rule.ruleType}" ;`);
    sections.push(`    cprmv:confidence "${rule.confidence}" ;`);

    if (rule.note) {
      const escapedNote = rule.note.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      sections.push(`    cprmv:note "${escapedNote}"@nl ;`);
    }

    sections.push(`    cprmv:decisionTable "${rule.tableId}" ;`);
    sections.push(`    cprmv:rulesetType "${rule.rulesetType}" .`);
    sections.push('');
  });

  return sections.join('\n');
}

/**
 * Generates complete DMN section for TTL export
 * @param {Object} dmnData - DMN metadata object
 * @param {string} serviceUri - URI of the service
 * @returns {string} - Complete TTL section for DMN
 */
export function generateCompleteDMNSection(dmnData, serviceUri) {
  if (!dmnData || !dmnData.fileName) {
    return '';
  }

  const sections = [];

  sections.push('');
  sections.push('# ========================================');
  sections.push('# DMN Decision Model');
  sections.push('# ========================================');
  sections.push('');

  // Add DMN metadata
  sections.push(generateDMNTTL(dmnData, serviceUri));

  // Add extracted rules if DMN content is available
  if (dmnData.content) {
    const rules = extractRulesFromDMN(dmnData.content, serviceUri);
    if (rules.length > 0) {
      sections.push(generateRulesTTL(rules, serviceUri));
    }
  }

  return sections.join('\n');
}

/**
 * Validates DMN data before export
 * @param {Object} dmnData - DMN metadata object
 * @returns {Object} - Validation result {valid: boolean, errors: string[]}
 */
export function validateDMNData(dmnData) {
  const errors = [];

  if (!dmnData) {
    return { valid: true, errors: [] }; // DMN is optional
  }

  if (dmnData.fileName && !dmnData.content) {
    errors.push('DMN file name exists but content is missing');
  }

  if (dmnData.deployed && !dmnData.deploymentId) {
    errors.push('DMN is marked as deployed but has no deployment ID');
  }

  if (dmnData.content) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(dmnData.content, 'text/xml');
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        errors.push('DMN content is not valid XML');
      }
    } catch (error) {
      errors.push(`DMN validation error: ${error.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
}

/**
 * Generates DMN namespace declarations for TTL
 * @returns {string} - Namespace declarations
 */
export function getDMNNamespaces() {
  return `@prefix cprmv: <https://cprmv.open-regels.nl/0.3.0/> .`;
}

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  generateDMNTTL,
  extractRulesFromDMN,
  generateRulesTTL,
  generateCompleteDMNSection,
  validateDMNData,
  getDMNNamespaces,
};
