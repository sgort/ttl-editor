import './App.css';

import {
  AlertCircle,
  Building2,
  CheckCircle,
  Clock,
  Database,
  Download,
  FileText,
  FileUp,
  History,
  Plus,
  Scale,
  Trash2,
  Upload,
} from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { rule } from 'postcss';
import React, { useEffect, useState } from 'react';

import PreviewPanel from './components/PreviewPanel';
import {
  ChangelogTab,
  CPRMVTab,
  DMNTab,
  IKnowMappingTab,
  LegalTab,
  OrganizationTab,
  ParametersTab,
  RulesTab,
  ServiceTab,
} from './components/tabs';
// eslint-disable-next-line no-unused-vars
import { useEditorState } from './hooks/useEditorState';
import parseTTLEnhanced from './parseTTL.enhanced';
import {
  buildResourceUri,
  encodeURIComponentTTL,
  escapeTTLString,
  sanitizeFilename,
  TTL_NAMESPACES,
  validateForm,
} from './utils';
import {
  generateCompleteDMNSection,
  sanitizeServiceIdentifier,
  validateDMNData,
} from './utils/dmnHelpers';
import { generateTTL as generateTTLNew } from './utils/ttlGenerator';

function App() {
  // These are UI-specific, not moved to hook
  const [activeTab, setActiveTab] = useState('service');
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [importStatus, setImportStatus] = useState({
    show: false,
    success: false,
    message: '',
  });
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Set states
  const {
    service,
    setService,
    organization,
    setOrganization,
    legalResource,
    setLegalResource,
    temporalRules,
    setTemporalRules,
    parameters,
    setParameters,
    cprmvRules,
    setCprmvRules,
    cost,
    setCost,
    output,
    setOutput,
    dmnData,
    setDmnData,
    iknowMappingConfig,
    setIknowMappingConfig, // ← used by IKnowMappingTab
    availableIKnowMappings, // ← passed to IKnowMappingTab
    // setAvailableIKnowMappings! ← Not needed in App.js
    clearAllData,
  } = useEditorState();

  // Parse TTL file and extract values (enhanced with vocabulary config)
  const parseTTL = (ttlContent) => {
    const parsed = parseTTLEnhanced(ttlContent);

    // Ensure all values are strings (never undefined/null)
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
      },
      legalResource: {
        bwbId: parsed.legalResource?.bwbId || '',
        version: parsed.legalResource?.version || '',
        title: parsed.legalResource?.title || '',
        description: parsed.legalResource?.description || '',
      },
      temporalRules: (parsed.temporalRules || []).map((rule) => ({
        ...rule,
        identifier: rule.identifier || '',
        title: rule.title || '',
      })),
      parameters: parsed.parameters || [],
      cprmvRules: parsed.cprmvRules || [],
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
    };
  };

  // Handle file import
  const handleImportFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.ttl')) {
      setImportStatus({
        show: true,
        success: false,
        message: 'Please select a .ttl file',
      });
      setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsed = parseTTL(content);

        setService(parsed.service);
        setOrganization(parsed.organization);
        setLegalResource(parsed.legalResource);
        setTemporalRules(parsed.temporalRules);
        setParameters(parsed.parameters);
        setCprmvRules(parsed.cprmvRules);
        setCost(parsed.cost);
        setOutput(parsed.output);

        // Handle DMN preservation
        if (parsed.hasDmnData && parsed.importedDmnBlocks) {
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
            importedDmnBlocks: parsed.importedDmnBlocks, // Store raw TTL
            isImported: true, // Flag as imported
          });

          setImportStatus({
            show: true,
            success: true,
            message: 'TTL imported successfully. DMN data preserved but cannot be edited.',
          });
          setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 4000);
        } else {
          // No DMN data in import - keep existing dmnData or reset
          setImportStatus({
            show: true,
            success: true,
            message: 'TTL imported successfully',
          });
          setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 4000);
        }
      } catch (error) {
        setImportStatus({
          show: true,
          success: false,
          message: `Import error: ${error.message}`,
        });
      }
    };

    reader.onerror = () => {
      setImportStatus({
        show: true,
        success: false,
        message: 'Error reading file. Please try again.',
      });
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  // Handle iKnow XML import with mapping
  const handleIKnowImport = (mappedData) => {
    try {
      // Populate tabs from mapped data
      if (mappedData.service) {
        setService((prev) => ({ ...prev, ...mappedData.service }));
      }
      if (mappedData.organization) {
        setOrganization((prev) => ({ ...prev, ...mappedData.organization }));
      }
      if (mappedData.legal) {
        setLegalResource((prev) => ({ ...prev, ...mappedData.legal }));
      }
      if (mappedData.rules && mappedData.rules.length > 0) {
        setTemporalRules(mappedData.rules);
      }
      if (mappedData.parameters && mappedData.parameters.length > 0) {
        setParameters(mappedData.parameters);
      }

      // Show success message
      setImportStatus({
        show: true,
        success: true,
        message: 'iKnow data imported successfully! Fields have been populated.',
      });
      setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 5000);

      // Switch to service tab to show results
      setActiveTab('service');
    } catch (error) {
      setImportStatus({
        show: true,
        success: false,
        message: error.message || 'Failed to import iKnow data.',
      });
      setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 5000);
    }
  };

  // Add parameter
  const addParameter = () => {
    setParameters([
      ...parameters,
      {
        id: Date.now(),
        notation: '',
        label: '',
        value: '',
        unit: 'EUR',
        description: '',
        validFrom: '',
        validUntil: '',
      },
    ]);
  };

  // Remove parameter
  const removeParameter = (id) => {
    setParameters(parameters.filter((param) => param.id !== id));
  };

  // Update parameter
  const updateParameter = (id, field, value) => {
    setParameters(
      parameters.map((param) => (param.id === id ? { ...param, [field]: value } : param))
    );
  };

  // Add temporal rule
  const addTemporalRule = () => {
    setTemporalRules([
      ...temporalRules,
      {
        id: Date.now(),
        identifier: '',
        title: '',
        uri: '',
        extends: '',
        validFrom: '',
        validUntil: '',
        confidenceLevel: 'high',
        description: '',
      },
    ]);
  };

  // Remove temporal rule
  const removeTemporalRule = (id) => {
    setTemporalRules(temporalRules.filter((rule) => rule.id !== id));
  };

  // Update temporal rule
  const updateTemporalRule = (id, field, value) => {
    setTemporalRules(
      temporalRules.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule))
    );
  };

  // Add CPRMV rule
  const addCPRMVRule = (initialData = null) => {
    const newRule = {
      id: Date.now(),
      ruleId: initialData?.ruleId || '',
      rulesetId: initialData?.rulesetId || '',
      definition: initialData?.definition || '',
      situatie: initialData?.situatie || '',
      norm: initialData?.norm || '',
      ruleIdPath: initialData?.ruleIdPath || '',
    };
    setCprmvRules([...cprmvRules, newRule]);
  };

  // Remove CPRMV rule
  const removeCPRMVRule = (id) => {
    setCprmvRules(cprmvRules.filter((rule) => rule.id !== id));
  };

  // Update CPRMV rule
  const updateCPRMVRule = (id, field, value) => {
    setCprmvRules(cprmvRules.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule)));
  };

  // Handle JSON import for CPRMV tab only
  const handleImportJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setImportStatus({
        show: true,
        success: false,
        message: 'Please select a .json file',
      });
      setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const jsonData = JSON.parse(content);

        if (!Array.isArray(jsonData)) {
          throw new Error('JSON must be an array of rules');
        }

        // Map JSON structure from normenbrief format to CPRMV rule structure
        const mappedRules = jsonData.map((rule, index) => ({
          id: Date.now() + index,
          ruleId: rule['https://cprmv.open-regels.nl/0.3.0/id'] || '',
          rulesetId: rule.rulesetid || '',
          definition: rule['https://cprmv.open-regels.nl/0.3.0/definition'] || '',
          situatie: rule.situatie || '',
          norm: rule.norm || '',
          ruleIdPath: rule.rule_id_path || '',
        }));

        setCprmvRules(mappedRules);

        setImportStatus({
          show: true,
          success: true,
          message: `Successfully imported ${mappedRules.length} CPRMV rules from JSON!`,
        });

        setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 5000);
      } catch (error) {
        setImportStatus({
          show: true,
          success: false,
          message: error.message || 'Failed to import JSON file.',
        });
        setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 5000);
      }
    };

    reader.onerror = () => {
      setImportStatus({
        show: true,
        success: false,
        message: 'Error reading file. Please try again.',
      });
      setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 4000);
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  // Clear all data
  const handleClearAll = () => {
    // 1. Clear data (delegated to hook)
    clearAllData();

    // 2. UI updates (stays in App.js)
    setShowClearDialog(false);
    setImportStatus({
      show: true,
      success: true,
      message: 'All fields have been cleared successfully!',
    });
    setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 4000);
    setActiveTab('service');
  };

  // Call in useEffect for testing
  useEffect(() => {
    const state = {
      service,
      organization,
      legalResource,
      temporalRules,
      parameters,
      cprmvRules,
      cost,
      output,
      dmnData,
    };
    const ttl = generateTTLNew(state);
    console.log('New generator TTL:', ttl);
  }, [
    service,
    organization,
    legalResource,
    temporalRules,
    parameters,
    cprmvRules,
    cost,
    output,
    dmnData,
  ]);

  // Generate TTL output
  const generateTTL = () => {
    const sanitizedIdentifier = sanitizeServiceIdentifier(service.identifier) || 'unknown-service';
    const serviceUri = `https://regels.overheid.nl/services/${sanitizedIdentifier}`;

    let ttl = TTL_NAMESPACES;

    // Service
    if (service.identifier) {
      ttl += `<${serviceUri}> a cpsv:PublicService ;\n`;
      ttl += `    dct:identifier "${escapeTTLString(sanitizedIdentifier)}" ;\n`;
      if (service.name)
        ttl += `    dct:title "${escapeTTLString(service.name)}"@${service.language} ;\n`;
      if (service.description)
        ttl += `    dct:description "${escapeTTLString(service.description)}"@${
          service.language
        } ;\n`;
      if (service.thematicArea) ttl += `    cv:thematicArea <${service.thematicArea}> ;\n`;
      if (service.sector && service.sector !== 'custom') {
        ttl += `    cv:sector <${service.sector}> ;\n`;
      } else if (service.sector === 'custom' && service.customSector) {
        ttl += `    cv:sector <${service.customSector}> ;\n`;
      }
      if (service.keywords)
        ttl += `    dcat:keyword "${escapeTTLString(service.keywords)}"@${service.language} ;\n`;
      if (service.language) {
        const languageUri = `https://publications.europa.eu/resource/authority/language/${service.language.toUpperCase()}`;
        ttl += `    dct:language <${languageUri}> ;\n`;
      }

      if (organization.identifier) {
        const orgUri = buildResourceUri(
          organization.identifier,
          'https://regels.overheid.nl/organizations/'
        );
        ttl += `    cv:hasCompetentAuthority <${orgUri}> ;\n`;
      }

      if (legalResource.bwbId) {
        const lowerBwbId = legalResource.bwbId.toLowerCase();
        const legalUri =
          lowerBwbId.startsWith('http://') || lowerBwbId.startsWith('https://')
            ? legalResource.bwbId
            : `https://wetten.overheid.nl/${legalResource.bwbId}`;
        ttl += `    cv:hasLegalResource <${legalUri}> ;\n`;
      }

      if (cost.identifier) {
        const encodedCostId = encodeURIComponent(cost.identifier);
        ttl += `    cv:hasCost <https://regels.overheid.nl/costs/${encodedCostId}> ;\n`;
      }

      if (output.identifier) {
        const encodedOutputId = encodeURIComponent(output.identifier);
        ttl += `    cpsv:produces <https://regels.overheid.nl/outputs/${encodedOutputId}> ;\n`;
      }

      // Add DMN reference if exists
      if (dmnData && dmnData.fileName) {
        ttl += `    cprmv:hasDecisionModel <${serviceUri}/dmn> ;\n`;
      }

      ttl = ttl.slice(0, -2) + ' .\n\n';
    }

    // Organization
    if (organization.identifier) {
      const orgUri = buildResourceUri(
        organization.identifier,
        'https://regels.overheid.nl/organizations/'
      );
      ttl += `<${orgUri}> a cv:PublicOrganisation ;\n`;
      ttl += `    dct:identifier "${escapeTTLString(organization.identifier)}" ;\n`;
      if (organization.name)
        ttl += `    skos:prefLabel "${escapeTTLString(organization.name)}"@nl ;\n`;
      if (organization.homepage) ttl += `    foaf:homepage <${organization.homepage}> ;\n`;
      if (organization.spatial) ttl += `    cv:spatial <${organization.spatial}> ;\n`; // âž• ADD
      ttl = ttl.slice(0, -2) + ' .\n\n';
    }

    // Legal Resource
    if (legalResource.bwbId) {
      // Support both full URIs and plain BWB IDs (case-insensitive check)
      const lowerBwbId = legalResource.bwbId.toLowerCase();
      const legalUri =
        lowerBwbId.startsWith('http://') || lowerBwbId.startsWith('https://')
          ? legalResource.bwbId
          : `https://wetten.overheid.nl/${legalResource.bwbId}`;

      ttl += `<${legalUri}> a eli:LegalResource ;\n`;
      // Extract just the BWB ID portion if it's a full URI
      const bwbIdOnly = legalResource.bwbId.replace(/^https?:\/\/[^/]+\//, '');
      ttl += `    dct:identifier "${escapeTTLString(bwbIdOnly)}" ;\n`;
      if (legalResource.title)
        ttl += `    dct:title "${escapeTTLString(legalResource.title)}"@nl ;\n`;
      if (legalResource.description)
        ttl += `    dct:description "${escapeTTLString(legalResource.description)}"@nl ;\n`;
      if (legalResource.version) {
        ttl += `    eli:is_realized_by <${legalUri}/${legalResource.version}> ;\n`;
      }
      ttl = ttl.slice(0, -2) + ' .\n\n';
    }

    // Temporal Rules
    temporalRules.forEach((rule, index) => {
      if (rule.uri || rule.extends) {
        const ruleUri = rule.uri || `https://regels.overheid.nl/rules/rule${index + 1}`;
        ttl += `<${ruleUri}> a cpsv:Rule, ronl:TemporalRule ;\n`;
        // Add explicit relationship to service
        ttl += `    cpsv:implements <${serviceUri}> ;\n`;
        if (rule.identifier) ttl += `    dct:identifier "${escapeTTLString(rule.identifier)}" ;\n`;
        if (rule.title) ttl += `    dct:title "${escapeTTLString(rule.title)}"@nl ;\n`;
        if (rule.extends) {
          const extendsUri = rule.extends.startsWith('http')
            ? rule.extends
            : `https://regels.overheid.nl/rules/${encodeURIComponentTTL(rule.extends)}`;
          ttl += `    ronl:extends <${extendsUri}> ;\n`;
        }
        if (rule.validFrom) ttl += `    ronl:validFrom "${rule.validFrom}"^^xsd:date ;\n`;
        if (rule.validUntil) ttl += `    ronl:validUntil "${rule.validUntil}"^^xsd:date ;\n`;
        if (rule.confidenceLevel)
          ttl += `    ronl:confidenceLevel "${escapeTTLString(rule.confidenceLevel)}" ;\n`;
        if (rule.description)
          ttl += `    dct:description "${escapeTTLString(rule.description)}"@nl ;\n`;
        ttl = ttl.slice(0, -2) + ' .\n\n';
      }
    });

    // Parameters
    parameters.forEach((param, index) => {
      if (param.notation && param.value) {
        const paramUri = `https://regels.overheid.nl/parameters/${encodeURIComponent(
          service.identifier || 'service'
        )}/param-${index + 1}`;
        ttl += `<${paramUri}> a ronl:ParameterWaarde ;\n`;
        if (param.label) ttl += `    skos:prefLabel "${escapeTTLString(param.label)}"@nl ;\n`;
        if (param.notation) ttl += `    skos:notation "${escapeTTLString(param.notation)}" ;\n`;
        if (param.value) ttl += `    schema:value "${param.value}"^^xsd:decimal ;\n`;
        if (param.unit) ttl += `    schema:unitCode "${param.unit}" ;\n`;
        if (param.description)
          ttl += `    dct:description "${escapeTTLString(param.description)}"@nl ;\n`;
        if (param.validFrom) ttl += `    ronl:validFrom "${param.validFrom}"^^xsd:date ;\n`;
        if (param.validUntil) ttl += `    ronl:validUntil "${param.validUntil}"^^xsd:date ;\n`;
        ttl = ttl.slice(0, -2) + ' .\n\n';
      }
    });

    // Cost
    if (cost.identifier) {
      const encodedCostId = encodeURIComponent(cost.identifier);
      ttl += `<https://regels.overheid.nl/costs/${encodedCostId}> a cv:Cost ;\n`;
      ttl += `    dct:identifier "${escapeTTLString(cost.identifier)}" ;\n`;
      if (cost.value) ttl += `    cv:value "${escapeTTLString(cost.value)}" ;\n`;
      if (cost.currency) ttl += `    cv:currency "${escapeTTLString(cost.currency)}" ;\n`;
      if (cost.description)
        ttl += `    dct:description "${escapeTTLString(cost.description)}"@nl ;\n`;
      ttl = ttl.slice(0, -2) + ' .\n\n';
    }

    // Output
    if (output.identifier) {
      const encodedOutputId = encodeURIComponent(output.identifier);
      ttl += `<https://regels.overheid.nl/outputs/${encodedOutputId}> a cv:Output ;\n`;
      ttl += `    dct:identifier "${escapeTTLString(output.identifier)}" ;\n`;
      if (output.name) ttl += `    dct:title "${escapeTTLString(output.name)}"@nl ;\n`;
      if (output.description)
        ttl += `    dct:description "${escapeTTLString(output.description)}"@nl ;\n`;
      if (output.type) ttl += `    dct:type <${output.type}> ;\n`;
      ttl = ttl.slice(0, -2) + ' .\n\n';
    }

    // CPRMV Rules
    cprmvRules.forEach((rule) => {
      // All fields are mandatory
      if (
        rule.ruleId &&
        rule.rulesetId &&
        rule.definition &&
        rule.situatie &&
        rule.norm &&
        rule.ruleIdPath
      ) {
        const ruleUri = `https://cprmv.open-regels.nl/rules/${encodeURIComponentTTL(rule.rulesetId)}_${encodeURIComponentTTL(rule.ruleId)}`;
        ttl += `<${ruleUri}> a cprmv:Rule ;\n`;
        ttl += `    cprmv:id "${escapeTTLString(rule.ruleId)}" ;\n`;
        ttl += `    cprmv:rulesetId "${escapeTTLString(rule.rulesetId)}" ;\n`;
        ttl += `    cprmv:definition "${escapeTTLString(rule.definition)}"@nl ;\n`;
        ttl += `    cprmv:situatie "${escapeTTLString(rule.situatie)}"@nl ;\n`;
        ttl += `    cprmv:norm "${escapeTTLString(rule.norm)}" ;\n`;
        ttl += `    cprmv:ruleIdPath "${escapeTTLString(rule.ruleIdPath)}" ;\n`;

        ttl = ttl.slice(0, -2) + ' .\n\n';
      }
    });

    // DMN section - Handle both imported and newly created DMN
    if (dmnData.isImported && dmnData.importedDmnBlocks) {
      // Import: Append preserved DMN blocks
      ttl += dmnData.importedDmnBlocks;
    } else if (dmnData && dmnData.fileName && dmnData.content) {
      // Regular DMN: newly created in DMN tab
      ttl += generateCompleteDMNSection(dmnData, serviceUri);
    }

    return ttl;
  };

  // Download TTL
  const downloadTTL = () => {
    const ttl = generateTTL();
    const blob = new Blob([ttl], { type: 'text/turtle' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = sanitizeFilename(service.identifier);
    a.download = `${filename}.ttl`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Validate form
  const handleValidate = () => {
    const { isValid, errors } = validateForm({
      service,
      organization,
      legalResource,
      temporalRules,
      parameters,
    });

    // DMN validation
    const dmnValidation = validateDMNData(dmnData);
    if (!dmnValidation.valid) {
      errors.push(...dmnValidation.errors.map((err) => `DMN: ${err}`));
    }

    if (!isValid) {
      alert('Validation errors:\n' + errors.join('\n'));
    } else {
      alert('✅ Validation successful! All required fields are filled correctly.');
    }
  };

  // Render functions

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className={`grid ${showPreviewPanel ? 'grid-cols-[1fr,500px]' : 'grid-cols-1'} gap-4`}>
        {/* LEFT SIDE: Main Editor (all existing content) */}
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Replace FileText icon with turtle SVG */}
                <img src="/favicon.svg" alt="Turtle icon" className="w-10 h-10" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">Core Public Service Editor</h1>
                  <p className="text-gray-600 text-sm">
                    Generate CPSV-AP compliant Terse RDF Triple Language files for government
                    services
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="ttl-import"
                  accept=".ttl"
                  onChange={handleImportFile}
                  className="hidden"
                />
                <label
                  htmlFor="ttl-import"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer shadow-md transition-colors"
                >
                  <Upload size={20} />
                  Import TTL File
                </label>

                {/* Toggle Preview Button */}
                <button
                  onClick={() => setShowPreviewPanel(!showPreviewPanel)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-colors ${
                    showPreviewPanel
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                  title={showPreviewPanel ? 'Hide preview panel' : 'Show preview panel'}
                >
                  <FileUp size={20} />
                  {showPreviewPanel ? 'Hide Preview' : 'Show Preview'}
                </button>

                <button
                  onClick={() => setShowClearDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md transition-colors"
                  title="Clear all fields"
                >
                  <Trash2 size={20} />
                  Clear All
                </button>
              </div>
            </div>

            {importStatus.show && (
              <div
                className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
                  importStatus.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {importStatus.success ? (
                  <CheckCircle className="text-green-600" size={24} />
                ) : (
                  <AlertCircle className="text-red-600" size={24} />
                )}
                <p className={importStatus.success ? 'text-green-800' : 'text-red-800'}>
                  {importStatus.message}
                </p>
              </div>
            )}
          </div>

          {/* Tabs and Content */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="flex border-b overflow-x-auto">
              {[
                'service',
                'organization',
                'legal',
                'rules',
                'parameters',
                'cprmv',
                'dmn',
                'iknow-mapping',
                'changelog',
              ].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-4 py-3 font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'service' && (
                    <span className="flex items-center justify-center gap-2">
                      <FileText size={18} />
                      Service
                    </span>
                  )}
                  {tab === 'organization' && (
                    <span className="flex items-center justify-center gap-2">
                      <Building2 size={18} />
                      Organization
                    </span>
                  )}
                  {tab === 'legal' && (
                    <span className="flex items-center justify-center gap-2">
                      <Scale size={18} />
                      Legal
                    </span>
                  )}
                  {tab === 'rules' && (
                    <span className="flex items-center justify-center gap-2">
                      <Clock size={18} />
                      Rules
                    </span>
                  )}
                  {tab === 'parameters' && (
                    <span className="flex items-center justify-center gap-2">
                      <Plus size={18} />
                      Parameters
                    </span>
                  )}
                  {tab === 'cprmv' && (
                    <span className="flex items-center justify-center gap-2">
                      <Database size={18} />
                      CPRMV
                    </span>
                  )}
                  {tab === 'dmn' && (
                    <span className="flex items-center justify-center gap-2">
                      <FileUp size={18} />
                      DMN
                      {dmnData.isImported && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-800 text-white text-xs rounded font-medium">
                          Imported
                        </span>
                      )}
                    </span>
                  )}
                  {tab === 'iknow-mapping' && (
                    <span className="flex items-center justify-center gap-2">
                      <Upload size={18} />
                      iKnow
                    </span>
                  )}
                  {tab === 'changelog' && (
                    <span className="flex items-center justify-center gap-2">
                      <History size={18} />
                      Changelog
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6 min-h-[600px]">
              {activeTab === 'service' && (
                <ServiceTab
                  service={service}
                  setService={setService}
                  cost={cost}
                  setCost={setCost}
                  output={output}
                  setOutput={setOutput}
                />
              )}{' '}
              {activeTab === 'organization' && (
                <OrganizationTab organization={organization} setOrganization={setOrganization} />
              )}
              {activeTab === 'legal' && (
                <LegalTab legalResource={legalResource} setLegalResource={setLegalResource} />
              )}
              {activeTab === 'rules' && (
                <RulesTab
                  temporalRules={temporalRules}
                  addTemporalRule={addTemporalRule}
                  removeTemporalRule={removeTemporalRule}
                  updateTemporalRule={updateTemporalRule}
                />
              )}
              {activeTab === 'parameters' && (
                <ParametersTab
                  parameters={parameters}
                  addParameter={addParameter}
                  removeParameter={removeParameter}
                  updateParameter={updateParameter}
                />
              )}
              {activeTab === 'cprmv' && (
                <CPRMVTab
                  cprmvRules={cprmvRules}
                  addCPRMVRule={addCPRMVRule}
                  removeCPRMVRule={removeCPRMVRule}
                  updateCPRMVRule={updateCPRMVRule}
                  handleImportJSON={handleImportJSON}
                  setCprmvRules={setCprmvRules}
                />
              )}
              {activeTab === 'dmn' && <DMNTab dmnData={dmnData} setDmnData={setDmnData} />}
              {activeTab === 'iknow-mapping' && (
                <IKnowMappingTab
                  mappingConfig={iknowMappingConfig}
                  setMappingConfig={setIknowMappingConfig}
                  availableMappings={availableIKnowMappings}
                  onImportComplete={handleIKnowImport}
                />
              )}
              {activeTab === 'changelog' && <ChangelogTab />}
            </div>
          </div>

          {/* Validate and Download Buttons */}
          <div className="mt-6 flex gap-4 justify-end">
            <button
              onClick={handleValidate}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg transition-colors"
            >
              <CheckCircle size={20} /> Validate
            </button>
            <button
              onClick={downloadTTL}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg transition-colors"
            >
              <Download size={20} /> Download TTL
            </button>
          </div>
        </div>

        {/* RIGHT SIDE: Live Preview Panel (conditionally rendered) */}
        {showPreviewPanel && (
          <div className="fixed right-0 top-0 h-screen w-[500px] z-50">
            <PreviewPanel ttlContent={generateTTL()} />
          </div>
        )}
      </div>
      {/* Clear Confirmation Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Clear All Fields?</h3>
            </div>

            <p className="text-gray-600 mb-6">
              This will permanently delete all data in all tabs (Service, Organization, Legal,
              Rules, Parameters, CPRMV, DMN, Cost, and Output). This action cannot be undone.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 size={18} />
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
