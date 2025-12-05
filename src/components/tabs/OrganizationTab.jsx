import React from 'react';

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
    </div>
  );
}
