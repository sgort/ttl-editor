import React from "react";

/**
 * LegalTab - Form for editing legal resource metadata
 * Maps to eli:LegalResource in CPSV-AP 3.2.0
 */
export default function LegalTab({ legalResource, setLegalResource }) {
  // Helper to update a single field
  const updateField = (field, value) => {
    setLegalResource({ ...legalResource, [field]: value });
  };

  // Check if BWB ID matches expected pattern
  const isValidBwbId = legalResource.bwbId && /^[A-Z]{2,10}\d+$/.test(legalResource.bwbId);
  const hasInvalidBwbId = legalResource.bwbId && !isValidBwbId;

  return (
    <div className="space-y-4">
      {/* Info box about legal resources */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <p className="text-blue-800">
          <strong>Tip:</strong> BWB (Basis Wetten Bestand) IDs are Dutch legal document identifiers. 
          You can find them on{" "}
          <a 
            href="https://wetten.overheid.nl" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-blue-600"
          >
            wetten.overheid.nl
          </a>
        </p>
      </div>

      {/* BWB ID */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Dutch legal document identifier</span>
          <span className="text-gray-500"> (eli:LegalResource)</span>
        </label>
        <input
          type="text"
          value={legalResource.bwbId}
          onChange={(e) => updateField("bwbId", e.target.value.toUpperCase())}
          className={`w-full px-3 py-2 border rounded-md ${
            hasInvalidBwbId 
              ? "border-red-300 focus:ring-red-500" 
              : "border-gray-300"
          }`}
          placeholder="e.g., BWBR0002820"
        />
        {hasInvalidBwbId && (
          <p className="text-xs text-red-600 mt-1">
            ⚠ Format should be letters followed by numbers (e.g., BWBR0002820)
          </p>
        )}
        {isValidBwbId && (
          <p className="text-xs text-green-600 mt-1">
            ✓ Will generate: https://identifier.overheid.nl/tooi/def/thes/kern/c_{legalResource.bwbId}
          </p>
        )}
      </div>

      {/* Version Date */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Version or consolidation date</span>
          <span className="text-gray-500"> (eli:is_realized_by)</span>
        </label>
        <input
          type="date"
          value={legalResource.version}
          onChange={(e) => updateField("version", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      {/* Legal Title */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Official title of the legal document</span>
          <span className="text-gray-500"> (dct:title)</span>
        </label>
        <input
          type="text"
          value={legalResource.title}
          onChange={(e) => updateField("title", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., Algemene Ouderdomswet"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Description of the legal resource</span>
          <span className="text-gray-500"> (dct:description)</span>
        </label>
        <textarea
          value={legalResource.description}
          onChange={(e) => updateField("description", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows="3"
          placeholder="Describe the legal resource..."
        />
      </div>
    </div>
  );
}
