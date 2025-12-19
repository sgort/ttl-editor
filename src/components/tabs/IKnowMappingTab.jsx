// IKnowMappingTab.jsx - Tab for configuring iKnow XML import mappings

// eslint-disable-next-line no-unused-vars
import React, { useEffect, useState } from 'react';

import { getAvailableFields, parseIKnowXML } from '../../utils/iknowParser';

const IKnowMappingTab = ({ mappingConfig, setMappingConfig }) => {
  // eslint-disable-next-line no-unused-vars
  const [xmlFile, setXmlFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [availableFields, setAvailableFields] = useState(null);
  const [parseError, setParseError] = useState('');
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [activeMapping, setActiveMapping] = useState('service');

  // CPSV-AP target fields organized by category
  const targetFields = {
    service: {
      label: 'Public Service Fields',
      fields: [
        { key: 'service.identifier', label: 'Service Identifier', required: true },
        { key: 'service.name', label: 'Service Name', required: true },
        { key: 'service.description', label: 'Service Description', required: true },
        { key: 'service.type', label: 'Service Type', required: false },
        { key: 'service.keyword', label: 'Keywords (comma-separated)', required: false },
        { key: 'service.sector', label: 'Sector', required: false },
        { key: 'service.thematicArea', label: 'Thematic Area', required: false },
      ],
    },
    legal: {
      label: 'Legal Resource Fields',
      fields: [
        { key: 'legal.title', label: 'Legal Document Title', required: true },
        { key: 'legal.description', label: 'Legal Document Description', required: false },
        { key: 'legal.url', label: 'Legal Document URL', required: false },
        { key: 'legal.identifier', label: 'Legal Document Identifier', required: false },
        { key: 'legal.type', label: 'Legal Document Type', required: false },
      ],
    },
    rules: {
      label: 'Business Rule Fields',
      fields: [
        { key: 'rules.identifier', label: 'Rule Identifier', required: true },
        { key: 'rules.name', label: 'Rule Name', required: true },
        { key: 'rules.description', label: 'Rule Description', required: false },
        { key: 'rules.type', label: 'Rule Type', required: false },
        { key: 'rules.implements', label: 'Implements (Legal URI)', required: false },
      ],
    },
    parameters: {
      label: 'Parameter Fields',
      fields: [
        { key: 'parameters.name', label: 'Parameter Name', required: true },
        { key: 'parameters.value', label: 'Parameter Value', required: true },
        { key: 'parameters.datatype', label: 'Data Type', required: false },
        { key: 'parameters.description', label: 'Parameter Description', required: false },
      ],
    },
  };

  // Handle XML file upload and parsing
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setXmlFile(file);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-2">iKnow Import Mapping Configuration</h2>
        <p className="text-gray-600">
          Configure how iKnow XML exports (CognitatieAnnotationExport or SemanticsExport) map to
          CPSV-AP compliant TTL fields.
        </p>
      </div>

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
        <div>
          <label className="block text-sm font-medium mb-2">
            Upload CognitatieAnnotationExport.xml or SemanticsExport.xml
          </label>
          <input
            type="file"
            accept=".xml"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
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
              {parsedData.textAnnotations && `, ${parsedData.textAnnotations.length} annotations`}
              {parsedData.documents && `, ${parsedData.documents.length} documents`}
            </p>
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
                      <label className="font-medium">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
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
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded">
                      <div>
                        <label className="block text-xs font-medium mb-1">Source Collection</label>
                        <select
                          value={mapping.source}
                          onChange={(e) => updateMapping(field.key, { source: e.target.value })}
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
              <code>/src/configs/iknow-mappings/</code>
            </li>
            <li>Use the "Import" tab to import iKnow XML files with your configured mapping</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default IKnowMappingTab;
