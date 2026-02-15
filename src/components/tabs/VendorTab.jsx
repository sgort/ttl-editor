import React, { useEffect, useState } from 'react';

import { fetchAllRonlConcepts } from '../../utils/ronlHelper';
import IKnowMappingTab from './IKnowMappingTab';

/**
 * VendorTab - Main vendor integration interface
 * Provides vendor selection and vendor-specific service metadata
 */
const VendorTab = ({
  mappingConfig,
  setMappingConfig,
  availableMappings,
  onImportComplete,
  vendorService = {
    contact: {
      organizationName: '',
      contactPerson: '',
      email: '',
      phone: '',
      website: '',
      logo: '',
    },
    serviceNotes: '',
    technical: {
      serviceUrl: '',
      license: '',
      accessType: 'fair-use',
    },
    certification: {
      status: 'not-certified',
      certifiedBy: '',
      certifiedAt: '',
      certificationNote: '',
    },
  },
  setVendorService,
  service = {},
  organization = {},
}) => {
  const [selectedVendor, setSelectedVendor] = useState('');
  const [vendorConcepts, setVendorConcepts] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorsError, setVendorsError] = useState('');
  // Add modal state
  const [showCertificationModal, setShowCertificationModal] = useState(false);

  // RONL endpoint
  const RONL_ENDPOINT =
    'https://api.open-regels.triply.cc/datasets/stevengort/ronl/services/ronl/sparql';

  // Helper to update vendor service fields
  const updateVendorField = (section, field, value) => {
    setVendorService({
      ...vendorService,
      [section]: {
        ...vendorService[section],
        [field]: value,
      },
    });
  };

  // Auto-populate certification fields from Service and Organization tabs
  useEffect(() => {
    // Only auto-populate if status is not-certified AND certifiedBy is empty
    if (
      vendorService.certification.status === 'not-certified' &&
      !vendorService.certification.certifiedBy &&
      organization.identifier
    ) {
      const orgUri = organization.identifier.startsWith('http')
        ? organization.identifier
        : `https://regels.overheid.nl/organizations/${organization.identifier}`;

      setVendorService({
        ...vendorService,
        certification: {
          ...vendorService.certification,
          certifiedBy: orgUri,
        },
      });
    }
  }, [organization.identifier, setVendorService, vendorService]); // Only trigger when organization changes

  // Handle Request for Certification - Show modal instead of direct email
  const handleRequestCertification = () => {
    setShowCertificationModal(true);
  };

  // Handle vendor logo upload
  const handleVendorLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateVendorField('contact', 'logo', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fetch vendor concepts on component mount
  useEffect(() => {
    const loadVendors = async () => {
      setLoadingVendors(true);
      setVendorsError('');

      try {
        const { methodConcepts } = await fetchAllRonlConcepts(RONL_ENDPOINT);
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
        <div className="space-y-6">
          {/* iKnow: Show integration tools */}
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

              <IKnowMappingTab
                mappingConfig={mappingConfig}
                setMappingConfig={setMappingConfig}
                availableMappings={availableMappings}
                onImportComplete={onImportComplete}
              />
            </div>
          )}

          {/* Blueriq: Show service metadata form */}
          {selectedVendor === 'https://regels.overheid.nl/termen/Blueriq' && (
            <div className="space-y-6">
              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  Blueriq Service Configuration
                </h3>
                <p className="text-sm text-blue-800">
                  Configure the Blueriq vendor service metadata. This information will be published
                  alongside the reference DMN to help citizens and organizations choose validated
                  vendor implementations.
                </p>
              </div>

              {/* Two-column layout: Contact Info + Technical Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Contact Information */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">📇</span>
                    <h3 className="font-medium text-gray-900">Vendor Contact Information</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={vendorService.contact.organizationName || ''}
                        onChange={(e) =>
                          updateVendorField('contact', 'organizationName', e.target.value)
                        }
                        placeholder="e.g., Blueriq BV"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        value={vendorService.contact.contactPerson || ''}
                        onChange={(e) =>
                          updateVendorField('contact', 'contactPerson', e.target.value)
                        }
                        placeholder="e.g., Jan de Vries"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={vendorService.contact.email || ''}
                        onChange={(e) => updateVendorField('contact', 'email', e.target.value)}
                        placeholder="contact@blueriq.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={vendorService.contact.phone || ''}
                        onChange={(e) => updateVendorField('contact', 'phone', e.target.value)}
                        placeholder="+31 20 123 4567"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        value={vendorService.contact.website || ''}
                        onChange={(e) => updateVendorField('contact', 'website', e.target.value)}
                        placeholder="https://www.blueriq.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Technical Information */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🔧</span>
                    <h3 className="font-medium text-gray-900">Technical Information</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Service URL
                      </label>
                      <input
                        type="url"
                        value={vendorService.technical.serviceUrl || ''}
                        onChange={(e) =>
                          updateVendorField('technical', 'serviceUrl', e.target.value)
                        }
                        placeholder="https://api.blueriq.com/aow-leeftijd"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        API endpoint for the vendor service
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        License
                      </label>
                      <input
                        type="text"
                        value={vendorService.technical.license || ''}
                        onChange={(e) => updateVendorField('technical', 'license', e.target.value)}
                        placeholder="e.g., Commercial, MIT, Apache 2.0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Access Type
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="accessType"
                            value="fair-use"
                            checked={vendorService.technical.accessType === 'fair-use'}
                            onChange={(e) =>
                              updateVendorField('technical', 'accessType', e.target.value)
                            }
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            Fair Use (publicly accessible)
                          </span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="accessType"
                            value="iam-required"
                            checked={vendorService.technical.accessType === 'iam-required'}
                            onChange={(e) =>
                              updateVendorField('technical', 'accessType', e.target.value)
                            }
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            IAM Required (authentication needed)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Notes + Logo Grid (70/30 split) */}
              <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
                {/* Left: Service Notes (70% - 7 columns) */}
                <div className="md:col-span-7 bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">📝</span>
                    <h3 className="font-medium text-gray-900">Service Notes</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes about vendor-specific implementation
                    </label>
                    <textarea
                      value={vendorService.serviceNotes || ''}
                      onChange={(e) =>
                        setVendorService({ ...vendorService, serviceNotes: e.target.value })
                      }
                      placeholder="e.g., This vendor implementation includes additional validation for edge cases not covered in the reference DMN..."
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Describe vendor-specific features, limitations, or implementation details
                    </p>
                  </div>
                </div>

                {/* Right: Vendor Logo (30% - 3 columns) */}
                <div className="md:col-span-3 bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🖼️</span>
                    <h3 className="font-medium text-gray-900">Vendor Logo</h3>
                  </div>

                  <div className="space-y-3">
                    {/* Logo Preview */}
                    {vendorService.contact.logo && (
                      <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                        <img
                          src={vendorService.contact.logo}
                          alt="Vendor logo"
                          className="w-full h-auto max-h-40 object-contain"
                        />
                      </div>
                    )}

                    {/* Upload Button */}
                    <div>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleVendorLogoUpload}
                          className="hidden"
                          id="vendor-logo-upload"
                        />
                        <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
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
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {vendorService.contact.logo ? 'Change Logo' : 'Upload Logo'}
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG (max 2MB)</p>
                    </div>

                    {/* Remove Logo Button */}
                    {vendorService.contact.logo && (
                      <button
                        type="button"
                        onClick={() => updateVendorField('contact', 'logo', '')}
                        className="w-full px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Full-width: Certification Section */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">✅</span>
                  <h3 className="font-medium text-gray-900">
                    Conformance Assessment and Approved Provider Registry
                  </h3>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800">
                    <strong>Auto-populated from Service and Organization tabs:</strong> The
                    competent authority validates that the vendor's commercial implementation
                    correctly implements the service.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Read-only auto-populated fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Service Name (auto-populated)
                      </label>
                      <input
                        type="text"
                        value={service.name || 'Not set in Service tab'}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Certifying Organization (auto-populated)
                      </label>
                      <input
                        type="text"
                        value={
                          organization.name ||
                          organization.identifier ||
                          'Not set in Organization tab'
                        }
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                      />
                    </div>
                  </div>

                  {/* Certification Status with Action Button */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certification Status
                    </label>
                    <div className="flex items-center gap-4">
                      {/* Status Display (Left side) */}
                      <div className="flex-1">
                        <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 font-medium">
                          {vendorService.certification.status === 'not-certified' &&
                            '⏸️ Not Validated'}
                          {vendorService.certification.status === 'in-review' && '⏱ In Review'}
                          {vendorService.certification.status === 'certified' && '✅ Certified'}
                        </div>
                      </div>

                      {/* Request Certification Button (Right side - only shown if not-validated) */}
                      {vendorService.certification.status === 'not-certified' && (
                        <button
                          type="button"
                          onClick={handleRequestCertification}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <svg
                            className="w-5 h-5"
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
                          Request Certification
                        </button>
                      )}
                    </div>

                    {/* Help text below */}
                    <p className="text-xs text-gray-500 mt-2">
                      {vendorService.certification.status === 'not-certified' &&
                        'Click "Request Certification" to submit this vendor implementation for validation'}
                      {vendorService.certification.status === 'in-review' &&
                        'This vendor implementation is currently under review by the certifying authority'}
                      {vendorService.certification.status === 'certified' &&
                        'This vendor implementation has been officially certified'}
                    </p>
                  </div>

                  {/* Show additional fields only if in-review or certified */}
                  {vendorService.certification.status !== 'not-certified' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Certification Date
                        </label>
                        <input
                          type="date"
                          value={vendorService.certification.certifiedAt || ''}
                          onChange={(e) =>
                            updateVendorField('certification', 'certifiedAt', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Certification Note
                        </label>
                        <textarea
                          value={vendorService.certification.certificationNote || ''}
                          onChange={(e) =>
                            updateVendorField('certification', 'certificationNote', e.target.value)
                          }
                          placeholder="e.g., Certified implementation validated against reference DMN test suite (127 test cases passed)"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Default for Other Vendors */}
          {selectedVendor !== 'https://regels.overheid.nl/termen/iKnow' &&
            selectedVendor !== 'https://regels.overheid.nl/termen/Blueriq' && (
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
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">
                    Implementation Status
                  </h4>
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
            Please select a vendor from the dropdown above to configure service metadata
          </p>
        </div>
      )}

      {/* Certification Request Modal */}
      {showCertificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Request Conformance Assessment
                  </h2>
                </div>
                <button
                  onClick={() => setShowCertificationModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 space-y-6">
              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg
                    className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
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
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">
                      Conformance Assessment Process
                    </h3>
                    <p className="text-sm text-blue-800">
                      The formal conformance assessment and certification workflow is currently
                      being established. This will enable competent authorities to validate vendor
                      implementations against reference DMN models.
                    </p>
                  </div>
                </div>
              </div>

              {/* What is Conformance Assessment */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  What is Conformance Assessment?
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  Conformance assessment is the process by which a competent authority (such as SVB)
                  validates that a vendor's commercial implementation correctly implements the
                  reference DMN model and complies with applicable legislation.
                </p>
                <ul className="text-sm text-gray-700 space-y-2 ml-6">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>Validates technical correctness of decision logic</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>Ensures compliance with legislative requirements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>Confirms test coverage against reference test suite</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>Enables listing in Approved Provider Registry</span>
                  </li>
                </ul>
              </div>

              {/* Current Status */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">🚧</span>
                  Current Implementation Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Metadata Structure</p>
                      <p className="text-xs text-gray-600">
                        RONL ontology supports certification metadata
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Publication System</p>
                      <p className="text-xs text-gray-600">
                        Vendor services can be published to regels.overheid.nl
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold">○</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Assessment Workflow</p>
                      <p className="text-xs text-gray-600">
                        Formal review and approval process in development
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold">○</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Provider Registry</p>
                      <p className="text-xs text-gray-600">
                        Public listing of certified vendor implementations
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  What Happens Next?
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-gray-700">
                    <strong>For now:</strong> You can prepare your vendor service metadata in this
                    editor and publish it to TriplyDB with status "Not Certified". This documents
                    your implementation and makes it discoverable.
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Future:</strong> Once the formal assessment workflow is established,
                    you'll be able to submit your implementation for review. The competent authority
                    will evaluate your service and update the certification status upon approval.
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Stay updated:</strong> Check the{' '}
                    <a
                      href="https://regels.overheid.nl"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      regels.overheid.nl
                    </a>{' '}
                    portal for announcements about the certification program launch.
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">📧</span>
                  Questions or Early Access?
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  If you have questions about the conformance assessment process or want to
                  participate in the pilot program, please contact:
                </p>
                <div className="bg-gray-100 rounded px-4 py-3 text-sm">
                  <p className="font-medium text-gray-900">RONL Conformance Team</p>
                  <p className="text-gray-700">
                    Email:{' '}
                    <a
                      href="mailto:conformance@regels.overheid.nl"
                      className="text-blue-600 hover:underline"
                    >
                      conformance@regels.overheid.nl
                    </a>
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowCertificationModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>

                <a
                  href="mailto:conformance@regels.overheid.nl?subject=Conformance Assessment Inquiry&body=I would like to learn more about the conformance assessment process for vendor implementations."
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                  onClick={() => setShowCertificationModal(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Contact Conformance Team
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorTab;
