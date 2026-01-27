import React from 'react';

/**
 * LegalTab - Form for editing legal resource metadata
 * Maps to eli:LegalResource in CPSV-AP 3.2.0
 *
 * Supports:
 * - BWB: National legislation (wetten.overheid.nl)
 * - CVDR: Municipal/local regulations (lokaleregelgeving.overheid.nl)
 */
export default function LegalTab({ legalResource, setLegalResource }) {
  // Helper to update a single field
  const updateField = (field, value) => {
    setLegalResource({ ...legalResource, [field]: value });
  };

  // Check if it's a full URI or just an ID
  const lowerIdentifier = legalResource.bwbId?.toLowerCase() || '';
  const isFullUri = lowerIdentifier.startsWith('http://') || lowerIdentifier.startsWith('https://');

  // Detect legal resource type
  const isBWB = legalResource.bwbId?.match(/BWB[A-Z]?\d+/i) !== null;
  const isCVDR = legalResource.bwbId?.match(/CVDR\d+/i) !== null;

  // Check if it's a valid identifier
  const isValidIdentifier = isBWB || isCVDR || isFullUri;
  const hasInvalidIdentifier = legalResource.bwbId && !isValidIdentifier;

  // Determine the repository URL
  let repositoryUrl = '';
  let repositoryName = '';
  if (isBWB) {
    repositoryUrl = 'https://wetten.overheid.nl';
    repositoryName = 'National Legislation (BWB)';
  } else if (isCVDR) {
    repositoryUrl = 'https://lokaleregelgeving.overheid.nl';
    repositoryName = 'Local Regulations (CVDR)';
  }

  return (
    <div className="space-y-4">
      {/* Info box about legal resources */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <p className="text-blue-800 mb-2">
          <strong>Supported formats:</strong>
        </p>
        <ul className="text-blue-800 space-y-1 ml-4">
          <li>
            <strong>BWB:</strong> National legislation (e.g., "BWBR0011453") from{' '}
            <a
              href="https://wetten.overheid.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              wetten.overheid.nl
            </a>
          </li>
          <li>
            <strong>CVDR:</strong> Municipal/local regulations (e.g., "CVDR603544") from{' '}
            <a
              href="https://lokaleregelgeving.overheid.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              lokaleregelgeving.overheid.nl
            </a>
          </li>
        </ul>
        <p className="text-blue-800 mt-2">
          You can enter either an ID or a full URI (e.g.,
          "https://lokaleregelgeving.overheid.nl/CVDR603544/1")
        </p>
      </div>

      {/* Legal Resource Identifier */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Dutch legal document identifier or URI</span>
          <span className="text-gray-500"> (eli:LegalResource)</span>
        </label>
        <input
          type="text"
          value={legalResource.bwbId}
          onChange={(e) => updateField('bwbId', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md ${
            hasInvalidIdentifier
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
          placeholder="e.g., BWBR0011453, CVDR603544, or full URI"
        />

        {/* Validation feedback */}
        {hasInvalidIdentifier && (
          <p className="text-xs text-red-600 mt-1">
            ⚠ Should contain a BWB ID (e.g., BWBR0011453) or CVDR ID (e.g., CVDR603544)
          </p>
        )}

        {/* Success feedback for full URI */}
        {isFullUri && isValidIdentifier && (
          <p className="text-xs text-green-600 mt-1">✓ Full URI detected - will be used directly</p>
        )}

        {/* Success feedback for BWB ID */}
        {!isFullUri && isBWB && (
          <p className="text-xs text-green-600 mt-1">
            ✓ BWB ID detected → Will generate: {repositoryUrl}/{legalResource.bwbId}
          </p>
        )}

        {/* Success feedback for CVDR ID */}
        {!isFullUri && isCVDR && (
          <div>
            <p className="text-xs text-green-600 mt-1">
              ✓ CVDR ID detected → Will generate: {repositoryUrl}/{legalResource.bwbId}/1
            </p>
            <p className="text-xs text-amber-600 mt-1">
              💡 Note: CVDR URIs include version number. Default is "/1" - you can specify a
              different version in the URI field directly.
            </p>
          </div>
        )}

        {/* Repository badge */}
        {repositoryName && (
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isBWB ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
              }`}
            >
              {repositoryName}
            </span>
          </div>
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
          onChange={(e) => updateField('version', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
        />
        {isCVDR && (
          <p className="text-xs text-gray-500 mt-1">
            For CVDR documents, the version number is typically part of the URI (e.g., /1)
          </p>
        )}
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
          onChange={(e) => updateField('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
          placeholder={
            isBWB
              ? 'e.g., Algemene Ouderdomswet'
              : isCVDR
                ? 'e.g., Verordening maatschappelijke ondersteuning gemeente Heusden 2023'
                : 'e.g., Wet- of regeltitel'
          }
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
          onChange={(e) => updateField('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
          rows="3"
          placeholder="Describe the legal resource..."
        />
      </div>

      {/* Quick link to view the document */}
      {isValidIdentifier && legalResource.bwbId && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Quick Links:</p>
          <div className="space-y-2">
            {isBWB && !isFullUri && (
              <a
                href={`https://wetten.overheid.nl/${legalResource.bwbId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline block"
              >
                → View on wetten.overheid.nl
              </a>
            )}
            {isCVDR && !isFullUri && (
              <a
                href={`https://lokaleregelgeving.overheid.nl/${legalResource.bwbId}/1`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-600 hover:text-purple-800 underline block"
              >
                → View on lokaleregelgeving.overheid.nl
              </a>
            )}
            {isFullUri && (
              <a
                href={legalResource.bwbId}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline block"
              >
                → View document
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
