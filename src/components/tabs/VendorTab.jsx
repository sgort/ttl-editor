import React, { useEffect, useState } from 'react';

import { fetchAllRonlConcepts } from '../../utils/ronlHelper';
import IKnowMappingTab from './IKnowMappingTab';

/**
 * VendorTab - Main vendor integration interface
 * Provides vendor selection and vendor-specific content sections
 */
const VendorTab = ({ mappingConfig, setMappingConfig, availableMappings, onImportComplete }) => {
  const [selectedVendor, setSelectedVendor] = useState('');
  const [vendorConcepts, setVendorConcepts] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorsError, setVendorsError] = useState('');

  // RONL endpoint
  const RONL_ENDPOINT =
    'https://api.open-regels.triply.cc/datasets/stevengort/ronl/services/ronl/sparql';

  // Fetch vendor concepts on component mount
  useEffect(() => {
    const loadVendors = async () => {
      setLoadingVendors(true);
      setVendorsError('');

      try {
        const { methodConcepts } = await fetchAllRonlConcepts(RONL_ENDPOINT);

        // iKnow is now included in RONL vocabulary
        setVendorConcepts(methodConcepts);
        console.log('Loaded vendor concepts successfully:', methodConcepts.length);
      } catch (error) {
        console.error('Failed to load vendor concepts:', error);
        setVendorsError('Failed to load vendors from TriplyDB. Please check your connection.');
      } finally {
        setLoadingVendors(false);
      }
    };

    loadVendors();
  }, []);

  return (
    <div className="space-y-6">
      {/* Vendor Selection */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h3 className="text-xl font-bold">Select Vendor</h3>

        {/* Error message */}
        {vendorsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">⚠️ {vendorsError}</p>
          </div>
        )}

        {/* Loading state */}
        {loadingVendors && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Loading vendors from TriplyDB...</p>
          </div>
        )}

        {/* Vendor Dropdown */}
        <div className="max-w-2xl">
          <label className="block text-sm text-gray-700 mb-1">
            <span className="font-medium">Vendor</span>
            <span className="text-gray-500"> (ronl:MethodConcept)</span>
            <span className="text-red-500"> *</span>
          </label>
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            disabled={loadingVendors || vendorConcepts.length === 0}
          >
            <option value="">-- Select vendor --</option>
            {vendorConcepts.map((concept) => (
              <option key={concept.uri} value={concept.uri}>
                {concept.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Select the vendor platform you want to integrate with
          </p>
        </div>
      </div>

      {/* Vendor-Specific Content */}
      {selectedVendor && (
        <div>
          {/* iKnow Content */}
          {selectedVendor === 'https://regels.overheid.nl/termen/iKnow' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">iKnow Integration</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Configure field mappings and import data from iKnow XML exports
                        (CognitatieAnnotationExport or SemanticsExport format).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Render existing iKnow functionality */}
              <IKnowMappingTab
                mappingConfig={mappingConfig}
                setMappingConfig={setMappingConfig}
                availableMappings={availableMappings}
                onImportComplete={onImportComplete}
              />
            </div>
          )}

          {/* Default Content for Other Vendors */}
          {selectedVendor !== 'https://regels.overheid.nl/termen/iKnow' && (
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Integration Not Yet Available
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p className="mb-2">
                        The integration for{' '}
                        <strong>
                          {vendorConcepts.find((v) => v.uri === selectedVendor)?.label}
                        </strong>{' '}
                        is currently under development.
                      </p>
                      <p className="mb-3">Once implemented, this section will allow you to:</p>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>Configure field mappings specific to this vendor</li>
                        <li>Import data from their platform exports</li>
                        <li>Map vendor-specific data structures to CPSV-AP fields</li>
                        <li>Preview and import data into the editor</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Implementation Status */}
              <div className="border-t pt-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Implementation Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      ✓
                    </span>
                    <span className="text-gray-700">Vendor identification and selection</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-sm font-semibold">
                      ○
                    </span>
                    <span className="text-gray-500">Data format specification</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-sm font-semibold">
                      ○
                    </span>
                    <span className="text-gray-500">Field mapping configuration</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-sm font-semibold">
                      ○
                    </span>
                    <span className="text-gray-500">Import functionality</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Want to contribute?</h4>
                <p className="text-sm text-gray-600">
                  If you're interested in implementing integration for this vendor, please contact
                  the development team or submit a pull request to the repository.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Vendor Selected State */}
      {!selectedVendor && !loadingVendors && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-gray-400 mb-3">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Vendor Selected</h3>
          <p className="text-sm text-gray-500">
            Please select a vendor from the dropdown above to configure integration
          </p>
        </div>
      )}
    </div>
  );
};

export default VendorTab;
