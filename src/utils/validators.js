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
 * @param {string} ronlAnalysis - RONL analysis concept URI
 * @param {string} ronlMethod - RONL method concept URI
 * @returns {string[]} - Array of error messages
 */
export function validateLegalResource(legalResource, ronlAnalysis, ronlMethod) {
  const errors = [];

  // Legal resource identifier validation - accepts:
  // 1. BWB ID (e.g., BWBR0002820, BWBV0003018)
  // 2. CVDR ID (e.g., CVDR603544)
  // 3. Full URI containing BWB or CVDR ID
  if (legalResource.bwbId) {
    const isBWB = /BWB[A-Z]?\d+/i.test(legalResource.bwbId);
    const isCVDR = /CVDR\d+/i.test(legalResource.bwbId);
    const isFullUri = /^https?:\/\//i.test(legalResource.bwbId);

    // If it's not a BWB, not a CVDR, and not a full URI - it's invalid
    if (!isBWB && !isCVDR && !isFullUri) {
      errors.push(
        'Legal resource identifier must be a BWB ID (e.g., BWBR0002820), CVDR ID (e.g., CVDR603544), or a valid URI'
      );
    }

    // If it's a full URI, verify it contains either BWB or CVDR
    if (isFullUri && !isBWB && !isCVDR) {
      errors.push('Full URI must contain a BWB ID or CVDR ID');
    }
  }

  // RONL Concepts validation (NEW)
  if (!ronlAnalysis) {
    errors.push('RONL Analysis concept is required');
  }

  if (!ronlMethod) {
    errors.push('RONL Method concept is required');
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

  if (!rule.identifier) {
    errors.push(`Rule ${index + 1}: Rule identifier (dct:identifier) is required`);
  }
  if (!rule.title) {
    errors.push(`Rule ${index + 1}: Rule title (dct:title) is required`);
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
 * Validate vendor service fields
 * @param {object} vendorService - Vendor service state object
 * @returns {string[]} - Array of error messages
 */
export function validateVendorService(vendorService) {
  const errors = [];

  // Only validate if a vendor is selected
  if (!vendorService.selectedVendor) {
    return errors; // No vendor selected, no validation needed
  }

  // Validate website URL if provided
  if (vendorService.contact.website && !isValidUrl(vendorService.contact.website)) {
    errors.push('Vendor website must be a valid URL (e.g., https://www.blueriq.com)');
  }

  // Validate service URL if provided
  if (vendorService.technical.serviceUrl && !isValidUrl(vendorService.technical.serviceUrl)) {
    errors.push('Service URL must be a valid URL (e.g., https://api.blueriq.com/service)');
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
    ronlAnalysis = '',
    ronlMethod = '',
    temporalRules = [],
    parameters = [],
    vendorService = {},
  } = formState || {};

  const errors = [
    ...validateService(service),
    ...validateOrganization(organization),
    ...validateLegalResource(legalResource, ronlAnalysis, ronlMethod), // UPDATE THIS
    ...temporalRules.flatMap((rule, idx) => validateTemporalRule(rule, idx)),
    ...parameters.flatMap((param, idx) => validateParameter(param, idx)),
    ...validateVendorService(vendorService),
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
