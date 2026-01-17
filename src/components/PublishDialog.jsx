// components/PublishDialog.jsx
// Fixed version that handles undefined config

import React, { useEffect, useState } from 'react';

const PublishDialog = ({ isOpen, onClose, onPublish, currentConfig }) => {
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

  const handlePublish = async () => {
    // Validate config before publishing
    if (!config.account || !config.dataset || !config.apiToken) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await onPublish(config);
    } catch (error) {
      console.error('Publish error:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Publish to TriplyDB</h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Base URL</label>
            <input
              type="text"
              value={config.baseUrl || ''}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://api.open-regels.triply.cc"
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
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
            Cancel
          </button>
          <button
            onClick={handlePublish}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={!config.account || !config.dataset || !config.apiToken}
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishDialog;
