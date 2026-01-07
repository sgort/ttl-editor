/**
 * Sanitizes a service identifier to create valid URIs
 * @param {string} identifier - Service identifier
 * @returns {string} - Sanitized identifier suitable for URIs
 */
export function sanitizeServiceIdentifier(identifier) {
  if (!identifier) return 'unknown-service';

  return identifier
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove any non-alphanumeric chars except hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Builds a proper service URI from an identifier
 * @param {string} identifier - Service identifier
 * @returns {string} - Complete service URI
 */
export function buildServiceUri(identifier) {
  const sanitized = sanitizeServiceIdentifier(identifier);
  return `https://regels.overheid.nl/services/${sanitized}`;
}

/**
 * Extract input variables from test result data
 * @param {Object} dmnData - DMN metadata object with test results
 * @returns {Array} - Array of input objects {name, type, exampleValue}
 */
export function extractInputsFromTestResult(dmnData) {
  const inputs = [];

  // Try to parse the test body if it exists
  if (dmnData.testBody) {
    try {
      const testData =
        typeof dmnData.testBody === 'string' ? JSON.parse(dmnData.testBody) : dmnData.testBody;

      if (testData.variables) {
        Object.entries(testData.variables).forEach(([name, varData]) => {
          inputs.push({
            name: name,
            type: varData.type || 'String',
            exampleValue: varData.value,
          });
        });
      }
    } catch (err) {
      console.error('Error extracting inputs from test data:', err);
    }
  }

  return inputs;
}

/**
 * Extract output variables from DMN test result data
 * @param {Object} dmnData - DMN metadata object with test results
 * @returns {Array} - Array of output objects {name, type, exampleValue}
 */
export function extractOutputsFromTestResult(dmnData) {
  const outputs = [];

  if (!dmnData.lastTestResult) {
    return outputs;
  }

  try {
    const result = dmnData.lastTestResult;

    // Operaton returns outputs in two possible formats:
    // Format 1: Array of output objects
    // Format 2: Direct object with outputs

    if (Array.isArray(result)) {
      // Format 1: [{outputName: {value: X, type: Y}}]
      result.forEach((outputObj) => {
        Object.entries(outputObj).forEach(([name, varData]) => {
          outputs.push({
            name: name,
            type: varData.type || 'String',
            exampleValue: varData.value,
          });
        });
      });
    } else if (typeof result === 'object') {
      // Format 2: {outputName: {value: X, type: Y}}
      Object.entries(result).forEach(([name, varData]) => {
        if (varData && typeof varData === 'object' && 'value' in varData) {
          outputs.push({
            name: name,
            type: varData.type || 'String',
            exampleValue: varData.value,
          });
        }
      });
    }
  } catch (err) {
    console.error('Error extracting outputs from test result:', err);
  }

  return outputs;
}

/**
 * Extracts rules from DMN content and generates TTL
 * @param {string} dmnContent - Raw DMN XML content
 * @param {string} serviceUri - URI of the service
 * @returns {Array} - Array of rule objects with TTL representation
 */
export function extractRulesFromDMN(dmnContent, serviceUri) {
  if (!dmnContent) return [];

  // Ensure serviceUri is properly formatted
  const cleanServiceUri = serviceUri.replace(/%20/g, '-').replace(/\s+/g, '-');
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
        const ruleUri = `${cleanServiceUri}/rules/${ruleId}`;

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

// Default export object for convenience
const dmnHelpers = {
  extractRulesFromDMN,
  extractInputsFromTestResult,
  extractOutputsFromTestResult,
  validateDMNData,
  sanitizeServiceIdentifier,
  buildServiceUri,
};

export default dmnHelpers;
