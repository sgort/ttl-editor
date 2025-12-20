// IKnowMappingTab.jsx - Tab for configuring iKnow XML import mappings

import React, { useState } from 'react';

import { applyMapping, getAvailableFields, parseIKnowXML } from '../../utils/iknowParser';

const IKnowMappingTab = ({
  mappingConfig,
  setMappingConfig,
  availableMappings,
  onImportComplete,
}) => {
  // Configuration mode state
  const [parsedData, setParsedData] = useState(null);
  const [availableFields, setAvailableFields] = useState(null);
  const [parseError, setParseError] = useState('');
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [activeMapping, setActiveMapping] = useState('service');

  // Import mode state
  const [mode, setMode] = useState('configure'); // 'configure' or 'import'
  const [importParsedData, setImportParsedData] = useState(null);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [importError, setImportError] = useState('');

  // CPSV-AP target fields organized by category
  const targetFields = {
    service: {
      label: 'Public Service Fields',
      fields: [
        {
          key: 'service.identifier',
          label: 'Unique identifier for this service',
          rdfProperty: 'dct:identifier',
          required: true,
        },
        {
          key: 'service.name',
          label: 'Official name of the service',
          rdfProperty: 'dct:title',
          required: true,
        },
        {
          key: 'service.description',
          label: 'Detailed description of the service',
          rdfProperty: 'dct:description',
          required: true,
        },
        {
          key: 'service.type',
          label: 'Type of public service',
          rdfProperty: 'dct:type',
          required: false,
        },
        {
          key: 'service.keyword',
          label: 'Comma-separated keywords',
          rdfProperty: 'dcat:keyword',
          required: false,
        },
        {
          key: 'service.sector',
          label: 'Government level providing this service',
          rdfProperty: 'cv:sector',
          required: false,
        },
        {
          key: 'service.thematicArea',
          label: 'URI for thematic classification',
          rdfProperty: 'cv:thematicArea',
          required: false,
        },
      ],
    },
    legal: {
      label: 'Legal Resource Fields',
      fields: [
        {
          key: 'legal.title',
          label: 'Official title of the legal document',
          rdfProperty: 'dct:title',
          required: true,
        },
        {
          key: 'legal.description',
          label: 'Description of the legal resource',
          rdfProperty: 'dct:description',
          required: false,
        },
        {
          key: 'legal.url',
          label: 'Dutch legal document identifier or URI',
          rdfProperty: 'eli:LegalResource',
          required: false,
        },
        {
          key: 'legal.identifier',
          label: 'Alternative identifier for the legal resource',
          rdfProperty: 'dct:identifier',
          required: false,
        },
        {
          key: 'legal.type',
          label: 'Type of legal document',
          rdfProperty: 'dct:type',
          required: false,
        },
      ],
    },
    rules: {
      label: 'Business Rule Fields',
      fields: [
        {
          key: 'rules.identifier',
          label: 'Unique identifier for this rule',
          rdfProperty: 'dct:identifier',
          required: true,
        },
        {
          key: 'rules.name',
          label: 'Name of the business rule',
          rdfProperty: 'dct:title',
          required: true,
        },
        {
          key: 'rules.description',
          label: 'Detailed description of the rule',
          rdfProperty: 'dct:description',
          required: false,
        },
        {
          key: 'rules.type',
          label: 'Type of business rule',
          rdfProperty: 'dct:type',
          required: false,
        },
        {
          key: 'rules.implements',
          label: 'Legal resource this rule implements',
          rdfProperty: 'cpsv:implements',
          required: false,
        },
      ],
    },
    parameters: {
      label: 'Parameter Fields',
      fields: [
        {
          key: 'parameters.name',
          label: 'Name of the parameter',
          rdfProperty: 'skos:prefLabel',
          required: true,
        },
        {
          key: 'parameters.value',
          label: 'Value of the parameter',
          rdfProperty: 'rdf:value',
          required: true,
        },
        {
          key: 'parameters.datatype',
          label: 'Data type of the parameter',
          rdfProperty: 'schema:valueReference',
          required: false,
        },
        {
          key: 'parameters.description',
          label: 'Description of the parameter',
          rdfProperty: 'skos:definition',
          required: false,
        },
      ],
    },
  };

  // Handle XML file upload and parsing
  // Load example XML file (Configure mode)
  const loadExampleXML = async () => {
    setParseError('');

    try {
      // Load the example XML file from project
      const response = await fetch('/CognitatieAnnotationExport.xml');
      if (!response.ok) {
        throw new Error('Failed to load example XML file');
      }

      const xmlContent = await response.text();
      const parsed = parseIKnowXML(xmlContent);
      setParsedData(parsed);
      const fields = getAvailableFields(parsed);
      setAvailableFields(fields);

      // Try to load the "AOW Example" configuration
      const exampleConfig = availableMappings?.find((m) => m.name === 'AOW Example');
      if (exampleConfig) {
        setMappingConfig({
          name: exampleConfig.name,
          description: exampleConfig.description || '',
          mappings: exampleConfig.mappings || {},
        });
        setConfigName(exampleConfig.name);
        setConfigDescription(exampleConfig.description || '');
      }
    } catch (error) {
      setParseError(`Failed to load example: ${error.message}`);
      setParsedData(null);
      setAvailableFields(null);
    }
  };

  // Load example XML file (Import mode)
  const loadExampleXMLForImport = async () => {
    setImportError('');
    setPreviewData(null);

    try {
      const response = await fetch('/CognitatieAnnotationExport.xml');
      if (!response.ok) {
        throw new Error('Failed to load example XML file');
      }

      const xmlContent = await response.text();
      const parsed = parseIKnowXML(xmlContent);
      setImportParsedData(parsed);

      // Pre-select "AOW Example" if available
      const exampleConfig = availableMappings?.find((m) => m.name === 'AOW Example');
      if (exampleConfig) {
        setSelectedConfig(exampleConfig.name);

        // Automatically preview the mapping
        try {
          const mappedData = applyMapping(parsed, exampleConfig);
          setPreviewData(mappedData);
        } catch (previewError) {
          setImportError(`Failed to preview mapping: ${previewError.message}`);
        }
      }
    } catch (error) {
      setImportError(`Failed to load example: ${error.message}`);
      setImportParsedData(null);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setParseError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseIKnowXML(e.target.result);
        setParsedData(parsed);
        const fields = getAvailableFields(parsed);
        setAvailableFields(fields);
      } catch (error) {
        setParseError(`Failed to parse XML: ${error.message}`);
        setParsedData(null);
        setAvailableFields(null);
      }
    };
    reader.readAsText(file);
  };

  // Add a new mapping
  const addMapping = (targetField) => {
    setMappingConfig((prev) => ({
      ...prev,
      mappings: {
        ...prev.mappings,
        [targetField]: {
          source: '',
          path: '',
          transform: null,
          filter: null,
        },
      },
    }));
  };

  // Update a mapping
  const updateMapping = (targetField, updates) => {
    setMappingConfig((prev) => ({
      ...prev,
      mappings: {
        ...prev.mappings,
        [targetField]: {
          ...prev.mappings[targetField],
          ...updates,
        },
      },
    }));
  };

  // Remove a mapping
  const removeMapping = (targetField) => {
    setMappingConfig((prev) => {
      const newMappings = { ...prev.mappings };
      delete newMappings[targetField];
      return { ...prev, mappings: newMappings };
    });
  };

  // Save configuration as JSON
  const saveConfiguration = () => {
    const config = {
      name: configName,
      description: configDescription,
      version: '1.0.0',
      createdDate: new Date().toISOString(),
      xmlFormat: parsedData?.type || 'Unknown',
      mappings: mappingConfig.mappings,
    };

    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iknow-mapping-${configName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load configuration from JSON
  const loadConfiguration = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        setConfigName(config.name || '');
        setConfigDescription(config.description || '');
        setMappingConfig({ mappings: config.mappings || {} });
      } catch (error) {
        alert(`Failed to load configuration: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Import mode: Handle XML data file upload
  const handleImportFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportError('');
    setPreviewData(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseIKnowXML(e.target.result);
        setImportParsedData(parsed);
      } catch (error) {
        setImportError(`Failed to parse XML: ${error.message}`);
        setImportParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  // Import mode: Preview the mapping
  const handlePreviewMapping = () => {
    if (!importParsedData || !selectedConfig) {
      setImportError('Please upload XML file and select a configuration');
      return;
    }

    try {
      const config = availableMappings?.find((m) => m.name === selectedConfig);
      if (!config) {
        setImportError('Selected configuration not found');
        return;
      }

      const mappedData = applyMapping(importParsedData, config);
      setPreviewData(mappedData);
      setImportError('');
    } catch (error) {
      setImportError(`Failed to apply mapping: ${error.message}`);
      setPreviewData(null);
    }
  };

  // Import mode: Import to editor
  const handleImportToEditor = () => {
    if (!previewData) {
      setImportError('No preview data available. Please preview first.');
      return;
    }

    if (onImportComplete) {
      onImportComplete(previewData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Mode Switcher */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">iKnow Integration</h2>
            <p className="text-gray-600">
              {mode === 'configure'
                ? 'Create reusable mapping configurations for iKnow XML imports'
                : 'Import iKnow XML data using saved configurations'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('configure')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                mode === 'configure'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🔧 Configure
            </button>
            <button
              onClick={() => setMode('import')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                mode === 'import'
                  ? 'bg-green-600 text-white shadow'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📥 Import Data
            </button>
          </div>
        </div>
      </div>

      {/* Configure Mode */}
      {mode === 'configure' && (
        <>
          {/* Configuration Metadata */}
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-xl font-bold">Configuration Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Configuration Name</label>
                <input
                  type="text"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  placeholder="e.g., AOW Pension Service Mapping"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={configDescription}
                  onChange={(e) => setConfigDescription(e.target.value)}
                  placeholder="Brief description of this mapping configuration"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-xl font-bold">1. Upload iKnow XML Export</h3>
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Upload CognitatieAnnotationExport.xml or SemanticsExport.xml
              </label>
              <div className="flex gap-3">
                <input
                  type="file"
                  accept=".xml"
                  onChange={handleFileUpload}
                  className="flex-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <button
                  onClick={loadExampleXML}
                  className="px-4 py-2 bg-purple-600 text-white rounded font-medium hover:bg-purple-700 whitespace-nowrap"
                >
                  Load Example
                </button>
              </div>
            </div>

            {parseError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {parseError}
              </div>
            )}

            {parsedData && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                <p className="font-medium">✓ Successfully parsed {parsedData.type}</p>
                <p className="text-sm mt-1">
                  Found: {parsedData.concepts?.length || 0} concepts
                  {parsedData.textAnnotations &&
                    `, ${parsedData.textAnnotations.length} annotations`}
                  {parsedData.documents && `, ${parsedData.documents.length} documents`}
                </p>
              </div>
            )}

            {/* Detailed Breakdown */}
            {parsedData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h4 className="font-bold text-blue-900">📊 Data Structure Breakdown</h4>

                {/* Concepts */}
                {parsedData.concepts && parsedData.concepts.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <h5 className="font-semibold text-gray-800 mb-2">
                      Concepts ({parsedData.concepts.length})
                    </h5>
                    <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
                      {parsedData.concepts.map((concept, idx) => (
                        <div key={idx} className="border-l-2 border-blue-300 pl-2 py-1">
                          <span className="font-medium text-gray-900">{concept.name}</span>
                          {concept.type && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {concept.type}
                            </span>
                          )}
                          {concept.definition && (
                            <p className="text-gray-600 text-xs mt-0.5">"{concept.definition}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents */}
                {parsedData.documents && parsedData.documents.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <h5 className="font-semibold text-gray-800 mb-2">
                      Documents ({parsedData.documents.length})
                    </h5>
                    <div className="space-y-1 text-sm">
                      {parsedData.documents.map((doc, idx) => (
                        <div key={idx} className="border-l-2 border-green-300 pl-2 py-1">
                          <span className="font-medium text-gray-900">{doc.name}</span>
                          {doc.type && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              {doc.type}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Text Annotations */}
                {parsedData.textAnnotations && parsedData.textAnnotations.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <h5 className="font-semibold text-gray-800 mb-2">
                      Text Annotations ({parsedData.textAnnotations.length})
                    </h5>
                    <p className="text-xs text-gray-600 mb-2">
                      Annotated text fragments with legal references (JuriConnect)
                    </p>
                    <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                      {parsedData.textAnnotations.slice(0, 10).map((ann, idx) => (
                        <div key={idx} className="border-l-2 border-purple-300 pl-2 py-1">
                          <span className="text-gray-700">{ann.text}</span>
                          {ann.type && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              {ann.type}
                            </span>
                          )}
                        </div>
                      ))}
                      {parsedData.textAnnotations.length > 10 && (
                        <p className="text-xs text-gray-500 italic">
                          ... and {parsedData.textAnnotations.length - 10} more annotations
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mapping Configuration Section */}
          {parsedData && availableFields && (
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <h3 className="text-xl font-bold">2. Configure Field Mappings</h3>

              {/* Category Tabs */}
              <div className="flex space-x-2 border-b">
                {Object.keys(targetFields).map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveMapping(category)}
                    className={`px-4 py-2 font-medium ${
                      activeMapping === category
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {targetFields[category].label}
                  </button>
                ))}
              </div>

              {/* Mapping Fields */}
              <div className="space-y-4 mt-4">
                {targetFields[activeMapping].fields.map((field) => {
                  const mapping = mappingConfig.mappings[field.key];
                  const isMapped = !!mapping;

                  return (
                    <div key={field.key} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-sm text-gray-700">
                            <span className="font-medium">{field.label}</span>
                            <span className="text-gray-500"> ({field.rdfProperty})</span>
                            {field.required && <span className="text-red-500"> *</span>}
                          </label>
                        </div>
                        {!isMapped ? (
                          <button
                            onClick={() => addMapping(field.key)}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Add Mapping
                          </button>
                        ) : (
                          <button
                            onClick={() => removeMapping(field.key)}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {isMapped && (
                        <div className="space-y-3 bg-gray-50 p-3 rounded">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium mb-1">
                                Source Collection
                              </label>
                              <select
                                value={mapping.source}
                                onChange={(e) =>
                                  updateMapping(field.key, { source: e.target.value })
                                }
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="">Select source...</option>
                                {Object.keys(availableFields).map((source) => (
                                  <option key={source} value={source}>
                                    {source}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium mb-1">Field Path</label>
                              <select
                                value={mapping.path}
                                onChange={(e) => updateMapping(field.key, { path: e.target.value })}
                                disabled={!mapping.source}
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="">Select field...</option>
                                {mapping.source &&
                                  availableFields[mapping.source]?.map((field) => (
                                    <option key={field.path} value={field.path}>
                                      {field.label} (e.g., {field.example})
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>

                          {/* Filter Section */}
                          {mapping.source === 'concepts' && (
                            <div className="border-t pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-medium text-blue-700">
                                  🔍 Filter by Concept Type (Optional)
                                </label>
                                <button
                                  onClick={() => {
                                    const hasFilter = mapping.filter && mapping.filter.type;
                                    updateMapping(field.key, {
                                      filter: hasFilter ? null : { type: '' },
                                    });
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  {mapping.filter?.type !== undefined
                                    ? 'Remove Filter'
                                    : 'Add Filter'}
                                </button>
                              </div>

                              {mapping.filter?.type !== undefined && (
                                <div className="bg-blue-50 p-2 rounded">
                                  <select
                                    value={mapping.filter.type || ''}
                                    onChange={(e) =>
                                      updateMapping(field.key, {
                                        filter: { type: e.target.value || null },
                                      })
                                    }
                                    className="w-full text-sm border border-blue-300 rounded px-2 py-1"
                                  >
                                    <option value="">-- No filter (use first concept) --</option>
                                    <option value="Rechtsbetrekking">
                                      Rechtsbetrekking (Legal relationship → Service)
                                    </option>
                                    <option value="Variabele">
                                      Variabele (Variable → Parameter name)
                                    </option>
                                    <option value="Rechtsfeit">
                                      Rechtsfeit (Legal fact → Parameter value)
                                    </option>
                                    <option value="Voorwaarde">
                                      Voorwaarde (Condition → Rule)
                                    </option>
                                    <option value="Juridisch relevant feit">
                                      Juridisch relevant feit (Legally relevant fact)
                                    </option>
                                    <option value="Rechtssubject">
                                      Rechtssubject (Legal subject)
                                    </option>
                                    <option value="Rechtsobject">
                                      Rechtsobject (Legal object)
                                    </option>
                                    <option value="Rechtsgevolg">
                                      Rechtsgevolg (Legal consequence)
                                    </option>
                                  </select>
                                  <p className="text-xs text-blue-600 mt-1">
                                    Only map concepts with this type
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Configuration Actions */}
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-xl font-bold">3. Save or Load Configuration</h3>

            <div className="flex space-x-4">
              <button
                onClick={saveConfiguration}
                disabled={!configName || Object.keys(mappingConfig.mappings).length === 0}
                className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                💾 Save Configuration
              </button>

              <label className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer">
                📁 Load Configuration
                <input type="file" accept=".json" onChange={loadConfiguration} className="hidden" />
              </label>
            </div>

            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
              <p className="font-medium">💡 Next Steps:</p>
              <ol className="list-decimal ml-5 mt-2 space-y-1">
                <li>Save your mapping configuration as a JSON file</li>
                <li>
                  Submit a Pull Request to add it to the codebase at{' '}
                  <code>/src/config/iknow-mappings/</code>
                </li>
                <li>After merge, use "Import Data" mode to import iKnow XML files</li>
              </ol>
            </div>
          </div>
        </>
      )}

      {/* Import Mode */}
      {mode === 'import' && (
        <>
          {/* Import Instructions */}
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">How to Import Data</h3>
                <div className="mt-2 text-sm text-green-700">
                  <ol className="list-decimal ml-5 space-y-1">
                    <li>Upload your iKnow XML data file</li>
                    <li>Select a saved mapping configuration</li>
                    <li>Preview the mapped data</li>
                    <li>Import to populate the editor tabs</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Data XML */}
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-xl font-bold">1. Upload iKnow XML Data File</h3>
            <div className="flex gap-3">
              <input
                type="file"
                accept=".xml"
                onChange={handleImportFileUpload}
                className="flex-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-green-50 file:text-green-700
                  hover:file:bg-green-100"
              />
              <button
                onClick={loadExampleXMLForImport}
                className="px-4 py-2 bg-purple-600 text-white rounded font-medium hover:bg-purple-700 whitespace-nowrap"
              >
                Load Example
              </button>
            </div>
            {importParsedData && (
              <div className="bg-green-50 border border-green-200 p-3 rounded">
                <p className="text-green-800 font-medium">
                  ✓ Successfully parsed {importParsedData.type}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Found: {importParsedData.concepts?.length || 0} concepts
                  {importParsedData.textAnnotations &&
                    `, ${importParsedData.textAnnotations.length} annotations`}
                  {importParsedData.documents && `, ${importParsedData.documents.length} documents`}
                </p>
              </div>
            )}
            {importError && (
              <div className="bg-red-50 border border-red-200 p-3 rounded">
                <p className="text-red-800">{importError}</p>
              </div>
            )}
          </div>

          {/* Select Configuration */}
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-xl font-bold">2. Select Mapping Configuration</h3>
            <select
              value={selectedConfig}
              onChange={(e) => setSelectedConfig(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">-- Select a configuration --</option>
              {availableMappings?.map((config) => (
                <option key={config.name} value={config.name}>
                  {config.name} - {config.description || 'No description'}
                </option>
              ))}
            </select>
            {availableMappings?.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                No mapping configurations available. Switch to "Configure" mode to create one.
              </p>
            )}
          </div>

          {/* Preview and Import */}
          {importParsedData && selectedConfig && (
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <h3 className="text-xl font-bold">3. Preview and Import</h3>

              <button
                onClick={handlePreviewMapping}
                className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                👁️ Preview Mapped Data
              </button>

              {previewData && (
                <div className="mt-4 space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded">
                    <div className="p-3 border-b border-gray-200 bg-gray-100">
                      <h4 className="font-semibold">Preview of Mapped Data</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        This shows how your data will be imported into the editor
                      </p>
                    </div>
                    <div className="p-4 max-h-96 overflow-y-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {JSON.stringify(previewData, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleImportToEditor}
                      className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                    >
                      ✓ Import to Editor
                    </button>
                    <button
                      onClick={() => setPreviewData(null)}
                      className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IKnowMappingTab;
