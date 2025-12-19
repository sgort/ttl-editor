// IKnowImportTab.jsx - Enhanced import tab with iKnow XML mapping support

import React, { useState } from 'react';

import { applyMapping, parseIKnowXML } from './../../utils/iknowParser';

const IKnowImportTab = ({ onImportComplete, availableMappings = [] }) => {
  const [importMode, setImportMode] = useState('ttl'); // 'ttl' or 'iknow'
  const [selectedMapping, setSelectedMapping] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [xmlFile, setXmlFile] = useState(null);
  const [ttlFile, setTtlFile] = useState(null);
  const [parseResult, setParseResult] = useState(null);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);

  // Handle iKnow XML file upload
  const handleIKnowFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setXmlFile(file);
    setError('');
    setParseResult(null);

    try {
      const text = await file.text();
      const parsed = parseIKnowXML(text);
      setParseResult(parsed);
    } catch (err) {
      setError(`Failed to parse iKnow XML: ${err.message}`);
    }
  };

  // Handle TTL file upload (existing functionality)
  const handleTTLFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setTtlFile(file);
    setError('');

    try {
      // eslint-disable-next-line no-unused-vars
      const text = await file.text();
      // Existing TTL parsing logic would go here
      // For now, just store the file
    } catch (err) {
      setError(`Failed to read TTL file: ${err.message}`);
    }
  };

  // Apply selected mapping to parsed iKnow data
  const applyMappingToData = () => {
    if (!parseResult || !selectedMapping) {
      setError('Please select a mapping configuration');
      return;
    }

    try {
      // Find the selected mapping config
      const mappingConfig = availableMappings.find((m) => m.name === selectedMapping);
      if (!mappingConfig) {
        setError('Selected mapping configuration not found');
        return;
      }

      // Apply the mapping
      const mappedData = applyMapping(parseResult, mappingConfig);
      setPreviewData(mappedData);
      setError('');
    } catch (err) {
      setError(`Failed to apply mapping: ${err.message}`);
    }
  };

  // Import the mapped data into the editor
  const handleImport = () => {
    if (importMode === 'iknow') {
      if (!previewData) {
        setError('Please preview the mapping before importing');
        return;
      }
      onImportComplete(previewData);
    } else {
      // Handle TTL import
      if (!ttlFile) {
        setError('Please select a TTL file');
        return;
      }
      // Existing TTL import logic
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-2">Import Data</h2>
        <p className="text-gray-600">
          Import TTL files or iKnow XML exports with configured mappings
        </p>
      </div>

      {/* Import Mode Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">Import Mode</h3>
        <div className="flex space-x-4">
          <button
            onClick={() => setImportMode('ttl')}
            className={`px-6 py-3 rounded-lg font-medium ${
              importMode === 'ttl'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📄 Import TTL File
          </button>
          <button
            onClick={() => setImportMode('iknow')}
            className={`px-6 py-3 rounded-lg font-medium ${
              importMode === 'iknow'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🔄 Import iKnow XML
          </button>
        </div>
      </div>

      {/* TTL Import Section */}
      {importMode === 'ttl' && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h3 className="text-xl font-bold">Upload TTL File</h3>
          <input
            type="file"
            accept=".ttl"
            onChange={handleTTLFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />

          {ttlFile && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              <p className="font-medium">✓ File loaded: {ttlFile.name}</p>
              <button
                onClick={handleImport}
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Import TTL Data
              </button>
            </div>
          )}
        </div>
      )}

      {/* iKnow Import Section */}
      {importMode === 'iknow' && (
        <div className="space-y-6">
          {/* Step 1: Upload XML */}
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-xl font-bold">Step 1: Upload iKnow XML Export</h3>
            <input
              type="file"
              accept=".xml"
              onChange={handleIKnowFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />

            {parseResult && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                <p className="font-medium">✓ Successfully parsed {parseResult.type}</p>
                <p className="text-sm mt-1">
                  Knowledge Domain: {parseResult.metadata?.name || 'Unknown'}
                </p>
                <p className="text-sm">
                  Found: {parseResult.concepts?.length || 0} concepts
                  {parseResult.textAnnotations &&
                    `, ${parseResult.textAnnotations.length} annotations`}
                </p>
              </div>
            )}
          </div>

          {/* Step 2: Select Mapping */}
          {parseResult && (
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <h3 className="text-xl font-bold">Step 2: Select Mapping Configuration</h3>

              {availableMappings.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                  <p className="font-medium">⚠️ No mapping configurations available</p>
                  <p className="text-sm mt-1">
                    Please create a mapping configuration in the "iKnow Mapping" tab first.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select a mapping configuration:
                  </label>
                  <select
                    value={selectedMapping}
                    onChange={(e) => setSelectedMapping(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">-- Select mapping --</option>
                    {availableMappings.map((mapping) => (
                      <option key={mapping.name} value={mapping.name}>
                        {mapping.name} - {mapping.description}
                      </option>
                    ))}
                  </select>

                  {selectedMapping && (
                    <button
                      onClick={applyMappingToData}
                      className="mt-4 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Preview Mapping
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview Mapped Data */}
          {previewData && (
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <h3 className="text-xl font-bold">Step 3: Preview Mapped Data</h3>

              <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify(previewData, null, 2)}
                </pre>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleImport}
                  className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default IKnowImportTab;
