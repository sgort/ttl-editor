import { useEffect, useState } from 'react';

import { iknowMappings } from '../config/iknow-mappings';
import {
  DEFAULT_COST,
  DEFAULT_LEGAL_RESOURCE,
  DEFAULT_ORGANIZATION,
  DEFAULT_OUTPUT,
  DEFAULT_SERVICE,
} from '../utils';
import { fetchAllRonlConcepts } from '../utils/ronlHelper';
import { loadTriplyDBConfig } from '../utils/triplydbHelper';

const RONL_ENDPOINT =
  'https://api.open-regels.triply.cc/datasets/stevengort/ronl/services/ronl/sparql';

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

  const [ronlAnalysis, setRonlAnalysis] = useState('');
  const [ronlMethod, setRonlMethod] = useState('');

  // Temporal Rules state
  const [temporalRules, setTemporalRules] = useState([]);

  // Parameters state
  const [parameters, setParameters] = useState([]);

  // CPRMV Rules state
  const [cprmvRules, setCprmvRules] = useState([]);

  // Concepts state
  const [concepts, setConcepts] = useState([]);

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
    apiEndpoint: 'https://operaton.open-regels.nl/engine-rest',
    lastTestResult: null,
    lastTestTimestamp: null,
    testBody: null,
    importedDmnBlocks: null, // Raw TTL blocks (string)
    isImported: false, // Flag to disable DMN tab

    // Ensure validation fields always have string defaults (not undefined)
    validationStatus: 'not-validated',
    validatedBy: '',
    validatedAt: '',
    validationNote: '',
  });

  // Vendor state - Blueriq as a first
  const [vendorService, setVendorService] = useState({
    selectedVendor: '',
    contact: {
      organizationName: '',
      contactPerson: '',
      email: '',
      phone: '',
      website: '',
      logo: '',
    },
    serviceNotes: '',
    technical: {
      serviceUrl: '',
      license: '',
      accessType: 'fair-use',
    },
    certification: {
      status: 'not-certified',
      certifiedBy: '',
      certifiedAt: '',
      certificationNote: '',
    },
  });

  // iKnow state
  const [iknowMappingConfig, setIknowMappingConfig] = useState({ mappings: {} });
  const [availableIKnowMappings, setAvailableIKnowMappings] = useState([]);

  // TriplyDB configuration state (NEW)
  const [triplyDBConfig, setTriplyDBConfig] = useState(() => loadTriplyDBConfig());

  // RONL concepts — fetched once on App mount, consumed by LegalTab and VendorTab
  const [ronlAnalysisConcepts, setRonlAnalysisConcepts] = useState([]);
  const [ronlMethodConcepts, setRonlMethodConcepts] = useState([]);
  const [ronlConceptsLoading, setRonlConceptsLoading] = useState(false);
  const [ronlConceptsError, setRonlConceptsError] = useState('');

  // Load available iKnow mappings on mount
  useEffect(() => {
    setAvailableIKnowMappings(iknowMappings);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadConcepts = async () => {
      setRonlConceptsLoading(true);
      setRonlConceptsError('');

      try {
        const { analysisConcepts, methodConcepts } = await fetchAllRonlConcepts(RONL_ENDPOINT);
        if (cancelled) return;
        setRonlAnalysisConcepts(analysisConcepts);
        setRonlMethodConcepts(methodConcepts);
        console.log('Loaded RONL concepts:', {
          analysis: analysisConcepts.length,
          method: methodConcepts.length,
        });
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load RONL concepts:', error);
        setRonlConceptsError(
          'Failed to load concepts from TriplyDB. Please check your connection.'
        );
      } finally {
        if (!cancelled) setRonlConceptsLoading(false);
      }
    };

    loadConcepts();
    return () => {
      cancelled = true;
    };
  }, []);

  // Clear all data
  const clearAllData = () => {
    setService({
      ...DEFAULT_SERVICE,
      customSector: '',
    });
    setOrganization(DEFAULT_ORGANIZATION);
    setLegalResource(DEFAULT_LEGAL_RESOURCE);
    setRonlAnalysis('');
    setRonlMethod('');
    setTemporalRules([]);
    setParameters([]);
    setCprmvRules([]);
    setConcepts([]);
    setCost(DEFAULT_COST);
    setOutput(DEFAULT_OUTPUT);
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
    });
    setVendorService({
      selectedVendor: '',
      contact: {
        organizationName: '',
        contactPerson: '',
        email: '',
        phone: '',
        website: '',
        logo: '',
      },
      serviceNotes: '',
      technical: {
        serviceUrl: '',
        license: '',
        accessType: 'fair-use',
      },
      certification: {
        status: 'not-certified',
        certifiedBy: '',
        certifiedAt: '',
        certificationNote: '',
      },
    });
    setIknowMappingConfig({ mappings: {} });
    // Note: We don't clear TriplyDB config on clear all
  };

  return {
    // Service
    service,
    setService,
    // Organization
    organization,
    setOrganization,
    // Legal Resource
    legalResource,
    setLegalResource,
    // Legal Analysis and Method
    ronlAnalysis,
    setRonlAnalysis,
    ronlMethod,
    setRonlMethod,
    // Temporal Rules
    temporalRules,
    setTemporalRules,
    // Parameters
    parameters,
    setParameters,
    // CPRMV Rules
    cprmvRules,
    setCprmvRules,
    // Cost
    cost,
    setCost,
    // Output
    output,
    setOutput,
    // DMN
    dmnData,
    setDmnData,
    concepts,
    setConcepts,
    // Vendor
    vendorService,
    setVendorService,
    // iKnow
    iknowMappingConfig,
    setIknowMappingConfig,
    availableIKnowMappings,
    setAvailableIKnowMappings,
    // TriplyDB (NEW)
    triplyDBConfig,
    setTriplyDBConfig,
    // RONL concepts
    ronlAnalysisConcepts,
    ronlMethodConcepts,
    ronlConceptsLoading,
    ronlConceptsError,
    // Actions
    clearAllData,
  };
};
