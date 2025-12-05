// Form validation functions

/**
 * Validate service fields
 * @param {object} service - Service state object
 * @returns {string[]} - Array of error messages
 */
export function validateService(service) {
  const errors = [];

  if (!service.identifier) {
    errors.push('Service identifier is required');
  }

  if (!service.name) {
    errors.push('Service name is required');
  }

  return errors;
}

/**
 * Validate organization fields
 * @param {object} organization - Organization state object
 * @returns {string[]} - Array of error messages
 */
export function validateOrganization(organization) {
  const errors = [];

  // Organization is optional, but if identifier is provided, name should be too
  if (organization.identifier && !organization.name) {
    errors.push('Organization name is required when identifier is provided');
  }

  // Validate homepage URL format if provided
  if (organization.homepage && !isValidUrl(organization.homepage)) {
    errors.push('Organization homepage must be a valid URL');
  }

  if (!organization.spatial) {
    errors.push('Organization geographic jurisdiction (cv:spatial) is required');
  }
  return errors;
}

/**
 * Validate legal resource fields
 * @param {object} legalResource - Legal resource state object
 * @returns {string[]} - Array of error messages
 */
export function validateLegalResource(legalResource) {
  const errors = [];

  // BWB ID validation - accepts either:
  // 1. Plain BWB ID (e.g., BWBR0002820)
  // 2. Full URI containing a BWB ID (e.g., https://wetten.overheid.nl/BWBR0002820)
  if (legalResource.bwbId) {
    const isPlainBwbId = /^[A-Za-z]{2,10}\d+$/i.test(legalResource.bwbId);
    const containsBwbId = /BWB[A-Za-z]?\d+/i.test(legalResource.bwbId);

    if (!isPlainBwbId && !containsBwbId) {
      errors.push(
        'BWB ID must match pattern (e.g., BWBR0002820) or be a valid URI containing a BWB ID'
      );
    }
  }

  return errors;
}

/**
 * Validate temporal rule fields
 * @param {object} rule - Temporal rule object
 * @param {number} index - Rule index for error messages
 * @returns {string[]} - Array of error messages
 */
export function validateTemporalRule(rule, index) {
  const errors = [];
  const ruleNum = index + 1;

  // If rule has content, validate dates
  if (rule.validFrom && rule.validUntil) {
    if (new Date(rule.validFrom) > new Date(rule.validUntil)) {
      errors.push(`Rule ${ruleNum}: Valid From date must be before Valid Until date`);
    }
  }

  // Validate URI format if provided
  if (rule.uri && !isValidUrl(rule.uri)) {
    errors.push(`Rule ${ruleNum}: URI must be a valid URL`);
  }

  if (rule.extends && !isValidUrl(rule.extends)) {
    errors.push(`Rule ${ruleNum}: Extends must be a valid URL`);
  }

  return errors;
}

/**
 * Validate parameter fields
 * @param {object} param - Parameter object
 * @param {number} index - Parameter index for error messages
 * @returns {string[]} - Array of error messages
 */
export function validateParameter(param, index) {
  const errors = [];
  const paramNum = index + 1;

  // If parameter has a value, notation is required
  if (param.value && !param.notation) {
    errors.push(`Parameter ${paramNum}: Notation is required when value is provided`);
  }

  // Validate value is a number
  if (param.value && isNaN(parseFloat(param.value))) {
    errors.push(`Parameter ${paramNum}: Value must be a valid number`);
  }

  // Validate date range
  if (param.validFrom && param.validUntil) {
    if (new Date(param.validFrom) > new Date(param.validUntil)) {
      errors.push(`Parameter ${paramNum}: Valid From date must be before Valid Until date`);
    }
  }

  return errors;
}

/**
 * Validate entire form
 * @param {object} formState - Complete form state with service, organization, etc.
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
export function validateForm(formState) {
  const {
    service = {},
    organization = {},
    legalResource = {},
    temporalRules = [],
    parameters = [],
  } = formState || {};

  const errors = [
    ...validateService(service),
    ...validateOrganization(organization),
    ...validateLegalResource(legalResource),
    ...temporalRules.flatMap((rule, idx) => validateTemporalRule(rule, idx)),
    ...parameters.flatMap((param, idx) => validateParameter(param, idx)),
  ];

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Helper: Check if string is a valid URL
 * @param {string} str - String to validate
 * @returns {boolean} - True if valid URL
 */
function isValidUrl(str) {
  if (!str) return false;
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper: Check if string is a valid date
 * @param {string} str - String to validate
 * @returns {boolean} - True if valid date
 */
export function isValidDate(str) {
  if (!str) return false;
  const date = new Date(str);
  return date instanceof Date && !isNaN(date);
}
