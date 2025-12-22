import {
  AlertCircle,
  CheckCircle,
  Code,
  // eslint-disable-next-line no-unused-vars
  Download,
  FileText,
  Play,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import React, { useState } from 'react';

const DMNTab = ({ dmnData, setDmnData }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [testBody, setTestBody] = useState(
    JSON.stringify(
      {
        variables: {
          geboortedatumAanvrager: { value: '1980-01-23', type: 'String' },
          dagVanAanvraag: { value: '2025-09-29', type: 'String' },
        },
      },
      null,
      2
    )
  );
  const [testResponse, setTestResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deploymentStatus, setDeploymentStatus] = useState(null);

  // Default Operaton configuration
  const [apiConfig, setApiConfig] = useState({
    baseUrl: 'https://operaton.open-regels.nl',
    decisionKey: 'RONL_BerekenLeeftijden',
    evaluateEndpoint: '/engine-rest/decision-definition/key/{key}/evaluate',
    deploymentEndpoint: '/engine-rest/deployment/create',
  });

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
      setUploadedFile({
        name: file.name,
        content: content,
        size: file.size,
        uploadDate: new Date().toISOString(),
      });

      // Extract decision key from DMN if possible
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, 'text/xml');
        const decisionElement = xmlDoc.querySelector('decision');
        if (decisionElement) {
          const decisionId = decisionElement.getAttribute('id');
          if (decisionId) {
            setApiConfig((prev) => ({
              ...prev,
              decisionKey: decisionId,
            }));
          }
        }
      } catch (err) {
        console.error('Error parsing DMN:', err);
      }

      // Update parent state
      setDmnData({
        ...dmnData,
        fileName: file.name,
        content: content,
        decisionKey: apiConfig.decisionKey,
      });
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

      // Update parent state with test results
      setDmnData({
        ...dmnData,
        lastTestResult: result,
        lastTestTimestamp: new Date().toISOString(),
      });
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
    setDmnData({});
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
          </div>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Settings size={20} className="text-gray-600 mr-2" />
          <h4 className="text-md font-semibold text-gray-800">API Configuration</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
            <input
              type="text"
              value={apiConfig.baseUrl}
              onChange={(e) => setApiConfig({ ...apiConfig, baseUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://operaton.open-regels.nl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Decision Key</label>
            <input
              type="text"
              value={apiConfig.decisionKey}
              onChange={(e) => setApiConfig({ ...apiConfig, decisionKey: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="RONL_BerekenLeeftijden"
            />
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          <span className="font-medium">Evaluation URL:</span>{' '}
          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
            {apiConfig.baseUrl}
            {apiConfig.evaluateEndpoint.replace('{key}', apiConfig.decisionKey)}
          </code>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Upload size={20} className="text-gray-600 mr-2" />
            <h4 className="text-md font-semibold text-gray-800">DMN File</h4>
          </div>
          {uploadedFile && (
            <button
              onClick={handleClearFile}
              className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm"
            >
              <Trash2 size={16} />
              Clear
            </button>
          )}
        </div>

        {!uploadedFile ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <Upload className="mx-auto text-gray-400 mb-3" size={48} />
            <label className="cursor-pointer">
              <span className="text-blue-600 hover:text-blue-700 font-medium">
                Choose a DMN file
              </span>
              <input
                type="file"
                accept=".dmn,.xml"
                onChange={handleFileUpload}
                className="hidden"
              />
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
            <textarea
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter JSON request body"
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
