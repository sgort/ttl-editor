import React, { useEffect, useState } from 'react';

import { fetchAllRonlConcepts } from '../../utils/ronlHelper';

/**
 * LegalTab - Form for editing legal resource metadata
 * Maps to eli:LegalResource in CPSV-AP 3.2.0
 *
 * Supports:
 * - BWB: National legislation (wetten.overheid.nl)
 * - CVDR: Municipal/local regulations (lokaleregelgeving.overheid.nl)
 * - RONL concepts: Analysis and Method concepts from TriplyDB
 */
export default function LegalTab({
  legalResource,
  setLegalResource,
  ronlAnalysis,
  setRonlAnalysis,
  ronlMethod,
  setRonlMethod,
}) {
  // State for dropdown options
  const [analysisConcepts, setAnalysisConcepts] = useState([]);
  const [methodConcepts, setMethodConcepts] = useState([]);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const [conceptsError, setConceptsError] = useState('');

  // RONL endpoint
  const RONL_ENDPOINT =
    'https://api.open-regels.triply.cc/datasets/stevengort/ronl/services/ronl/sparql';

  // Fetch concepts on component mount
  useEffect(() => {
    const loadConcepts = async () => {
      setLoadingConcepts(true);
      setConceptsError('');

      try {
        const { analysisConcepts: analysis, methodConcepts: methods } =
          await fetchAllRonlConcepts(RONL_ENDPOINT);

        setAnalysisConcepts(analysis);
        setMethodConcepts(methods);

        console.log('Loaded RONL concepts successfully');
      } catch (error) {
        console.error('Failed to load RONL concepts:', error);
        setConceptsError('Failed to load concepts from TriplyDB. Please check your connection.');
      } finally {
        setLoadingConcepts(false);
      }
    };

    loadConcepts();
  }, []); // Empty dependency array = run once on mount

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
    // eslint-disable-next-line no-unused-vars
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
            <strong>CVDR:</strong> Municipal/local regulations (e.g., "CVDR123456") from{' '}
            <a
              href="https://lokaleregelgeving.overheid.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-purple-600"
            >
              lokaleregelgeving.overheid.nl
            </a>
          </li>
          <li>
            <strong>Full URI:</strong> Complete HTTP(S) URL to any legal document
          </li>
        </ul>
      </div>

      {/* BWB/CVDR Identifier */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">BWB ID, CVDR ID, or full document URI</span>
          <span className="text-gray-500"> (eli:LegalResource)</span>
          <span className="text-red-500"> *</span>
        </label>
        <input
          type="text"
          value={legalResource.bwbId}
          onChange={(e) => updateField('bwbId', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 ${
            hasInvalidIdentifier ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., BWBR0011453 or CVDR123456 or https://..."
        />
        {hasInvalidIdentifier && (
          <p className="text-xs text-red-600 mt-1">
            ⚠️ Must be a BWB ID (BWBR/BWBV...), CVDR ID (CVDR...), or full URI (https://...)
          </p>
        )}
        {isValidIdentifier && !isFullUri && (
          <div className="mt-2 text-sm">
            <p className="text-gray-600 mb-1">
              <strong>Detected format:</strong>{' '}
              {isBWB ? 'BWB National Legislation' : 'CVDR Local Regulation'}
            </p>
            {isCVDR && (
              <p className="text-xs text-gray-500 italic">
                💡 For CVDR documents, the URI will be generated as: lokaleregelgeving.overheid.nl/
                {legalResource.bwbId}/1. Default is "/1" - you can specify a different version in
                the URI field directly.
              </p>
            )}
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

      {/* RONL CONCEPTS SECTION */}
      <div className="border-t pt-4 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">RONL Concepts</h3>

        {/* Error message */}
        {conceptsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800">⚠️ {conceptsError}</p>
          </div>
        )}

        {/* Loading state */}
        {loadingConcepts && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">Loading concepts from TriplyDB...</p>
          </div>
        )}

        {/* Analysis and Method Dropdowns - Side by side */}
        <div className="grid grid-cols-2 gap-4">
          {/* Analysis Concept Dropdown */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              <span className="font-medium">Analysis</span>
              <span className="text-gray-500"> (ronl:AnalysisConcept)</span>
              <span className="text-red-500"> *</span>
            </label>
            <select
              value={ronlAnalysis}
              onChange={(e) => setRonlAnalysis(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={loadingConcepts || analysisConcepts.length === 0}
            >
              <option value="">-- Select analysis method --</option>
              {analysisConcepts.map((concept) => (
                <option key={concept.uri} value={concept.uri}>
                  {concept.label}
                </option>
              ))}
            </select>
          </div>

          {/* Method Concept Dropdown */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              <span className="font-medium">Method</span>
              <span className="text-gray-500"> (ronl:MethodConcept)</span>
              <span className="text-red-500"> *</span>
            </label>
            <select
              value={ronlMethod}
              onChange={(e) => setRonlMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={loadingConcepts || methodConcepts.length === 0}
            >
              <option value="">-- Select method --</option>
              {methodConcepts.map((concept) => (
                <option key={concept.uri} value={concept.uri}>
                  {concept.label}
                </option>
              ))}
            </select>
          </div>
        </div>
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
