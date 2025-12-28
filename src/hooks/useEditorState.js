import { useEffect, useState } from 'react';

import { iknowMappings } from '../config/iknow-mappings';
import {
  DEFAULT_COST,
  DEFAULT_LEGAL_RESOURCE,
  DEFAULT_ORGANIZATION,
  DEFAULT_OUTPUT,
  DEFAULT_SERVICE,
} from '../utils';

export const useEditorState = () => {
  // Service state
  const [service, setService] = useState({
    ...DEFAULT_SERVICE,
    customSector: '',
  });

  // Organization state
  const [organization, setOrganization] = useState(DEFAULT_ORGANIZATION);

  // Legal Resource state
  const [legalResource, setLegalResource] = useState(DEFAULT_LEGAL_RESOURCE);

  // Temporal Rules state
  const [temporalRules, setTemporalRules] = useState([]);

  // Parameters state
  const [parameters, setParameters] = useState([]);

  // CPRMV Rules state
  const [cprmvRules, setCprmvRules] = useState([]);

  // Cost state
  const [cost, setCost] = useState(DEFAULT_COST);

  // Output state
  const [output, setOutput] = useState(DEFAULT_OUTPUT);

  // DMN state
  const [dmnData, setDmnData] = useState({
    fileName: '',
    content: '',
    decisionKey: '',
    deployed: false,
    deploymentId: null,
    deployedAt: null,
    apiEndpoint: 'https://operaton-doc.open-regels.nl/engine-rest',
    lastTestResult: null,
    lastTestTimestamp: null,
    testBody: null,
    importedDmnBlocks: null, // Raw TTL blocks (string)
    isImported: false, // Flag to disable DMN tab
  });

  // iKnow state
  const [iknowMappingConfig, setIknowMappingConfig] = useState({ mappings: {} });
  const [availableIKnowMappings, setAvailableIKnowMappings] = useState([]);

  // Load available iKnow mappings on mount
  useEffect(() => {
    setAvailableIKnowMappings(iknowMappings);
  }, []);

  // Clear all data
  const clearAllData = () => {
    setService({
      ...DEFAULT_SERVICE,
      customSector: '',
    });
    setOrganization(DEFAULT_ORGANIZATION);
    setLegalResource(DEFAULT_LEGAL_RESOURCE);
    setTemporalRules([]);
    setParameters([]);
    setCprmvRules([]);
    setCost(DEFAULT_COST);
    setOutput(DEFAULT_OUTPUT);
    setDmnData({
      fileName: '',
      content: '',
      decisionKey: '',
      deployed: false,
      deploymentId: null,
      deployedAt: null,
      apiEndpoint: 'https://operaton-doc.open-regels.nl/engine-rest',
      lastTestResult: null,
      lastTestTimestamp: null,
      testBody: null,
      importedDmnBlocks: null,
      isImported: false,
    });
    setIknowMappingConfig({ mappings: {} });
    setAvailableIKnowMappings(iknowMappings);
  };

  return {
    // Service
    service,
    setService,
    organization,
    setOrganization,
    legalResource,
    setLegalResource,

    // Arrays
    temporalRules,
    setTemporalRules,
    parameters,
    setParameters,
    cprmvRules,
    setCprmvRules,

    // Cost & Output
    cost,
    setCost,
    output,
    setOutput,

    // DMN
    dmnData,
    setDmnData,

    // iKnow
    iknowMappingConfig,
    setIknowMappingConfig, // ← App.js needs this (user can change config)
    availableIKnowMappings, // ← App.js needs this (read-only list)
    // setAvailableIKnowMappings, // ← DON'T export! Only used internally

    // Clear all data
    clearAllData,
  };
};
