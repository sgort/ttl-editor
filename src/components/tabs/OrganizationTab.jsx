import { BookOpen, CheckCircle, Upload, X } from 'lucide-react';
import React, { useState } from 'react';

/**
 * OrganizationTab - Form for editing organization/competent authority metadata
 * Maps to cv:PublicOrganisation in CPSV-AP 3.2.0
 */
export default function OrganizationTab({ organization, setOrganization, dmnData, setDmnData }) {
  // State for collapsible validation section
  const [showValidationSection, setShowValidationSection] = useState(false);

  // Helper to update organization fields
  const updateField = (field, value) => {
    setOrganization({ ...organization, [field]: value });
  };

  // Helper to update DMN validation fields
  const updateDmnField = (field, value) => {
    setDmnData({ ...dmnData, [field]: value });
  };

  // Auto-fill validated by with current organization URI
  const autoFillValidatedBy = () => {
    const orgUri = organization.identifier?.startsWith('http')
      ? organization.identifier
      : `https://regels.overheid.nl/organizations/${organization.identifier}`;
    updateDmnField('validatedBy', orgUri);
  };

  // Check if identifier looks like a full URI
  const isFullUri =
    organization.identifier?.startsWith('http://') ||
    organization.identifier?.startsWith('https://');

  // Determine validation metadata availability
  const hasDMN = dmnData.fileName && dmnData.deployed && dmnData.lastTestResult;
  const isImported = dmnData.isImported;
  const hasValidationMetadata =
    dmnData.validationStatus && dmnData.validationStatus !== 'not-validated';

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      alert('Please select a JPG or PNG image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      // Read file
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Set target size
          const targetSize = 256;
          canvas.width = targetSize;
          canvas.height = targetSize;

          // Calculate dimensions to maintain aspect ratio
          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = img.width;
          let sourceHeight = img.height;

          if (img.width > img.height) {
            sourceX = (img.width - img.height) / 2;
            sourceWidth = img.height;
          } else if (img.height > img.width) {
            sourceY = (img.height - img.width) / 2;
            sourceHeight = img.width;
          }

          // Draw resized image
          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            targetSize,
            targetSize
          );

          // Convert to base64 data URL (PNG format)
          const resizedDataUrl = canvas.toDataURL('image/png', 0.9);

          // Update organization state
          updateField('logo', resizedDataUrl);
        };

        img.onerror = () => {
          alert('Error loading image. Please try another file.');
        };

        img.src = e.target.result;
      };

      reader.onerror = () => {
        alert('Error reading file. Please try again.');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Logo upload error:', error);
      alert('Error uploading logo. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Info box about URI handling */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <p className="text-blue-800">
          <strong>Tip:</strong> You can enter either a short identifier (e.g., "svb") or a full URI
          (e.g., "https://organisaties.overheid.nl/28212263/Sociale_Verzekeringsbank"). Full URIs
          will be used as-is in the TTL output.
        </p>
      </div>

      {/* Organization Identifier */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Organization URI or identifier</span>
          <span className="text-gray-500"> (cv:PublicOrganization)</span>
        </label>
        <input
          type="text"
          value={organization.identifier}
          onChange={(e) => updateField('identifier', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., svb or https://organisaties.overheid.nl/28212263/..."
        />
        {isFullUri && (
          <p className="text-xs text-green-600 mt-1">✓ Full URI detected - will be used directly</p>
        )}
        {organization.identifier && !isFullUri && (
          <p className="text-xs text-gray-500 mt-1">
            Will generate: https://regels.overheid.nl/organizations/{organization.identifier}
          </p>
        )}
      </div>

      {/* Organization Name - MANDATORY */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Preferred name of the organization</span>
          <span className="text-gray-500"> (skos:prefLabel)</span>
          <span className="text-red-500"> *</span>
        </label>
        <input
          type="text"
          value={organization.name}
          onChange={(e) => updateField('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., Sociale Verzekeringsbank"
        />
      </div>

      {/* Homepage URL */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Homepage URL of the organization</span>
          <span className="text-gray-500"> (foaf:homepage)</span>
        </label>
        <input
          type="url"
          value={organization.homepage}
          onChange={(e) => updateField('homepage', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., https://www.svb.nl"
        />
      </div>

      {/* DMN Validation Metadata Section - Conditional */}
      <div className="border-t border-gray-200 pt-4">
        {/* State 1: No DMN at all - Empty State */}
        {!hasDMN && !isImported && (
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-2xl">🔒</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">DMN Validation Metadata</h3>
                <p className="text-sm text-gray-700 mb-4">
                  DMN validation metadata requires a decision model to be uploaded, deployed, and
                  evaluated.
                </p>
              </div>
            </div>

            {/* Workflow Instructions */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-900 mb-3">
                To enable validation metadata:
              </p>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <span>
                    Go to the <strong>DMN</strong> tab
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <span>Upload a DMN file (.dmn) or load an example</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <span>Deploy to Operaton</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    4
                  </span>
                  <span>Run a test (so the DMN is verified)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <span>Validation metadata will become available here</span>
                </li>
              </ol>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => {
                const dmnTab = document.querySelector('[data-tab-id="dmn"]');
                if (dmnTab) dmnTab.click();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BookOpen size={18} />
              Go to DMN tab
            </button>
          </div>
        )}

        {/* State 2: Imported DMN WITH validation metadata - Read-Only */}
        {isImported && hasValidationMetadata && (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔒</div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">
                  DMN Validation Metadata (imported)
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  DMN data was imported from a TTL file and is preserved but cannot be edited.
                  Validation metadata is included in the imported DMN blocks.
                </p>

                {/* Show current validation status for reference */}
                <div className="bg-white rounded-lg p-4 mb-3 border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Current Validation Status:
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="text-gray-600 min-w-[100px]">Status:</span>
                      <span className="font-medium text-gray-900">
                        {dmnData.validationStatus === 'validated' && '✅ Validated'}
                        {dmnData.validationStatus === 'in-review' && '🔄 In Review'}
                        {dmnData.validationStatus === 'not-validated' && '⭕ Not Validated'}
                      </span>
                    </div>
                    {dmnData.validatedBy && (
                      <div className="flex gap-2">
                        <span className="text-gray-600 min-w-[100px]">Validated by:</span>
                        <span className="text-gray-900 break-all">{dmnData.validatedBy}</span>
                      </div>
                    )}
                    {dmnData.validatedAt && (
                      <div className="flex gap-2">
                        <span className="text-gray-600 min-w-[100px]">Validated at:</span>
                        <span className="text-gray-900">{dmnData.validatedAt}</span>
                      </div>
                    )}
                    {dmnData.validationNote && (
                      <div className="flex gap-2">
                        <span className="text-gray-600 min-w-[100px]">Note:</span>
                        <span className="text-gray-900">{dmnData.validationNote}</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-blue-800 mb-2">
                  To modify validation metadata for an imported DMN:
                </p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Go to DMN tab and clear imported data</li>
                  <li>Upload and deploy a new DMN</li>
                  <li>Return here to add validation metadata</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* State 3: Imported DMN WITHOUT validation - Info notice */}
        {isImported && !hasValidationMetadata && (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-6">
            <div className="flex items-start gap-2">
              <span className="text-gray-600">ℹ️</span>
              <div>
                <p className="text-sm text-gray-700">
                  <strong>DMN data imported</strong> without validation metadata.
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  To add validation metadata, clear the imported DMN and upload a new one.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* State 4: Fresh DMN uploaded - Editable Fields */}
        {hasDMN && !isImported && (
          <div>
            {/* Collapsible Header */}
            <button
              type="button"
              onClick={() => setShowValidationSection(!showValidationSection)}
              className="flex items-center justify-between w-full text-left hover:bg-gray-50 p-2 rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">DMN Validation Metadata</span>
                <span className="text-xs text-gray-500">(optional)</span>
              </div>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  showValidationSection ? 'transform rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Collapsible Content */}
            {showValidationSection && (
              <div className="mt-4 space-y-4 pl-4 border-l-2 border-blue-200">
                {/* DMN Context Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">ℹ️</span>
                    <div>
                      <p className="text-blue-800">
                        <strong>Validation for:</strong> {dmnData.fileName}
                      </p>
                      <p className="text-blue-700 text-xs mt-1">
                        Deployed: {new Date(dmnData.deployedAt).toLocaleDateString()} | Tested:{' '}
                        {new Date(dmnData.lastTestTimestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="text-blue-800">
                    <strong>About validation metadata:</strong> These fields describe the quality
                    assurance status of your organization's reference decision models. The
                    validating organization is typically your own.
                  </p>
                </div>

                {/* Validation Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Validation Status
                    <span className="text-gray-500 font-normal"> (ronl:validationStatus)</span>
                  </label>
                  <select
                    value={dmnData.validationStatus}
                    onChange={(e) => updateDmnField('validationStatus', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="not-validated">Not Validated</option>
                    <option value="in-review">In Review</option>
                    <option value="validated">Validated</option>
                  </select>
                </div>

                {/* Validated By URI */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Validated By Organization URI
                    <span className="text-gray-500 font-normal"> (ronl:validatedBy)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={dmnData.validatedBy}
                      onChange={(e) => updateDmnField('validatedBy', e.target.value)}
                      placeholder="https://organisaties.overheid.nl/28212263/..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={autoFillValidatedBy}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm whitespace-nowrap"
                      title="Use current organization"
                    >
                      📋 Use This Org
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Full URI of the validating organization
                  </p>
                </div>

                {/* Validation Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Validation Date
                    <span className="text-gray-500 font-normal"> (ronl:validatedAt)</span>
                  </label>
                  <input
                    type="date"
                    value={dmnData.validatedAt}
                    onChange={(e) => updateDmnField('validatedAt', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                {/* Validation Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Validation Note
                    <span className="text-gray-500 font-normal"> (ronl:validationNote)</span>
                  </label>
                  <textarea
                    value={dmnData.validationNote}
                    onChange={(e) => updateDmnField('validationNote', e.target.value)}
                    placeholder="e.g., Validated against AOW legislation Article 7a. Test suite: 127 cases passed."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Geographic Jurisdiction - MANDATORY */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Geographic Jurisdiction</span>
          <span className="text-gray-500"> (cv:spatial)</span>
          <span className="text-red-500"> *</span>
        </label>
        <select
          value={organization.spatial}
          onChange={(e) => updateField('spatial', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select country...</option>
          <option value="https://publications.europa.eu/resource/authority/country/NLD">
            Netherlands (NL)
          </option>
          <option value="https://publications.europa.eu/resource/authority/country/BEL">
            Belgium (BE)
          </option>
          <option value="https://publications.europa.eu/resource/authority/country/DEU">
            Germany (DE)
          </option>
          <option value="https://publications.europa.eu/resource/authority/country/FRA">
            France (FR)
          </option>
          <option value="https://publications.europa.eu/resource/authority/country/LUX">
            Luxembourg (LU)
          </option>
        </select>
        <p className="text-xs text-green-600 mt-1">
          Geographic area where this organization has jurisdiction
        </p>
      </div>

      {/* Logo Upload - OPTIONAL */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Organization Logo</span>
          <span className="text-gray-500"> (foaf:logo)</span>
        </label>

        <div className="space-y-3">
          {/* Logo Import Notice - Show when logo reference imported (not a data URL) */}
          {organization.logo && !organization.logo.startsWith('data:') && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-blue-800">Logo Reference Imported</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>A logo reference was imported from the TTL file:</p>
                    <code className="block mt-1 bg-blue-100 px-2 py-1 rounded text-xs break-all">
                      {organization.logo}
                    </code>
                    <p className="mt-2">
                      This reference is preserved in the TTL output. To display and edit the logo in
                      the editor, upload a new logo file below.
                    </p>
                  </div>
                  <div className="mt-3 flex gap-3">
                    <label className="cursor-pointer text-sm font-medium text-blue-700 hover:text-blue-600 flex items-center gap-1">
                      <Upload size={14} />
                      Upload new logo
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => updateField('logo', '')}
                      className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <X size={14} />
                      Clear reference
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Button - Show when no logo at all */}
          {!organization.logo && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <label className="cursor-pointer">
                <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm text-gray-600 mb-1">
                  <span className="text-blue-600 font-medium">Click to upload</span> or drag and
                  drop
                </p>
                <p className="text-xs text-gray-500">
                  PNG or JPG (max 5MB, will be resized to 256x256px)
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Logo Preview - Show when logo is a data URL (actually uploaded) */}
          {organization.logo && organization.logo.startsWith('data:') && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <img
                    src={organization.logo}
                    alt="Organization logo"
                    className="w-32 h-32 object-contain border border-gray-200 rounded bg-white"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <p className="font-medium text-gray-800">Logo uploaded</p>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">256x256px • Base64 encoded</p>
                  <button
                    onClick={() => updateField('logo', '')}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <X size={16} />
                    Remove Logo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-2">
          The logo will be included in the TTL output and published to TriplyDB
        </p>
      </div>
    </div>
  );
}
