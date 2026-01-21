import { CheckCircle, Image as ImageIcon, Upload, X } from 'lucide-react';
import { useState } from 'react';

/**
 * OrganizationTab - Form for editing organization/competent authority metadata
 * Maps to cv:PublicOrganisation in CPSV-AP 3.2.0
 */
export default function OrganizationTab({ organization, setOrganization }) {
  // Helper to update a single field
  const updateField = (field, value) => {
    setOrganization({ ...organization, [field]: value });
  };

  // Check if identifier looks like a full URI
  const isFullUri =
    organization.identifier?.startsWith('http://') ||
    organization.identifier?.startsWith('https://');

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

      {/* Organization Name - MANDATORY for CPSV-AP */}
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
          {/* Upload Button */}
          {!organization.logo && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <Upload className="mx-auto text-gray-400 mb-2" size={32} />
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">Upload Logo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
              <p className="text-gray-500 text-xs mt-2">JPG or PNG, will be resized to 256x256px</p>
            </div>
          )}

          {/* Logo Preview */}
          {organization.logo && (
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

        <p className="text-xs text-gray-500 mt-1">
          The logo will be included in the TTL output and published to TriplyDB
        </p>
      </div>
    </div>
  );
}
