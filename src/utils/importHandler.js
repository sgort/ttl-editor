// importHandler.js - Centralized import logic for TTL files

import parseTTLEnhanced from '../parseTTL.enhanced';

/**
 * Parse and normalize TTL content for the editor
 * Ensures all values are strings (never undefined/null)
 * @param {string} ttlContent - Raw TTL file content
 * @returns {Object} Normalized parsed data
 */
export const parseTTL = (ttlContent) => {
  const parsed = parseTTLEnhanced(ttlContent);

  return {
    service: {
      identifier: parsed.service?.identifier || '',
      name: parsed.service?.name || '',
      description: parsed.service?.description || '',
      thematicArea: parsed.service?.thematicArea || '',
      sector: parsed.service?.sector || '',
      keywords: parsed.service?.keywords || '',
      language: parsed.service?.language || 'nl',
    },
    organization: {
      identifier: parsed.organization?.identifier || '',
      name: parsed.organization?.name || '',
      homepage: parsed.organization?.homepage || '',
      spatial: parsed.organization?.spatial || '',
      logo: parsed.organization?.logo || '',
    },
    legalResource: {
      bwbId: parsed.legalResource?.bwbId || '',
      version: parsed.legalResource?.version || '',
      title: parsed.legalResource?.title || '',
      description: parsed.legalResource?.description || '',
    },
    ronlAnalysis: parsed.ronlAnalysis || '',
    ronlMethod: parsed.ronlMethod || '',
    temporalRules: (parsed.temporalRules || []).map((rule) => ({
      ...rule,
      identifier: rule.identifier || '',
      title: rule.title || '',
    })),
    parameters: parsed.parameters || [],
    cprmvRules: parsed.cprmvRules || [],
    concepts: parsed.concepts || [],
    cost: {
      identifier: parsed.cost?.identifier || '',
      value: parsed.cost?.value || '',
      currency: parsed.cost?.currency || 'EUR',
      description: parsed.cost?.description || '',
    },
    output: {
      identifier: parsed.output?.identifier || '',
      name: parsed.output?.name || '',
      description: parsed.output?.description || '',
      type: parsed.output?.type || '',
    },

    // Pass through DMN preservation fields (Option 3)
    hasDmnData: parsed.hasDmnData || false,
    importedDmnBlocks: parsed.importedDmnBlocks || null,

    // NEW: Pass through validation metadata
    dmnValidationStatus: parsed.dmnValidationStatus || 'not-validated',
    dmnValidatedBy: parsed.dmnValidatedBy || '',
    dmnValidatedAt: parsed.dmnValidatedAt || '',
    dmnValidationNote: parsed.dmnValidationNote || '',
  };
};

/**
 * Validate that file is a TTL file
 * @param {File} file - File object from input
 * @returns {Object} { valid: boolean, error?: string }
 */
export const validateTTLFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (!file.name.endsWith('.ttl')) {
    return { valid: false, error: 'Please select a .ttl file' };
  }

  return { valid: true };
};

/**
 * Read file content as text
 * @param {File} file - File object
 * @returns {Promise<string>} File content
 */
export const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      resolve(e.target.result);
    };

    reader.onerror = () => {
      reject(new Error('Error reading file. Please try again.'));
    };

    reader.readAsText(file);
  });
};

/**
 * Process TTL import and return state updates
 * @param {File} file - TTL file from input
 * @returns {Promise<Object>} Import result with parsed data and status
 */
export const processTTLImport = async (file) => {
  // Validate file
  const validation = validateTTLFile(file);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      data: null,
    };
  }

  try {
    // Read file content
    const content = await readFileContent(file);

    // Parse TTL
    const parsed = parseTTL(content);

    // Determine success message based on DMN data
    const hasDMN = parsed.hasDmnData && parsed.importedDmnBlocks;
    const message = hasDMN
      ? 'TTL imported successfully. DMN data preserved but cannot be edited.'
      : 'TTL imported successfully';

    return {
      success: true,
      message,
      data: parsed,
      hasDMN,
    };
  } catch (error) {
    return {
      success: false,
      error: `Import error: ${error.message}`,
      data: null,
    };
  }
};

/**
 * Apply imported data to editor state
 * @param {Object} importedData - Parsed TTL data
 * @param {Object} setters - Object containing all state setter functions
 */
export const applyImportedData = (importedData, setters) => {
  const {
    setService,
    setOrganization,
    setLegalResource,
    setRonlAnalysis,
    setRonlMethod,
    setTemporalRules,
    setParameters,
    setCprmvRules,
    setConcepts,
    setCost,
    setOutput,
    setDmnData,
    setIknowMappingConfig,
  } = setters;

  // Apply all parsed data to state
  setService(importedData.service);
  setOrganization(importedData.organization);
  setLegalResource(importedData.legalResource);
  setRonlAnalysis(importedData.ronlAnalysis);
  setRonlMethod(importedData.ronlMethod);
  setTemporalRules(importedData.temporalRules);
  setParameters(importedData.parameters);
  setCprmvRules(importedData.cprmvRules);
  setConcepts(importedData.concepts || []);
  setCost(importedData.cost);
  setOutput(importedData.output);

  // Reset iKnow config on import
  setIknowMappingConfig({ mappings: {} });

  // Handle DMN preservation
  if (importedData.hasDmnData && importedData.importedDmnBlocks) {
    setDmnData({
      fileName: '',
      content: '',
      decisionKey: '',
      deployed: false,
      deploymentId: null,
      deployedAt: null,
      apiEndpoint: 'https://operaton.open-regels.nl/engine-rest',
      lastTestResult: null,
      lastTestTimestamp: null,
      testBody: null,
      importedDmnBlocks: importedData.importedDmnBlocks,
      isImported: true,

      // Apply validation metadata
      validationStatus: importedData.dmnValidationStatus || 'not-validated',
      validatedBy: importedData.dmnValidatedBy || '',
      validatedAt: importedData.dmnValidatedAt || '',
      validationNote: importedData.dmnValidationNote || '',
    });
  } else {
    // No DMN in imported file - reset to default state
    // This matches what clearAllData does in useEditorState
    setDmnData({
      fileName: '',
      content: '',
      decisionKey: '',
      deployed: false,
      deploymentId: null,
      deployedAt: null,
      apiEndpoint: 'https://operaton.open-regels.nl/engine-rest',
      lastTestResult: null,
      lastTestTimestamp: null,
      testBody: null,
      importedDmnBlocks: null,
      isImported: false,

      // Reset validation metadata
      validationStatus: 'not-validated',
      validatedBy: '',
      validatedAt: '',
      validationNote: '',
    });
  }
};

/**
 * Complete import handler - use this in React components
 * @param {Event} event - File input change event
 * @param {Object} setters - State setter functions
 * @param {Function} setImportStatus - Function to set import status
 * @returns {Promise<void>}
 */
export const handleTTLImport = async (event, setters, setImportStatus) => {
  const file = event.target.files[0];

  // Process import
  const result = await processTTLImport(file);

  if (result.success) {
    // Apply data to state
    applyImportedData(result.data, setters);

    // Show success message
    setImportStatus({
      show: true,
      success: true,
      message: result.message,
    });

    // Auto-hide after 4 seconds
    setTimeout(() => {
      setImportStatus({ show: false, success: false, message: '' });
    }, 4000);
  } else {
    // Show error message
    setImportStatus({
      show: true,
      success: false,
      message: result.error,
    });

    // Auto-hide after 4 seconds
    setTimeout(() => {
      setImportStatus({ show: false, success: false, message: '' });
    }, 4000);
  }
};
