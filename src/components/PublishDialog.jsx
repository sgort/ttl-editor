// src/components/PublishDialog.jsx
// Merged version: Beautiful UX from original + Working progress tracking logic
import { AlertCircle, CheckCircle, Cloud, Eye, EyeOff, Loader, Upload, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const PublishDialog = ({
  isOpen,
  onClose,
  onPublish,
  currentConfig,
  publishingState, // ← Progress tracking support
}) => {
  // Initialize with default empty config if currentConfig is undefined
  const defaultConfig = {
    baseUrl: 'https://api.open-regels.triply.cc',
    account: '',
    dataset: '',
    apiToken: '',
  };

  const [config, setConfig] = useState(currentConfig || defaultConfig);
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Update local config when currentConfig changes
  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    }
  }, [currentConfig]);

  // Reset test result when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const updateField = (field, value) => {
    setConfig({ ...config, [field]: value });
    setTestResult(null); // Clear test result when config changes
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
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
    // Validate config before publishing
    if (!config.account || !config.dataset || !config.apiToken) {
      alert('Please fill in all required fields (Account, Dataset, API Token)');
      return;
    }
    onPublish(config);
  };

  const isConfigValid = config.baseUrl && config.account && config.dataset && config.apiToken;
  const isPublishing = publishingState?.isPublishing;

  // Get step color based on status
  const getStepColor = () => {
    if (!publishingState) return 'text-gray-600';
    switch (publishingState.stepStatus) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-orange-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Get icon for current step
  const getStepIcon = () => {
    if (!publishingState) return null;
    switch (publishingState.stepStatus) {
      case 'loading':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
        );
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

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
          {/* Progress Display - Show when publishing */}
          {publishingState && publishingState.isPublishing && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className={`flex items-center gap-3 font-medium mb-3 ${getStepColor()}`}>
                {getStepIcon()}
                <span>{publishingState.currentStep}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${publishingState.progress}%` }}
                />
              </div>

              {/* Step Indicators */}
              <div className="text-xs text-gray-600 space-y-1">
                <div
                  className={
                    publishingState.currentStep.includes('Validating')
                      ? 'font-bold text-blue-600'
                      : ''
                  }
                >
                  {publishingState.progress >= 10 ? '✓' : '○'} Validating form
                </div>
                <div
                  className={
                    publishingState.currentStep.includes('Generating')
                      ? 'font-bold text-blue-600'
                      : ''
                  }
                >
                  {publishingState.progress >= 30 ? '✓' : '○'} Generating TTL
                </div>
                <div
                  className={
                    publishingState.currentStep.includes('Uploading')
                      ? 'font-bold text-blue-600'
                      : ''
                  }
                >
                  {publishingState.progress >= 50 ? '✓' : '○'} Uploading to TriplyDB
                </div>
                <div
                  className={
                    publishingState.currentStep.includes('Updating service')
                      ? 'font-bold text-blue-600'
                      : ''
                  }
                >
                  {publishingState.progress >= 85 ? '✓' : '○'} Updating service
                </div>
              </div>

              {/* Error Display During Progress */}
              {publishingState.error && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {publishingState.error}
                </div>
              )}
            </div>
          )}

          {/* Success Display */}
          {publishingState &&
            publishingState.stepStatus === 'success' &&
            !publishingState.isPublishing && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      {publishingState.currentStep}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Dialog will close automatically...</p>
                  </div>
                </div>
              </div>
            )}

          {/* Warning Display */}
          {publishingState &&
            publishingState.stepStatus === 'warning' &&
            !publishingState.isPublishing && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">
                      {publishingState.currentStep}
                    </p>
                    {publishingState.error && (
                      <p className="text-xs text-orange-700 mt-1">{publishingState.error}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Dialog will close automatically...</p>
                  </div>
                </div>
              </div>
            )}

          {/* Error Display */}
          {publishingState &&
            publishingState.stepStatus === 'error' &&
            !publishingState.isPublishing && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      {publishingState.currentStep}
                    </p>
                    {publishingState.error && (
                      <p className="text-xs text-red-700 mt-1">{publishingState.error}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Dialog will close automatically...</p>
                  </div>
                </div>
              </div>
            )}

          {/* Configuration Form - Only show when not publishing or after completion */}
          {(!publishingState || !publishingState.isPublishing) && (
            <>
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
                  disabled={isPublishing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  The base URL of your TriplyDB instance API
                </p>
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
                  disabled={isPublishing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your TriplyDB account or organization name
                </p>
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
                  placeholder="PublishTest"
                  disabled={isPublishing}
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
                    disabled={isPublishing}
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
                  disabled={!isConfigValid || testing || isPublishing}
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            disabled={isPublishing}
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={!isConfigValid || isPublishing}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-4 h-4" />
            {isPublishing ? 'Publishing...' : 'Publish to TriplyDB'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishDialog;
