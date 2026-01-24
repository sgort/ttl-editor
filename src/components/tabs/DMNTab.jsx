import {
  AlertCircle,
  CheckCircle,
  Code,
  FileText,
  Play,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import React, { useState } from 'react';

import {
  extractInputsFromTestResult,
  extractOutputsFromTestResult,
  generateConceptDefinition,
  generateConceptLabel,
  generateConceptNotation,
  generateConceptUri,
} from '../../utils/dmnHelpers';

const DMNTab = ({ dmnData, setDmnData, setConcepts }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [testBody, setTestBody] = useState('');
  const [testResponse, setTestResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deploymentStatus, setDeploymentStatus] = useState(null);

  // Default Operaton configuration
  const [apiConfig, setApiConfig] = useState({
    baseUrl: 'https://operaton-doc.open-regels.nl',
    decisionKey: '',
    evaluateEndpoint: '/engine-rest/decision-definition/key/{key}/evaluate',
    deploymentEndpoint: '/engine-rest/deployment/create',
  });

  // Check if DMN was imported - show notice instead of normal UI
  if (dmnData.isImported) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">📋 DMN Data Imported</h3>
              <p className="text-blue-800 mb-4 leading-relaxed">
                This TTL file contains DMN decision model data that was imported from an external
                source. The DMN data is <strong>preserved</strong> in your TTL exports but cannot be
                edited in this interface.
              </p>

              <div className="bg-white border border-blue-300 rounded-md p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  What's Preserved:
                </h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>
                      <strong>Decision Model Metadata</strong> - Deployment ID, timestamps, test
                      status
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>
                      <strong>Input Variables</strong> - Variable names, types, and example values
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>
                      <strong>Extracted Decision Rules</strong> - Rules with legal references and
                      validity periods
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>
                      <strong>API Integration</strong> - Operaton endpoint references
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-300 rounded-md p-4 mb-4">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">How to Edit DMN Data:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Export your current TTL (DMN data will be included)</li>
                      <li>Manually remove the DMN sections from the TTL file if needed</li>
                      <li>Re-import the TTL and use the DMN tab to create new DMN data</li>
                    </ol>
                    <p className="mt-2">
                      <strong>Or</strong> click "Clear Imported DMN Data" below to create new DMN
                      models.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-blue-200">
                <div className="text-sm text-blue-700">
                  <svg
                    className="w-5 h-5 inline mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <strong>Your exports will include the original DMN data unchanged.</strong>
                </div>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        'Clear imported DMN data?\n\n' +
                          'This will remove the imported DMN blocks AND all associated concepts.\n\n' +
                          'Note: You can always re-import the original TTL file to restore both DMN data and concepts.'
                      )
                    ) {
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
                      setConcepts([]);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                             transition-colors duration-200 flex items-center space-x-2 shadow-sm
                             hover:shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span>Clear Imported DMN Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Why can't I edit imported DMN?
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            The DMN tab is designed for <strong>creating and deploying</strong> new DMN decision
            models to Operaton. When you import a TTL file that already contains DMN data, it
            preserves that data exactly as it was, including deployment IDs, test results, and rule
            extractions. This ensures data integrity and prevents accidental modifications to
            production decision models.
          </p>
          <p className="text-sm text-gray-700 mt-2 leading-relaxed">
            You can still edit all other aspects of your service (Service, Organization, Legal,
            Rules, Parameters) and the DMN data will remain unchanged in your exports.
          </p>
        </div>
      </div>
    );
  }

  /**
   * Generate concepts from DMN test results and store in state
   */
  const generateConceptsFromTest = (testResult, testBodyData) => {
    const serviceIdentifier = dmnData.decisionKey || 'unknown-service';
    const inputs = extractInputsFromTestResult({ testBody: testBodyData });
    const outputs = extractOutputsFromTestResult({ lastTestResult: testResult });

    const usedNotations = [];
    const generatedConcepts = [];
    let idCounter = 1;

    // Generate input concepts
    inputs.forEach((input, index) => {
      const notation = generateConceptNotation(input.name, usedNotations);
      usedNotations.push(notation);

      generatedConcepts.push({
        id: idCounter++,
        uri: generateConceptUri(input.name, serviceIdentifier),
        variableName: input.name,
        prefLabel: generateConceptLabel(input.name),
        definition: generateConceptDefinition(input.name, input.type, 'input'),
        notation: notation,
        linkedTo: `input/${index + 1}`,
        linkedToType: 'input',
        exactMatch: '',
        type: 'dmn:InputVariable',
      });
    });

    // Generate output concepts
    outputs.forEach((output, index) => {
      const notation = generateConceptNotation(output.name, usedNotations);
      usedNotations.push(notation);

      generatedConcepts.push({
        id: idCounter++,
        uri: generateConceptUri(output.name, serviceIdentifier),
        variableName: output.name,
        prefLabel: generateConceptLabel(output.name),
        definition: generateConceptDefinition(output.name, output.type, 'output'),
        notation: notation,
        linkedTo: `output/${index + 1}`,
        linkedToType: 'output',
        exactMatch: '',
        type: 'dmn:OutputVariable',
      });
    });

    // Store in state
    setConcepts(generatedConcepts);
  };

  // Generate request body from DMN input variables
  const generateRequestBodyFromDMN = (dmnContent) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(dmnContent, 'text/xml');

      // Find all inputData elements
      const inputDataElements = xmlDoc.querySelectorAll('inputData');

      if (inputDataElements.length === 0) {
        return '';
      }

      const variables = {};

      inputDataElements.forEach((inputData) => {
        const name = inputData.getAttribute('name');

        if (name) {
          // Determine appropriate default value and type based on name patterns
          let value = '';
          let type = 'String';

          // Date patterns - check for datum, date, OR dag (Dutch for "day")
          if (
            name.toLowerCase().includes('datum') ||
            name.toLowerCase().includes('date') ||
            name.toLowerCase().includes('dag')
          ) {
            value = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD
            type = 'String';
          }
          // Boolean patterns
          else if (name.toLowerCase().includes('is') || name.toLowerCase().includes('heeft')) {
            value = false;
            type = 'Boolean';
          }
          // Number patterns
          else if (name.toLowerCase().includes('aantal') || name.toLowerCase().includes('bedrag')) {
            value = 0;
            type = 'Integer';
          }
          // Default to string
          else {
            value = '';
            type = 'String';
          }

          variables[name] = {
            value: value,
            type: type,
          };
        }
      });

      const requestBody = {
        variables: variables,
      };

      return JSON.stringify(requestBody, null, 2);
    } catch (err) {
      console.error('Error generating request body from DMN:', err);
      return '';
    }
  };

  const loadExampleDMN = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch the example DMN file from the public folder or examples directory
      const response = await fetch('/examples/organizations/svb/RONL_BerekenLeeftijden_CPRMV.dmn');

      if (!response.ok) {
        throw new Error(
          `Failed to load example DMN file (${response.status} ${response.statusText}). Make sure the file exists in public/examples/organizations/svb/`
        );
      }

      const content = await response.text();
      const fileName = 'RONL_BerekenLeeftijden_CPRMV.dmn';

      // Extract decision key from DMN first
      let extractedDecisionKey = '';
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, 'text/xml');
        const decisionElement = xmlDoc.querySelector('decision');
        if (decisionElement) {
          const decisionId = decisionElement.getAttribute('id');
          if (decisionId) {
            extractedDecisionKey = decisionId;
          }
        }
      } catch (err) {
        console.error('Error parsing DMN:', err);
      }

      setUploadedFile({
        name: fileName,
        content: content,
        size: content.length,
        uploadDate: new Date().toISOString(),
      });

      // Update apiConfig with extracted decision key
      if (extractedDecisionKey) {
        setApiConfig((prev) => ({
          ...prev,
          decisionKey: extractedDecisionKey,
        }));
      }

      // Update parent state with extracted decision key
      setDmnData({
        ...dmnData,
        fileName: fileName,
        content: content,
        decisionKey: extractedDecisionKey || apiConfig.decisionKey,
      });

      // Auto-generate request body from the DMN (same as manual upload)
      const generatedBody = generateRequestBodyFromDMN(content);
      if (generatedBody) {
        setTestBody(generatedBody);
      }
    } catch (err) {
      setError(err.message || 'Failed to load example DMN file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.dmn')) {
      setError('Please upload a valid DMN file (.dmn extension)');
      return;
    }

    setError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target.result;

      // Extract decision key from DMN first
      let extractedDecisionKey = '';
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, 'text/xml');
        const decisionElement = xmlDoc.querySelector('decision');
        if (decisionElement) {
          const decisionId = decisionElement.getAttribute('id');
          if (decisionId) {
            extractedDecisionKey = decisionId;
          }
        }
      } catch (err) {
        console.error('Error parsing DMN:', err);
      }

      setUploadedFile({
        name: file.name,
        content: content,
        size: file.size,
        uploadDate: new Date().toISOString(),
      });

      // Update apiConfig with extracted decision key
      if (extractedDecisionKey) {
        setApiConfig((prev) => ({
          ...prev,
          decisionKey: extractedDecisionKey,
        }));
      }

      // Update parent state
      setDmnData({
        ...dmnData,
        fileName: file.name,
        content: content,
        decisionKey: extractedDecisionKey || apiConfig.decisionKey,
      });

      // Generate request body from DMN input variables
      const generatedBody = generateRequestBodyFromDMN(content);
      if (generatedBody) {
        setTestBody(generatedBody);
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
    };

    reader.readAsText(file);
  };

  const handleDeployDMN = async () => {
    if (!uploadedFile) {
      setError('Please upload a DMN file first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setDeploymentStatus(null);

    try {
      const formData = new FormData();
      const blob = new Blob([uploadedFile.content], { type: 'application/xml' });
      formData.append('deployment-name', `DMN-${uploadedFile.name}-${Date.now()}`);
      formData.append('deployment-source', 'CPSV-Editor');
      formData.append('data', blob, uploadedFile.name);

      const response = await fetch(`${apiConfig.baseUrl}${apiConfig.deploymentEndpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Deployment failed: ${response.statusText}`);
      }

      const result = await response.json();
      setDeploymentStatus({
        success: true,
        message: 'DMN deployed successfully',
        deploymentId: result.id,
        deployedAt: new Date().toISOString(),
      });

      // Update parent state with deployment info
      setDmnData({
        ...dmnData,
        deploymentId: result.id,
        deployedAt: new Date().toISOString(),
        deployed: true,
      });
    } catch (err) {
      setError(err.message);
      setDeploymentStatus({
        success: false,
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluateDMN = async () => {
    if (!uploadedFile && !dmnData?.deployed) {
      setError('Please upload and deploy a DMN file first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTestResponse(null);

    try {
      let requestBody;
      try {
        requestBody = JSON.parse(testBody);
      } catch (err) {
        throw new Error('Invalid JSON in request body');
      }

      const evaluateUrl = `${apiConfig.baseUrl}${apiConfig.evaluateEndpoint.replace('{key}', apiConfig.decisionKey)}`;

      const response = await fetch(evaluateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Evaluation failed: ${response.statusText}\n${errorText}`);
      }

      const result = await response.json();
      setTestResponse({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });

      // Update parent state with test results AND test body
      setDmnData({
        ...dmnData,
        lastTestResult: result,
        lastTestTimestamp: new Date().toISOString(),
        testBody: testBody,
        apiEndpoint: evaluateUrl,
      });

      // Generate concepts from test results
      generateConceptsFromTest(result, testBody);
    } catch (err) {
      setError(err.message);
      setTestResponse({
        success: false,
        error: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFile = () => {
    setUploadedFile(null);
    setTestResponse(null);
    setDeploymentStatus(null);
    setError(null);
    setTestBody('');
    setApiConfig((prev) => ({
      ...prev,
      decisionKey: '',
    }));
    setDmnData({
      fileName: '',
      content: '',
      decisionKey: '',
      deployed: false,
      deploymentId: null,
      deployedAt: null,
      apiEndpoint: '',
      lastTestResult: null,
      lastTestTimestamp: null,
    });
    setConcepts([]);
  };

  const formatJSON = (obj) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex items-start">
          <FileText className="text-blue-600 mt-0.5 mr-3" size={20} />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">DMN Decision Engine Integration</h3>
            <p className="text-sm text-gray-600 mt-1">
              Upload DMN files, deploy to Operaton, and test decision evaluations. Successful tests
              will be saved as metadata in your TTL file.
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <a
                href="https://git.open-regels.nl/showcases/ttl-editor/-/blob/main/docs/DMN-INTEGRATION-DOCUMENTATION-v1.5.1.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                DMN Integration Documentation - Version 1.5.1
              </a>{' '}
              reflects the current implementation
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Settings size={20} className="text-gray-600 mr-2" />
          <h4 className="text-md font-semibold text-gray-800">API Configuration</h4>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Operaton Base URL
            </label>
            <input
              type="text"
              value={apiConfig.baseUrl}
              onChange={(e) =>
                setApiConfig({
                  ...apiConfig,
                  baseUrl: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://operaton-doc.open-regels.nl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decision Key
              <span className="text-gray-500 font-normal ml-1">(auto-filled from DMN file)</span>
            </label>
            <input
              type="text"
              value={apiConfig.decisionKey}
              onChange={(e) =>
                setApiConfig({
                  ...apiConfig,
                  decisionKey: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="RONL_BerekenLeeftijden"
            />
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Upload size={20} className="text-gray-600 mr-2" />
            <h4 className="text-md font-semibold text-gray-800">Upload DMN File</h4>
          </div>
          <div className="flex items-center gap-2">
            {/* RESTORED: Load Example in header */}
            <button
              onClick={loadExampleDMN}
              disabled={isLoading}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
            >
              <FileText size={16} />
              Load Example
            </button>
            {uploadedFile && (
              <button
                onClick={handleClearFile}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 border border-red-200"
              >
                <Trash2 size={14} />
                Clear File
              </button>
            )}
          </div>
        </div>

        {!uploadedFile ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <Upload className="mx-auto text-gray-400 mb-3" size={40} />
            <label className="cursor-pointer">
              <span className="text-blue-600 hover:text-blue-700 font-medium">Choose a file</span>
              <input type="file" accept=".dmn" onChange={handleFileUpload} className="hidden" />
            </label>
            <p className="text-gray-500 text-sm mt-2">or drag and drop</p>
            <p className="text-gray-400 text-xs mt-1">DMN, XML files supported</p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <CheckCircle className="text-green-600 mt-1" size={20} />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {(uploadedFile.size / 1024).toFixed(2)} KB • Uploaded{' '}
                    {new Date(uploadedFile.uploadDate).toLocaleString()}
                  </p>
                  {apiConfig.decisionKey && (
                    <p className="text-sm text-gray-600 mt-1">
                      Decision Key:{' '}
                      <code className="bg-white px-2 py-0.5 rounded text-xs">
                        {apiConfig.decisionKey}
                      </code>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Deployment Button */}
            <div className="mt-4 pt-4 border-t border-green-200">
              <button
                onClick={handleDeployDMN}
                disabled={isLoading || deploymentStatus?.success}
                className={`w-full px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 ${
                  deploymentStatus?.success
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Deploying...
                  </>
                ) : deploymentStatus?.success ? (
                  <>
                    <CheckCircle size={16} />
                    Deployed Successfully
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Deploy to Operaton
                  </>
                )}
              </button>
            </div>

            {/* Deployment Status */}
            {deploymentStatus && (
              <div
                className={`mt-3 p-3 rounded-md ${
                  deploymentStatus.success
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                <p className="text-sm font-medium">{deploymentStatus.message}</p>
                {deploymentStatus.deploymentId && (
                  <p className="text-xs mt-1">Deployment ID: {deploymentStatus.deploymentId}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test Section (Postman-like) */}
      {uploadedFile && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Code size={20} className="text-gray-600 mr-2" />
            <h4 className="text-md font-semibold text-gray-800">Test Decision Evaluation</h4>
          </div>

          {/* Request Body */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Request Body (JSON)
            </label>
            {uploadedFile && testBody && (
              <p className="text-xs text-gray-500 mb-2">
                💡 Request body auto-generated from DMN input variables. Adjust values as needed.
              </p>
            )}
            <textarea
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter JSON request body or upload a DMN file to auto-generate"
            />
          </div>

          {/* Test Button */}
          <button
            onClick={handleEvaluateDMN}
            disabled={isLoading || !deploymentStatus?.success}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Evaluating...
              </>
            ) : (
              <>
                <Play size={16} />
                Evaluate Decision
              </>
            )}
          </button>

          {!deploymentStatus?.success && (
            <p className="text-sm text-amber-600 mt-2">
              ⚠️ Please deploy the DMN file first before testing
            </p>
          )}

          {/* Response */}
          {testResponse && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Response</label>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    testResponse.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {testResponse.success ? '200 OK' : 'ERROR'}
                </span>
              </div>
              <div className="bg-gray-50 border border-gray-300 rounded-md p-4 font-mono text-sm overflow-x-auto">
                <pre className="whitespace-pre-wrap">
                  {testResponse.success ? formatJSON(testResponse.data) : testResponse.error}
                </pre>
              </div>
              {testResponse.success && (
                <p className="text-xs text-gray-500 mt-2">
                  Tested at: {new Date(testResponse.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Metadata Info */}
      {dmnData?.deployed && testResponse?.success && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-blue-600 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-blue-800">Ready to Save</p>
              <p className="text-sm text-blue-700 mt-1">
                DMN metadata and test results will be included in your TTL export. Use the Download
                button to save your complete service description.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DMNTab;
