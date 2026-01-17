// src/components/PublishDialog.jsx
// Complete version with progress tracking
// Works with App.js handlePublish that uses publishingState

import { AlertCircle, CheckCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const PublishDialog = ({
  isOpen,
  onClose,
  onPublish,
  currentConfig,
  publishingState, // ← CRITICAL: Must receive this prop
}) => {
  // Initialize with default empty config if currentConfig is undefined
  const defaultConfig = {
    baseUrl: 'https://api.open-regels.triply.cc',
    account: '',
    dataset: '',
    apiToken: '',
  };

  // Use currentConfig if available, otherwise use defaults
  const [config, setConfig] = useState(currentConfig || defaultConfig);

  // Update local config when currentConfig changes
  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    }
  }, [currentConfig]);

  if (!isOpen) return null;

  const handlePublish = () => {
    // Validate config before publishing
    if (!config.account || !config.dataset || !config.apiToken) {
      alert('Please fill in all required fields (Account, Dataset, API Token)');
      return;
    }

    // Call parent's publish handler
    onPublish(config);
  };

  // Determine if dialog should allow interaction
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Publish to TriplyDB</h2>

        {/* Progress Display */}
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
                  publishingState.currentStep.includes('Uploading') ? 'font-bold text-blue-600' : ''
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

            {/* Error Display */}
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
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="font-medium text-green-700">{publishingState.currentStep}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Dialog will close automatically...</p>
            </div>
          )}

        {/* Warning Display */}
        {publishingState &&
          publishingState.stepStatus === 'warning' &&
          !publishingState.isPublishing && (
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-700">{publishingState.currentStep}</p>
                  {publishingState.error && (
                    <p className="text-sm text-orange-600 mt-1">{publishingState.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Configuration Form - Only show when not publishing */}
        {(!publishingState || !publishingState.isPublishing) && (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Base URL</label>
                <input
                  type="text"
                  value={config.baseUrl || ''}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://api.open-regels.triply.cc"
                  disabled={isPublishing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Account <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={config.account || ''}
                  onChange={(e) => setConfig({ ...config, account: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your-account"
                  disabled={isPublishing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Dataset <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={config.dataset || ''}
                  onChange={(e) => setConfig({ ...config, dataset: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your-dataset"
                  disabled={isPublishing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  API Token <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={config.apiToken || ''}
                  onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your-api-token"
                  disabled={isPublishing}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                disabled={isPublishing}
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                disabled={isPublishing || !config.account || !config.dataset || !config.apiToken}
              >
                {isPublishing ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PublishDialog;
