// PublishDialog.jsx - Dialog for configuring and publishing to TriplyDB
import { AlertCircle, CheckCircle, Cloud, Eye, EyeOff, Loader, Upload, X } from 'lucide-react';
import React, { useState } from 'react';

export default function PublishDialog({ isOpen, onClose, onPublish, currentConfig }) {
  const [config, setConfig] = useState(currentConfig);
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const updateField = (field, value) => {
    setConfig({ ...config, [field]: value });
    setTestResult(null); // Clear test result when config changes
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Import here to avoid circular dependencies
      const { testTriplyDBConnection } = await import('../utils/triplydbHelper');
      const result = await testTriplyDBConnection(config);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handlePublish = () => {
    onPublish(config);
  };

  const isConfigValid = config.baseUrl && config.account && config.dataset && config.apiToken;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Cloud className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Publish to TriplyDB</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Configure your TriplyDB connection settings below. Your API
              token will be stored locally in your browser.
            </p>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              TriplyDB Base URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => updateField('baseUrl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://api.open-regels.triply.cc"
            />
            <p className="text-xs text-gray-500 mt-1">The base URL of your TriplyDB instance API</p>
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.account}
              onChange={(e) => updateField('account', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="stevengort"
            />
            <p className="text-xs text-gray-500 mt-1">Your TriplyDB account or organization name</p>
          </div>

          {/* Dataset */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dataset Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.dataset}
              onChange={(e) => updateField('dataset', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="DMN-discovery"
            />
            <p className="text-xs text-gray-500 mt-1">The target dataset for publishing</p>
          </div>

          {/* API Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Token <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={config.apiToken}
                onChange={(e) => updateField('apiToken', e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your TriplyDB API token"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Create a token in TriplyDB: User Settings → API Tokens → Create Token
            </p>
          </div>

          {/* Test Connection */}
          <div>
            <button
              onClick={handleTestConnection}
              disabled={!isConfigValid || testing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Test Connection
                </>
              )}
            </button>

            {/* Test Result */}
            {testResult && (
              <div
                className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {testResult.success ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">{testResult.message}</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{testResult.error}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Security Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Security Reminder:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Never share your API token with others</li>
                  <li>Do not commit tokens to version control</li>
                  <li>Rotate tokens regularly for security</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={!isConfigValid}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-4 h-4" />
            Publish to TriplyDB
          </button>
        </div>
      </div>
    </div>
  );
}
