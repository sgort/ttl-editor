import './App.css';

import {
  AlertCircle,
  Building2,
  CheckCircle,
  Clock,
  Download,
  FileText,
  FileUp,
  History,
  Plus,
  Scale,
  Trash2,
  Upload,
} from 'lucide-react';
import React, { useState } from 'react';

import {
  ChangelogTab,
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

  // Service state
  const [service, setService] = useState(DEFAULT_SERVICE);
  const [organization, setOrganization] = useState(DEFAULT_ORGANIZATION);
  const [legalResource, setLegalResource] = useState(DEFAULT_LEGAL_RESOURCE);
  const [temporalRules, setTemporalRules] = useState([DEFAULT_TEMPORAL_RULE]);
  const [parameters, setParameters] = useState([DEFAULT_PARAMETER]);
  const [cost, setCost] = useState(DEFAULT_COST);
  const [output, setOutput] = useState(DEFAULT_OUTPUT);

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
      },
      legalResource: {
        bwbId: parsed.legalResource?.bwbId || '',
        version: parsed.legalResource?.version || '',
        title: parsed.legalResource?.title || '',
        description: parsed.legalResource?.description || '',
      },
      temporalRules: parsed.temporalRules || [],
      parameters: parsed.parameters || [],
      cost: {
        value: parsed.cost?.value || '',
        currency: parsed.cost?.currency || 'EUR',
        description: parsed.cost?.description || '',
      },
      output: {
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

  // Clear all data
  const handleClearAll = () => {
    setService(DEFAULT_SERVICE);
    setOrganization(DEFAULT_ORGANIZATION);
    setLegalResource(DEFAULT_LEGAL_RESOURCE);
    setTemporalRules([{ ...DEFAULT_TEMPORAL_RULE, id: 1 }]);
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
      if (service.name)
        ttl += `    dct:title "${escapeTTLString(service.name)}"@${service.language} ;\n`;
      if (service.description)
        ttl += `    dct:description "${escapeTTLString(service.description)}"@${
          service.language
        } ;\n`;
      if (service.thematicArea) ttl += `    cv:thematicArea <${service.thematicArea}> ;\n`;
      if (service.sector) ttl += `    cv:sector <${service.sector}> ;\n`;
      if (service.keywords)
        ttl += `    dcat:keyword "${escapeTTLString(service.keywords)}"@${service.language} ;\n`;
      if (service.language) ttl += `    dct:language "${service.language}" ;\n`;

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
        ttl += `    cpsv:follows <${legalUri}> ;\n`;
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
      ttl += `<${orgUri}> a org:Organization ;\n`;
      if (organization.name)
        ttl += `    skos:prefLabel "${escapeTTLString(organization.name)}"@nl ;\n`;
      if (organization.homepage) ttl += `    foaf:homepage <${organization.homepage}> ;\n`;
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
        ttl += `<${ruleUri}> a ronl:TemporalRule ;\n`;
        if (rule.extends) ttl += `    ronl:extends <${rule.extends}> ;\n`;
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
      if (output.name) ttl += `    dct:title "${escapeTTLString(output.name)}"@nl ;\n`;
      if (output.description)
        ttl += `    dct:description "${escapeTTLString(output.description)}"@nl ;\n`;
      if (output.type) ttl += `    dct:type <${output.type}> ;\n`;
      ttl = ttl.slice(0, -2) + ' .\n';
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

    if (!isValid) {
      alert('Validation errors:\n' + errors.join('\n'));
    } else {
      alert('✅ Validation successful! All required fields are filled correctly.');
    }
  };

  // Render functions

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="text-blue-600" size={32} />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Public Service TTL Editor</h1>
                <p className="text-gray-600 text-sm">
                  Generate RDF/Turtle files for government services
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

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex border-b overflow-x-auto">
            {[
              'service',
              'organization',
              'legal',
              'rules',
              'parameters',
              'preview',
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
                {tab === 'preview' && (
                  <span className="flex items-center justify-center gap-2">
                    <FileUp size={18} />
                    Preview
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

          <div className="p-6">
            {activeTab === 'service' && <ServiceTab service={service} setService={setService} />}{' '}
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
            {activeTab === 'changelog' && <ChangelogTab />}
            {activeTab === 'preview' && (
              <div>
                <h3 className="text-lg font-semibold text-blue-700 border-b pb-2 mb-4">
                  TTL Preview
                </h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-sm font-mono max-h-[1600px] overflow-y-auto">
                  {generateTTL()}
                </pre>
              </div>
            )}
          </div>
        </div>

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

        <footer className="mt-8 pt-6 border-t text-center text-gray-600 text-sm">
          <p>
            Public Service TTL Editor - Part of RONL Initiative
            <br />
            Based on{' '}
            <a
              href="https://git.open-regels.nl/showcases/aow/-/blob/main/NAMESPACE-PROPERTIES.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              NAMESPACE-PROPERTIES.md
            </a>
          </p>
        </footer>
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
              Rules, Parameters, Cost, and Output). This action cannot be undone.
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
