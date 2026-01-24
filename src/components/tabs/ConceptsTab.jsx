import { BookOpen, ExternalLink } from 'lucide-react';
import React from 'react';

export default function ConceptsTab({ dmnData, service, concepts }) {
  // Separate inputs and outputs from state
  const inputConcepts = concepts.filter((c) => c.linkedToType === 'input');
  const outputConcepts = concepts.filter((c) => c.linkedToType === 'output');
  const totalConcepts = concepts.length;

  // Empty state - no concepts generated yet
  if (concepts.length === 0) {
    return (
      <div className="space-y-4">
        {/* Primary Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <BookOpen className="text-blue-600 flex-shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-3 text-lg">
                NL-SBB Concept Definitions
              </h3>
              <p className="text-sm text-blue-800 mb-4">
                This tab displays automatically generated concepts for DMN variables according to
                the <strong>Dutch Standard for Describing Concepts (NL-SBB)</strong>.
              </p>

              {/* Workflow Steps */}
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-900 mb-3">To generate concepts:</p>
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
                    <span>Run a test (so inputs/outputs are known)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                    <span>Concepts will be automatically generated and appear here</span>
                  </li>
                </ol>
              </div>

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
          </div>
        </div>

        {/* What are Concepts? */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">What are NL-SBB Concepts?</h4>
          <p className="text-sm text-gray-700 mb-3">
            Concepts are semantic definitions that describe the <em>meaning</em> of DMN variables,
            independent of their technical implementation. This enables:
          </p>
          <ul className="space-y-1 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-600 flex-shrink-0 mt-0.5">✓</span>
              <span>
                Semantic linking of variables across different DMNs (e.g., "geboortedatum" =
                "birthdate")
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 flex-shrink-0 mt-0.5">✓</span>
              <span>Advanced chain validation in the Linked Data Explorer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 flex-shrink-0 mt-0.5">✓</span>
              <span>Concept harmonization across different organizations</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // Concepts exist - show them
  const conceptSchemeUri = 'https://regels.overheid.nl/schemes/dmn-variables';

  return (
    <div className="space-y-6">
      {/* Success Indicator */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
            ✓
          </div>
          <div>
            <h4 className="font-semibold text-green-900">
              {totalConcepts} concepts automatically generated
            </h4>
            <p className="text-sm text-green-800 mt-1">
              Based on {inputConcepts.length} inputs and {outputConcepts.length} outputs from the
              DMN model. These concepts are automatically included in export.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="text-purple-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-purple-900 mb-2">NL-SBB Concept Definitions</h3>
            <p className="text-sm text-purple-800 mb-2">
              Semantic concept definitions for DMN variables conforming to the{' '}
              <strong>Dutch Standard for Describing Concepts (NL-SBB)</strong>.
            </p>
            <p className="text-xs text-purple-700">
              These concepts enable semantic linking of variables across different DMNs via{' '}
              <code>skos:exactMatch</code> for advanced chain validation in the Linked Data
              Explorer.
            </p>
          </div>
        </div>
      </div>

      {/* Concept Scheme Info */}
      <div className="bg-white border border-gray-300 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Concept Scheme</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-gray-600 min-w-24">URI:</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
              {conceptSchemeUri}
            </code>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-600 min-w-24">Type:</span>
            <span className="text-gray-800">skos:ConceptScheme</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-600 min-w-24">Title:</span>
            <span className="text-gray-800">DMN Variables Concept Scheme</span>
          </div>
        </div>
      </div>

      {/* Input Concepts */}
      {inputConcepts.length > 0 && (
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-4">
            Input Concepts ({inputConcepts.length})
          </h4>
          <div className="space-y-4">
            {inputConcepts.map((concept) => (
              <div key={concept.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{concept.prefLabel}</h5>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Input</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-600 min-w-24">Notation:</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {concept.notation}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-600 min-w-24">Variable:</span>
                    <span className="text-gray-800">{concept.variableName}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-600 min-w-24">Definition:</span>
                    <span className="text-gray-800">{concept.definition}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-600 min-w-24">Linked to:</span>
                    <code className="text-xs text-blue-600">
                      cpsv:Input #{concept.linkedTo.split('/')[1]}
                    </code>
                  </div>
                  {concept.exactMatch && concept.exactMatch.trim() !== '' && (
                    <div className="flex gap-2">
                      <span className="text-gray-600 min-w-24">Exact Match:</span>
                      <code className="text-xs text-purple-600 break-all">
                        {concept.exactMatch}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output Concepts */}
      {outputConcepts.length > 0 && (
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-4">
            Output Concepts ({outputConcepts.length})
          </h4>
          <div className="space-y-4">
            {outputConcepts.map((concept) => (
              <div key={concept.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{concept.prefLabel}</h5>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Output
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-600 min-w-24">Notation:</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {concept.notation}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-600 min-w-24">Variable:</span>
                    <span className="text-gray-800">{concept.variableName}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-600 min-w-24">Definition:</span>
                    <span className="text-gray-800">{concept.definition}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-600 min-w-24">Linked to:</span>
                    <code className="text-xs text-green-600">
                      cpsv:Output #{concept.linkedTo.split('/')[1]}
                    </code>
                  </div>
                  {concept.exactMatch && concept.exactMatch.trim() !== '' && (
                    <div className="flex gap-2">
                      <span className="text-gray-600 min-w-24">Exact Match:</span>
                      <code className="text-xs text-purple-600 break-all">
                        {concept.exactMatch}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentation Link */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ExternalLink className="text-gray-600 flex-shrink-0" size={18} />
          <div className="text-sm">
            <p className="text-gray-700 mb-1">
              <strong>NL-SBB Documentation:</strong>
            </p>
            <a
              href="https://geonovum.github.io/NL-SBB/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Dutch Standard for Describing Concepts
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
