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
import React, { useState } from 'react';

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
import {
  useCprmvRulesHandlers,
  useParametersHandlers,
  useTemporalRulesHandlers,
} from './hooks/useArrayHandlers';
import { useEditorState } from './hooks/useEditorState';
import { sanitizeFilename, validateForm } from './utils';
import { validateDMNData } from './utils/dmnHelpers';
import { handleTTLImport } from './utils/importHandler';
import { generateTTL } from './utils/ttlGenerator';

function App() {
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

  // These are UI-specific, not moved to hook
  const [activeTab, setActiveTab] = useState('service');
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [importStatus, setImportStatus] = useState({
    show: false,
    success: false,
    message: '',
  });
  const [showClearDialog, setShowClearDialog] = useState(false);

  // ADD: Array handlers using custom hooks
  const {
    handleAdd: addTemporalRule,
    handleUpdateField: updateTemporalRule,
    handleRemove: removeTemporalRule,
  } = useTemporalRulesHandlers(temporalRules, setTemporalRules);

  const {
    handleAdd: addParameter,
    handleUpdateField: updateParameter,
    handleRemove: removeParameter,
  } = useParametersHandlers(parameters, setParameters);

  const {
    handleAdd: addCPRMVRule,
    handleUpdateField: updateCPRMVRule,
    handleRemove: removeCPRMVRule,
  } = useCprmvRulesHandlers(cprmvRules, setCprmvRules);

  // Helper to build state object for TTL generator
  const buildStateForTTL = () => ({
    service, // ← Use destructured variable
    organization, // ← Use destructured variable
    legalResource,
    temporalRules,
    parameters,
    cprmvRules,
    cost,
    output,
    dmnData,
  });

  // Helper to get TTL content
  const getTTLContent = () => generateTTL(buildStateForTTL());

  const downloadTTL = () => {
    const ttl = getTTLContent();
    const blob = new Blob([ttl], { type: 'text/turtle' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sanitizeFilename(service.name || service.identifier || 'service') + '.ttl';
    //                                 ↑ Direct reference
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (event) => {
    const setters = {
      setService,
      setOrganization,
      setLegalResource,
      setTemporalRules,
      setParameters,
      setCprmvRules,
      setCost,
      setOutput,
      setDmnData,
      setIknowMappingConfig,
    };

    handleTTLImport(event, setters, setImportStatus);

    // Reset the file input so the same file can be imported again
    event.target.value = null;
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
            <PreviewPanel ttlContent={getTTLContent()} />
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
