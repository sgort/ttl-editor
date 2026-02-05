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

/**
 * Generate NL-SBB compliant concept URI from variable name
 * @param {string} variableName - DMN variable name (e.g., "geboortedatumAanvrager")
 * @param {string} serviceIdentifier - Service identifier for scoping
 * @returns {string} - Concept URI
 */
export function generateConceptUri(variableName, serviceIdentifier) {
  const cleanServiceId = sanitizeServiceIdentifier(serviceIdentifier);
  return `https://regels.overheid.nl/concepts/${cleanServiceId}/${variableName}`;
}

/**
 * Generate human-readable concept label from variable name
 * Handles acronyms better (AOW stays together, not "A O W")
 * @param {string} variableName - Camel case variable name
 * @returns {string} - Spaced label
 */
export function generateConceptLabel(variableName) {
  // Split on capital letters but keep consecutive capitals together
  return variableName
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // Handle acronyms: "AOWDatum" → "AOW Datum"
    .replace(/([a-z\d])([A-Z])/g, '$1 $2') // Handle normal camelCase: "datumAanvrager" → "datum Aanvrager"
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Generate concept definition from variable context
 * @param {string} variableName - Variable name
 * @param {string} type - Variable type (String, Integer, Boolean)
 * @param {string} ioType - 'input' or 'output'
 * @returns {string} - Dutch definition
 */
export function generateConceptDefinition(variableName, type, ioType) {
  const label = generateConceptLabel(variableName);
  const typeMap = {
    String: 'tekstuele waarde',
    Integer: 'numerieke waarde',
    Boolean: 'ja/nee waarde',
    Date: 'datumwaarde',
  };
  const typeDescription = typeMap[type] || 'waarde';

  if (ioType === 'input') {
    return `${label} is een ${typeDescription} die als invoer dient voor de beslisregel.`;
  } else {
    return `${label} is een ${typeDescription} die als uitvoer wordt gegenereerd door de beslisregel.`;
  }
}

/**
 * Generate notation by taking first letter of each word in camelCase
 * Example: "geboortedatumAanvrager" → "GA"
 * Example: "AOWDatumPartner" → "AOWDP"
 * @param {string} variableName - Variable name
 * @param {string[]} existingNotations - Already used notations to avoid collisions
 * @returns {string} - Unique notation code
 */
export function generateConceptNotation(variableName, existingNotations = []) {
  // Split camelCase into words
  // Insert space before uppercase letters, then split
  const words = variableName
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // "AOWDatum" → "AOW Datum"
    .replace(/([a-z\d])([A-Z])/g, '$1 $2') // "datumAanvrager" → "datum Aanvrager"
    .split(' ')
    .filter((word) => word.length > 0); // Remove empty strings

  // Take first letter of each word
  let notation = words.map((word) => word.charAt(0).toUpperCase()).join('');

  // If notation is too short (1 char), use more letters
  if (notation.length === 1 && words.length === 1) {
    notation = words[0].substring(0, Math.min(4, words[0].length)).toUpperCase();
  }

  // If notation is too long (>6 chars), intelligently shorten
  if (notation.length > 6) {
    // Keep first word (max 3 chars) + first letter of remaining words
    const firstWord = words[0].substring(0, 3).toUpperCase();
    const restLetters = words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');
    notation = firstWord + restLetters;
  }

  // Handle collision by appending number
  let finalNotation = notation;
  let counter = 1;
  while (existingNotations.includes(finalNotation)) {
    finalNotation = `${notation}${counter}`;
    counter++;
  }

  return finalNotation;
}

// Default export object for convenience
const dmnHelpers = {
  extractRulesFromDMN,
  extractInputsFromTestResult,
  extractOutputsFromTestResult,
  validateDMNData,
  sanitizeServiceIdentifier,
  buildServiceUri,
  generateConceptUri,
  generateConceptLabel,
  generateConceptDefinition,
  generateConceptNotation,
};

export default dmnHelpers;
