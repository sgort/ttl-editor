import { BookOpen, ExternalLink, Plus, Trash2 } from 'lucide-react';
import React from 'react';

export default function ConceptsTab({ concepts, removeConcept, updateConcept, setConcepts }) {
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

  // Concepts exist - show editable list
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
            <h4 className="font-semibold text-green-900">{totalConcepts} concepts</h4>
            <p className="text-sm text-green-800 mt-1">
              {inputConcepts.length} inputs and {outputConcepts.length} outputs. Edit semantic
              properties below to refine concept definitions.
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
              <div
                key={concept.id}
                data-concept-id={concept.id}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                {/* Concept Header */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium text-gray-900">{concept.variableName}</h5>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Input #{concept.linkedTo.split('/')[1]}
                    </span>
                  </div>
                  <button
                    onClick={() => removeConcept(concept.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    aria-label={`Remove concept ${concept.variableName}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Editable Fields */}
                <div className="space-y-3">
                  {/* Preferred Label */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      <span className="font-medium">Preferred Label</span>
                      <span className="text-gray-500"> (skos:prefLabel)</span>
                      <span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="text"
                      value={concept.prefLabel}
                      onChange={(e) => updateConcept(concept.id, 'prefLabel', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Geboortedatum Aanvrager"
                    />
                  </div>

                  {/* Notation */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      <span className="font-medium">Notation (Machine Code)</span>
                      <span className="text-gray-500"> (skos:notation)</span>
                      <span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="text"
                      value={concept.notation}
                      onChange={(e) => updateConcept(concept.id, 'notation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., GA"
                    />
                  </div>

                  {/* Definition */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      <span className="font-medium">Definition</span>
                      <span className="text-gray-500"> (skos:definition)</span>
                      <span className="text-red-500"> *</span>
                    </label>
                    <textarea
                      value={concept.definition}
                      onChange={(e) => updateConcept(concept.id, 'definition', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe the semantic meaning of this concept..."
                    />
                  </div>

                  {/* Exact Match (Optional) */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      <span className="font-medium">Exact Match URI</span>
                      <span className="text-gray-500"> (skos:exactMatch)</span>
                      <span className="text-gray-400"> - Optional</span>
                    </label>
                    <input
                      type="text"
                      value={concept.exactMatch || ''}
                      onChange={(e) => updateConcept(concept.id, 'exactMatch', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="e.g., https://begrippen.regels.overheid.nl/concept/geboortedatum"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Link to an equivalent concept in another ontology for semantic
                      interoperability
                    </p>
                  </div>

                  {/* Variable Name (Editable) */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      <span className="font-medium">Variable Name</span>
                      <span className="text-gray-500"> (used in URI)</span>
                    </label>
                    <input
                      type="text"
                      value={concept.variableName}
                      onChange={(e) => {
                        const newVariableName = e.target.value;
                        const baseUri = concept.uri.substring(0, concept.uri.lastIndexOf('/') + 1);
                        const newUri = baseUri + newVariableName;

                        // Update both fields at once using setConcepts directly
                        setConcepts(
                          concepts.map((c) =>
                            c.id === concept.id
                              ? { ...c, variableName: newVariableName, uri: newUri }
                              : c
                          )
                        );
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="e.g., geboortedatumAanvrager"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Technical variable name (camelCase, no spaces)
                    </p>
                  </div>

                  {/* Read-only field: Linked To */}
                  <div className="pt-2 border-t">
                    <span className="text-xs text-gray-600">Linked To:</span>
                    <code className="block text-sm text-blue-600 mt-1">
                      cpsv:Input #{concept.linkedTo.split('/')[1]}
                    </code>
                  </div>
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
              <div
                key={concept.id}
                data-concept-id={concept.id}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                {/* Concept Header */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium text-gray-900">{concept.variableName}</h5>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Output #{concept.linkedTo.split('/')[1]}
                    </span>
                  </div>
                  <button
                    onClick={() => removeConcept(concept.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    aria-label={`Remove concept ${concept.variableName}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Editable Fields */}
                <div className="space-y-3">
                  {/* Preferred Label */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      <span className="font-medium">Preferred Label</span>
                      <span className="text-gray-500"> (skos:prefLabel)</span>
                      <span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="text"
                      value={concept.prefLabel}
                      onChange={(e) => updateConcept(concept.id, 'prefLabel', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., Leeftijd Aanvrager"
                    />
                  </div>

                  {/* Notation */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      <span className="font-medium">Notation (Machine Code)</span>
                      <span className="text-gray-500"> (skos:notation)</span>
                      <span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="text"
                      value={concept.notation}
                      onChange={(e) => updateConcept(concept.id, 'notation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., LA"
                    />
                  </div>

                  {/* Definition */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      <span className="font-medium">Definition</span>
                      <span className="text-gray-500"> (skos:definition)</span>
                      <span className="text-red-500"> *</span>
                    </label>
                    <textarea
                      value={concept.definition}
                      onChange={(e) => updateConcept(concept.id, 'definition', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Describe the semantic meaning of this concept..."
                    />
                  </div>

                  {/* Exact Match (Optional) */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      <span className="font-medium">Exact Match URI</span>
                      <span className="text-gray-500"> (skos:exactMatch)</span>
                      <span className="text-gray-400"> - Optional</span>
                    </label>
                    <input
                      type="text"
                      value={concept.exactMatch || ''}
                      onChange={(e) => updateConcept(concept.id, 'exactMatch', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="e.g., https://begrippen.regels.overheid.nl/concept/leeftijd"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Link to an equivalent concept in another ontology for semantic
                      interoperability
                    </p>
                  </div>

                  {/* Variable Name (Editable) */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      <span className="font-medium">Variable Name</span>
                      <span className="text-gray-500"> (used in URI)</span>
                    </label>
                    <input
                      type="text"
                      value={concept.variableName}
                      onChange={(e) => {
                        const newVariableName = e.target.value;
                        const baseUri = concept.uri.substring(0, concept.uri.lastIndexOf('/') + 1);
                        const newUri = baseUri + newVariableName;

                        // Update both fields at once using setConcepts directly
                        setConcepts(
                          concepts.map((c) =>
                            c.id === concept.id
                              ? { ...c, variableName: newVariableName, uri: newUri }
                              : c
                          )
                        );
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                      placeholder="e.g., leeftijdAanvrager"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Technical variable name (camelCase, no spaces)
                    </p>
                  </div>

                  {/* Read-only field: Linked To */}
                  <div className="pt-2 border-t">
                    <span className="text-xs text-gray-600">Linked To:</span>
                    <code className="block text-sm text-green-600 mt-1">
                      cpsv:Output #{concept.linkedTo.split('/')[1]}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Concept Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            // Calculate next input number
            const nextInputNum = inputConcepts.length + 1;

            // Add input concept with proper defaults
            const newId = Math.max(0, ...concepts.map((c) => c.id)) + 1;
            const newConcept = {
              id: newId,
              uri: `https://regels.overheid.nl/concepts/manual/input${newId}`,
              variableName: `manualInput${newId}`,
              prefLabel: '',
              definition: '',
              notation: '',
              linkedTo: `input/${nextInputNum}`,
              linkedToType: 'input',
              exactMatch: '',
              type: 'dmn:InputVariable',
            };

            // Use the handler's update function directly
            setConcepts([...concepts, newConcept]);

            // Scroll to new concept
            setTimeout(() => {
              const newElement = document.querySelector(`[data-concept-id="${newId}"]`);
              if (newElement) {
                newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const firstInput = newElement.querySelector('input');
                if (firstInput) firstInput.focus();
              }
            }, 100);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Add Input Concept
        </button>

        <button
          onClick={() => {
            // Calculate next output number
            const nextOutputNum = outputConcepts.length + 1;

            // Add output concept with proper defaults
            const newId = Math.max(0, ...concepts.map((c) => c.id)) + 1;
            const newConcept = {
              id: newId,
              uri: `https://regels.overheid.nl/concepts/manual/output${newId}`,
              variableName: `manualOutput${newId}`,
              prefLabel: '',
              definition: '',
              notation: '',
              linkedTo: `output/${nextOutputNum}`,
              linkedToType: 'output',
              exactMatch: '',
              type: 'dmn:OutputVariable',
            };

            // Use the handler's update function directly
            setConcepts([...concepts, newConcept]);

            // Scroll to new concept
            setTimeout(() => {
              const newElement = document.querySelector(`[data-concept-id="${newId}"]`);
              if (newElement) {
                newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const firstInput = newElement.querySelector('input');
                if (firstInput) firstInput.focus();
              }
            }, 100);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Plus size={18} /> Add Output Concept
        </button>
      </div>

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
