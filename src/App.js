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
import React, { useEffect, useState } from 'react';

import PreviewPanel from './components/PreviewPanel';
import {
  ChangelogTab,
  CPRMVTab,
  IKnowMappingTab,
  LegalTab,
  OrganizationTab,
  ParametersTab,
  RulesTab,
  ServiceTab,
} from './components/tabs';
import parseTTLEnhanced from './parseTTL.enhanced';
import {
  buildResourceUri,
  DEFAULT_COST,
  DEFAULT_CPRMV_RULE,
  DEFAULT_LEGAL_RESOURCE,
  DEFAULT_ORGANIZATION,
  DEFAULT_OUTPUT,
  DEFAULT_PARAMETER,
  DEFAULT_SERVICE,
  DEFAULT_TEMPORAL_RULE,
  encodeURIComponentTTL,
  escapeTTLString,
  sanitizeFilename,
  TTL_NAMESPACES,
  validateForm,
} from './utils';

function App() {
  const [activeTab, setActiveTab] = useState('service');
  const [importStatus, setImportStatus] = useState({
    show: false,
    success: false,
    message: '',
  });
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);

  // Service state
  const [service, setService] = useState({
    ...DEFAULT_SERVICE,
    customSector: '',
  });
  const [organization, setOrganization] = useState(DEFAULT_ORGANIZATION);
  const [legalResource, setLegalResource] = useState(DEFAULT_LEGAL_RESOURCE);
  const [temporalRules, setTemporalRules] = useState([DEFAULT_TEMPORAL_RULE]);
  const [parameters, setParameters] = useState([DEFAULT_PARAMETER]);
  const [cprmvRules, setCprmvRules] = useState([DEFAULT_CPRMV_RULE]);
  const [cost, setCost] = useState(DEFAULT_COST);
  const [output, setOutput] = useState(DEFAULT_OUTPUT);
  const [iknowMappingConfig, setIknowMappingConfig] = useState({ mappings: {} });
  const [availableIKnowMappings, setAvailableIKnowMappings] = useState([]);

  // Load available iKnow mapping configurations on mount
  useEffect(() => {
    loadAvailableIKnowMappings();
  }, []);

  const loadAvailableIKnowMappings = async () => {
    try {
      const mappings = [
        await import('./config/iknow-mappings/iknow-mapping-aow-basic.json'),
        await import('./config/iknow-mappings/iknow-mapping-semantics.json'),
      ];
      setAvailableIKnowMappings(mappings.map((m) => m.default));
    } catch (error) {
      console.error('Failed to load iKnow mappings:', error);
      // Fail silently - mappings are optional
    }
  };

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
      setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 3000);
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
        setCost(parsed.cost);
        setOutput(parsed.output);

        // Always reset arrays - if new file has data, use it; if not, use defaults
        if (parsed.temporalRules.length > 0) {
          setTemporalRules(parsed.temporalRules);
        } else {
          // Reset to single empty rule if new file has none
          setTemporalRules([
            {
              id: 1,
              uri: '',
              extends: '',
              validFrom: '',
              validUntil: '',
              confidenceLevel: 'high',
              description: '',
            },
          ]);
        }

        if (parsed.parameters.length > 0) {
          setParameters(parsed.parameters);
        } else {
          // Reset to single empty parameter if new file has none
          setParameters([
            {
              id: 1,
              notation: '',
              label: '',
              value: '',
              unit: 'EUR',
              description: '',
              validFrom: '',
              validUntil: '',
            },
          ]);
        }

        if (parsed.cprmvRules && parsed.cprmvRules.length > 0) {
          console.log('🎯 About to set CPRMV rules:', parsed.cprmvRules);
          console.log('🎯 Number of rules:', parsed.cprmvRules.length);
          setCprmvRules(parsed.cprmvRules);
          console.log('✅ setCprmvRules called');
        } else {
          console.log('⚠️ No CPRMV rules found, using default');
          setCprmvRules([{ ...DEFAULT_CPRMV_RULE, id: 1 }]);
        }

        setImportStatus({
          show: true,
          success: true,
          message: 'TTL file imported successfully! All fields have been populated.',
        });

        setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 5000);
        setActiveTab('service');
      } catch (error) {
        setImportStatus({
          show: true,
          success: false,
          message: error.message || 'Failed to import file. Please check the TTL format.',
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
      setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 3000);
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
      setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 3000);
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
      setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 3000);
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  // Clear all data
  const handleClearAll = () => {
    setService(DEFAULT_SERVICE);
    setOrganization(DEFAULT_ORGANIZATION);
    setLegalResource(DEFAULT_LEGAL_RESOURCE);
    setTemporalRules([{ ...DEFAULT_TEMPORAL_RULE, id: 1 }]);
    setCprmvRules([{ ...DEFAULT_CPRMV_RULE, id: 1 }]);
    setParameters([{ ...DEFAULT_PARAMETER, id: 1 }]);
    setCost(DEFAULT_COST);
    setOutput(DEFAULT_OUTPUT);

    // Close dialog and show success message
    setShowClearDialog(false);
    setImportStatus({
      show: true,
      success: true,
      message: 'All fields have been cleared successfully!',
    });
    setTimeout(() => setImportStatus({ show: false, success: false, message: '' }), 3000);

    // Switch to service tab
    setActiveTab('service');
  };

  // Generate TTL output
  const generateTTL = () => {
    let ttl = TTL_NAMESPACES;

    // Service
    if (service.identifier) {
      const encodedId = encodeURIComponentTTL(service.identifier);
      ttl += `<https://regels.overheid.nl/services/${encodedId}> a cpsv:PublicService ;\n`;
      ttl += `    dct:identifier "${escapeTTLString(service.identifier)}" ;\n`;
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
        ttl += `    cpsv:implements <https://regels.overheid.nl/services/${encodeURIComponentTTL(service.identifier)}> ;\n`;
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
              Rules, Parameters, CPRMV, Cost, and Output). This action cannot be undone.
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
