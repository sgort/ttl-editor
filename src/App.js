import './App.css';

import {
  AlertCircle,
  BookOpen,
  Building2,
  CheckCircle,
  Clock,
  Cloud,
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
import PublishDialog from './components/PublishDialog';
import {
  ChangelogTab,
  ConceptsTab,
  CPRMVTab,
  DMNTab,
  LegalTab,
  OrganizationTab,
  ParametersTab,
  RulesTab,
  ServiceTab,
  VendorTab,
} from './components/tabs';
import {
  useConceptsHandlers,
  useCprmvRulesHandlers,
  useParametersHandlers,
  useTemporalRulesHandlers,
} from './hooks/useArrayHandlers';
import { useEditorState } from './hooks/useEditorState';
import { sanitizeFilename, validateForm } from './utils';
import {
  publishToTriplyDB,
  saveTriplyDBConfig,
  updateTriplyDBService,
  uploadLogoAsset,
} from './utils';
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
    ronlAnalysis,
    setRonlAnalysis,
    ronlMethod,
    setRonlMethod,
    temporalRules,
    setTemporalRules,
    parameters,
    setParameters,
    cprmvRules,
    setCprmvRules,
    concepts,
    setConcepts,
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
    triplyDBConfig,
    setTriplyDBConfig,
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

  const { handleUpdateField: updateConcept, handleRemove: removeConcept } = useConceptsHandlers(
    concepts,
    setConcepts
  );

  // Helper to build state object for TTL generator
  const buildStateForTTL = () => ({
    service, // ← Use destructured variable
    organization, // ← Use destructured variable
    legalResource,
    ronlAnalysis,
    ronlMethod,
    temporalRules,
    parameters,
    cprmvRules,
    cost,
    output,
    dmnData,
    concepts,
  });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' | 'warning' | 'error' | 'info'
  const [publishingState, setPublishingState] = useState(null);

  // state variables for Publish dialog
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // Helper to get TTL content
  const getTTLContent = () => generateTTL(buildStateForTTL());

  const downloadTTL = async () => {
    const ttl = getTTLContent();
    const suggestedName =
      sanitizeFilename(service.name || service.identifier || 'service') + '.ttl';

    // Check if File System Access API is supported (Chrome, Edge, Opera)
    if ('showSaveFilePicker' in window) {
      try {
        // Show native Save As dialog
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: suggestedName,
          types: [
            {
              description: 'Turtle RDF Files',
              accept: {
                'text/turtle': ['.ttl'],
              },
            },
          ],
        });

        // Create a writable stream
        const writable = await fileHandle.createWritable();

        // Write the TTL content
        await writable.write(ttl);

        // Close the file
        await writable.close();

        // Success message
        setMessage(`File saved successfully as ${fileHandle.name}`);
        setMessageType('success');
        setTimeout(() => {
          setMessage('');
          setMessageType('');
        }, 5000);
      } catch (error) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.error('Error saving file:', error);
          setMessage('Error saving file. Using fallback download...');
          setMessageType('warning');

          // Fallback to traditional download
          fallbackDownload(ttl, suggestedName);

          setTimeout(() => {
            setMessage('');
            setMessageType('');
          }, 5000);
        }
        // If AbortError, user cancelled - do nothing
      }
    } else {
      // Browser doesn't support File System Access API
      // Use traditional download
      fallbackDownload(ttl, suggestedName);
    }
  };

  // Helper function for traditional download (fallback)
  const fallbackDownload = (content, filename) => {
    const blob = new Blob([content], { type: 'text/turtle' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (event) => {
    const setters = {
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
      ronlAnalysis,
      ronlMethod,
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

  // Returns progress updates for the dialog to display

  const handlePublish = async (config) => {
    // Don't close dialog immediately - keep it open for progress display
    // setShowPublishDialog(false); // ← Remove this line if it exists

    // Initialize publishing state
    setPublishingState({
      isPublishing: true,
      currentStep: 'validating',
      progress: 0,
      stepStatus: 'loading',
      error: null,
    });

    try {
      // Step 1: Validate form (0-20%)
      setPublishingState({
        isPublishing: true,
        currentStep: 'Validating form...',
        progress: 10,
        stepStatus: 'loading',
        error: null,
      });

      const { isValid, errors } = validateForm({
        service,
        organization,
        legalResource,
        ronlAnalysis,
        ronlMethod,
        temporalRules,
        parameters,
      });

      const dmnValidation = validateDMNData(dmnData);
      if (!dmnValidation.valid) {
        errors.push(...dmnValidation.errors.map((err) => `DMN: ${err}`));
      }

      if (!isValid || !dmnValidation.valid) {
        setPublishingState({
          isPublishing: false,
          currentStep: 'Validation failed',
          progress: 0,
          stepStatus: 'error',
          error: errors.join(', '),
        });

        setMessage(`Validation failed: ${errors.join(', ')}`);
        setMessageType('error');

        // Close dialog after 5 seconds
        setTimeout(() => {
          setShowPublishDialog(false);
          setPublishingState(null);
        }, 5000);

        // Clear message after 8 seconds
        setTimeout(() => {
          setMessage('');
          setMessageType('');
        }, 8000);

        return;
      }

      // Step 2: Generate TTL (20-40%)
      setPublishingState({
        isPublishing: true,
        currentStep: 'Generating TTL...',
        progress: 30,
        stepStatus: 'loading',
        error: null,
      });

      const ttlContent = generateTTL(buildStateForTTL());

      if (!ttlContent || ttlContent.trim().length === 0) {
        setPublishingState({
          isPublishing: false,
          currentStep: 'TTL generation failed',
          progress: 0,
          stepStatus: 'error',
          error: 'Generated TTL content is empty',
        });

        setMessage('Cannot publish: Generated TTL content is empty.');
        setMessageType('error');

        setTimeout(() => {
          setShowPublishDialog(false);
          setPublishingState(null);
        }, 5000);

        setTimeout(() => {
          setMessage('');
          setMessageType('');
        }, 8000);

        return;
      }

      const filename = sanitizeFilename(service.identifier || service.name || 'service');

      // Step 3: Upload to TriplyDB (40-70%)
      setPublishingState({
        isPublishing: true,
        currentStep: 'Uploading to TriplyDB...',
        progress: 50,
        stepStatus: 'loading',
        error: null,
      });

      console.log('Publishing with filename:', filename);

      const publishResult = await publishToTriplyDB(ttlContent, config, filename);
      console.log('Publish successful:', publishResult);

      setPublishingState({
        isPublishing: true,
        currentStep: 'Upload successful ✓',
        progress: 70,
        stepStatus: 'success',
        error: null,
      });

      // Step 3.5: Upload logo if present (70-75%)
      if (organization.logo && organization.logo.startsWith('data:')) {
        try {
          setPublishingState({
            isPublishing: true,
            currentStep: 'Uploading logo...',
            progress: 72,
            stepStatus: 'loading',
            error: null,
          });

          const orgId = organization.identifier.startsWith('http')
            ? organization.identifier.split('/').pop()
            : organization.identifier;
          const logoFileName = `${orgId}_logo.png`;

          await uploadLogoAsset(organization.logo, logoFileName, config);
          console.log('Logo uploaded successfully');

          setPublishingState({
            isPublishing: true,
            currentStep: 'Logo uploaded ✓',
            progress: 75,
            stepStatus: 'success',
            error: null,
          });
        } catch (logoError) {
          console.warn('Logo upload failed (continuing):', logoError);
          // Don't fail the entire publish if logo upload fails
        }
      }

      // Step 4: Update service (70-100%)
      setPublishingState({
        isPublishing: true,
        currentStep: 'Updating service...',
        progress: 85,
        stepStatus: 'loading',
        error: null,
      });

      try {
        const serviceName = config.dataset;
        await updateTriplyDBService(config, serviceName);

        console.log('Service updated successfully');

        // Step 5: Complete success!
        setPublishingState({
          isPublishing: false,
          currentStep: 'Published successfully! ✓',
          progress: 100,
          stepStatus: 'success',
          error: null,
        });

        // Save config
        saveTriplyDBConfig(config);
        setTriplyDBConfig(config);

        // Set success message under title (GREEN)
        setMessage(`Published successfully! View at: ${publishResult.url || 'TriplyDB'}`);
        setMessageType('success');

        // Close dialog after 2 seconds
        setTimeout(() => {
          setShowPublishDialog(false);
          setPublishingState(null);
        }, 2000);

        // Clear message after 10 seconds
        setTimeout(() => {
          setMessage('');
          setMessageType('');
        }, 10000);
      } catch (updateError) {
        console.warn('Service update failed:', updateError.message);

        // Upload succeeded, but service update failed - this is a WARNING, not error
        setPublishingState({
          isPublishing: false,
          currentStep: 'Published with warning',
          progress: 100,
          stepStatus: 'warning',
          error: `Service update failed: ${updateError.message}`,
        });

        // Save config anyway since publish succeeded
        saveTriplyDBConfig(config);
        setTriplyDBConfig(config);

        // Set warning message under title (YELLOW/ORANGE)
        setMessage(
          `Published successfully! Service update failed: ${updateError.message}. View at: ${publishResult.url || 'TriplyDB'}`
        );
        setMessageType('warning');

        // Close dialog after 3 seconds
        setTimeout(() => {
          setShowPublishDialog(false);
          setPublishingState(null);
        }, 3000);

        // Clear message after 12 seconds
        setTimeout(() => {
          setMessage('');
          setMessageType('');
        }, 12000);
      }
    } catch (error) {
      console.error('Publish error:', error);

      setPublishingState({
        isPublishing: false,
        currentStep: 'Publish failed',
        progress: 0,
        stepStatus: 'error',
        error: error.message,
      });

      // Set error message under title (RED)
      setMessage(`Publish failed: ${error.message}`);
      setMessageType('error');

      // Close dialog after 5 seconds
      setTimeout(() => {
        setShowPublishDialog(false);
        setPublishingState(null);
      }, 5000);

      // Clear message after 8 seconds
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 8000);
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

            {/* Import Status Messages */}
            {/* Keep importStatus as-is */}
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

            {/* NEW: Unified message system for publish status */}
            {message && (
              <div
                className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
                  messageType === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : messageType === 'warning'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : messageType === 'error'
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-blue-50 border border-blue-200'
                }`}
              >
                <span className="flex-shrink-0">
                  {messageType === 'success' && (
                    <CheckCircle className="text-green-600" size={24} />
                  )}
                  {messageType === 'warning' && (
                    <AlertCircle className="text-yellow-600" size={24} />
                  )}
                  {messageType === 'error' && <AlertCircle className="text-red-600" size={24} />}
                  {messageType === 'info' && <Cloud className="text-blue-600" size={24} />}
                </span>
                <p
                  className={`flex-1 text-sm ${
                    messageType === 'success'
                      ? 'text-green-800'
                      : messageType === 'warning'
                        ? 'text-yellow-800'
                        : messageType === 'error'
                          ? 'text-red-800'
                          : 'text-blue-800'
                  }`}
                >
                  {message}
                </p>
                <button
                  onClick={() => {
                    setMessage('');
                    setMessageType('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  aria-label="Close message"
                >
                  <span className="text-xl">✕</span>
                </button>
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
                'concepts',
                'vendor',
                'changelog',
              ].map((tab) => {
                // Determine active color based on RPP layer
                let activeColor = 'bg-white text-gray-900 font-bold border-b-2 border-gray-900'; // default

                if (tab === 'rules') {
                  activeColor = 'bg-white text-blue-600 border-b-2 border-blue-600'; // Rules - Blue
                } else if (tab === 'cprmv') {
                  activeColor = 'bg-white text-purple-600 border-b-2 border-purple-600'; // Policy - Purple
                } else if (tab === 'parameters') {
                  activeColor = 'bg-white text-green-600 border-b-2 border-green-600'; // Parameters - Green
                }

                return (
                  <button
                    key={tab}
                    data-tab-id={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 px-3 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? activeColor
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {tab === 'service' && (
                      <span className="flex items-center justify-center gap-1.5">
                        <FileText size={18} />
                        Service
                      </span>
                    )}
                    {tab === 'organization' && (
                      <span className="flex items-center justify-center gap-1.5">
                        <Building2 size={18} />
                        Organization
                      </span>
                    )}
                    {tab === 'legal' && (
                      <span className="flex items-center justify-center gap-1.5">
                        <Scale size={18} />
                        Legal
                      </span>
                    )}
                    {tab === 'rules' && (
                      <span className="flex items-center justify-center gap-1.5">
                        <Clock size={18} />
                        Rules
                      </span>
                    )}
                    {tab === 'parameters' && (
                      <span className="flex items-center justify-center gap-1.5">
                        <Plus size={18} />
                        Parameters
                      </span>
                    )}
                    {tab === 'cprmv' && (
                      <span className="flex items-center justify-center gap-1.5">
                        <Database size={18} />
                        Policy
                      </span>
                    )}
                    {tab === 'concepts' && (
                      <span className="flex items-center justify-center gap-1.5">
                        <BookOpen size={18} />
                        Concepts
                        {concepts.length > 0 ? (
                          <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded font-medium">
                            {concepts.length}
                          </span>
                        ) : (
                          <span className="ml-2 px-2 py-0.5 bg-gray-400 text-white text-xs rounded font-medium">
                            Needs DMN
                          </span>
                        )}
                      </span>
                    )}
                    {tab === 'dmn' && (
                      <span className="flex items-center justify-center gap-1.5">
                        <FileUp size={18} />
                        DMN
                        {dmnData.isImported && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-800 text-white text-xs rounded font-medium">
                            Imported
                          </span>
                        )}
                      </span>
                    )}
                    {tab === 'vendor' && (
                      <span className="flex items-center justify-center gap-1.5">
                        <Upload size={18} />
                        Vendor
                      </span>
                    )}
                    {tab === 'changelog' && (
                      <span className="flex items-center justify-center gap-1.5">
                        <History size={18} />
                        Changelog
                      </span>
                    )}
                  </button>
                );
              })}
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
                <LegalTab
                  legalResource={legalResource}
                  setLegalResource={setLegalResource}
                  ronlAnalysis={ronlAnalysis}
                  setRonlAnalysis={setRonlAnalysis}
                  ronlMethod={ronlMethod}
                  setRonlMethod={setRonlMethod}
                />
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
                  legalResource={legalResource}
                />
              )}
              {activeTab === 'dmn' && (
                <DMNTab dmnData={dmnData} setDmnData={setDmnData} setConcepts={setConcepts} />
              )}
              {activeTab === 'concepts' && (
                <ConceptsTab
                  concepts={concepts}
                  removeConcept={removeConcept}
                  updateConcept={updateConcept}
                  setConcepts={setConcepts}
                />
              )}
              {activeTab === 'vendor' && (
                <VendorTab
                  mappingConfig={iknowMappingConfig}
                  setMappingConfig={setIknowMappingConfig}
                  availableMappings={availableIKnowMappings}
                  onImportComplete={handleIKnowImport}
                />
              )}
              {activeTab === 'changelog' && <ChangelogTab />}
            </div>
          </div>

          {/* Button Row - Buttons aligned to the RIGHT */}
          <div className="flex flex-wrap items-center justify-end gap-3 mt-6">
            {/* Validate Button */}
            <button
              onClick={handleValidate}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CheckCircle size={20} />
              Validate
            </button>

            {/* Publish Button */}
            <button
              onClick={() => setShowPublishDialog(true)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Cloud size={20} />
              Publish
            </button>

            {/* Download Button */}
            <button
              onClick={downloadTTL}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={20} />
              Download TTL
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

      {/* Publish Dialog */}
      <PublishDialog
        isOpen={showPublishDialog}
        onClose={() => {
          setShowPublishDialog(false);
          setPublishingState(null); // Reset state on close
        }}
        onPublish={handlePublish}
        currentConfig={
          triplyDBConfig || {
            baseUrl: 'https://api.open-regels.triply.cc',
            account: '',
            dataset: '',
            apiToken: '',
          }
        }
        publishingState={publishingState}
      />
    </div>
  );
}

export default App;
