import { Plus, Trash2 } from 'lucide-react';
import React from 'react';

import { CONFIDENCE_LEVELS } from '../../utils';

/**
 * RulesTab Component
 *
 * Manages temporal rules (ronl:TemporalRule) with dynamic add/remove functionality.
 * Each rule includes URI, extends relationship, validity periods, confidence level, and description.
 *
 * @param {Array} temporalRules - Array of temporal rule objects
 * @param {Function} addTemporalRule - Handler to add a new temporal rule
 * @param {Function} removeTemporalRule - Handler to remove a temporal rule by ID
 * @param {Function} updateTemporalRule - Handler to update a specific field of a temporal rule
 */
const RulesTab = ({ temporalRules, addTemporalRule, removeTemporalRule, updateTemporalRule }) => {
  return (
    <div className="space-y-4">
      {/* Information Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Temporal Rules</strong> define time-based regulations with validity periods.
          <br />
          Use <code className="bg-blue-100 px-1 rounded">ronl:extends</code> to create rule
          inheritance chains for versioned regulations.
        </p>
      </div>

      {/* Temporal Rules List */}
      {temporalRules.map((rule, index) => (
        <div key={rule.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          {/* Rule Header */}
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-700">Temporal Rule {index + 1}</h4>
            {temporalRules.length > 1 && (
              <button
                onClick={() => removeTemporalRule(rule.id)}
                className="text-red-600 hover:text-red-800 transition-colors"
                aria-label={`Remove Temporal Rule ${index + 1}`}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          {/* Rule Fields */}
          <div className="space-y-3">
            {/* Rule URI */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                <span className="font-medium">Rule URI</span>
                <span className="text-gray-500"> (rdf:about)</span>
              </label>
              <input
                type="text"
                value={rule.uri}
                onChange={(e) => updateTemporalRule(rule.id, 'uri', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://regels.overheid.nl/rules/..."
              />
            </div>

            {/* Rule Identifier - MANDATORY for CPSV-AP */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                <span className="font-medium">Rule Identifier</span>
                <span className="text-gray-500"> (dct:identifier)</span>
                <span className="text-red-500"> *</span>
              </label>
              <input
                type="text"
                value={rule.identifier}
                onChange={(e) => updateTemporalRule(rule.id, 'identifier', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., rule-001"
              />
              <p className="text-xs text-green-600 mt-1">Unique identifier for this rule</p>
            </div>

            {/* Rule Title - MANDATORY for CPSV-AP */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                <span className="font-medium">Rule Title</span>
                <span className="text-gray-500"> (dct:title)</span>
                <span className="text-red-500"> *</span>
              </label>
              <input
                type="text"
                value={rule.title}
                onChange={(e) => updateTemporalRule(rule.id, 'title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., AOW Age Calculation Rule"
              />
              <p className="text-xs text-green-600 mt-1">Human-readable rule name</p>
            </div>

            {/* Extends */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                <span className="font-medium">Extends (Rule URI)</span>
                <span className="text-gray-500"> (ronl:extends)</span>
              </label>
              <input
                type="text"
                value={rule.extends}
                onChange={(e) => updateTemporalRule(rule.id, 'extends', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="URI of the rule being extended"
              />
              <p className="text-xs text-green-600 mt-1">
                Link to a previous version of this rule to create a versioning chain
              </p>
            </div>

            {/* Valid From / Valid Until */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  <span className="font-medium">Valid From</span>
                  <span className="text-gray-500"> (ronl:validFrom)</span>
                </label>
                <input
                  type="date"
                  value={rule.validFrom}
                  onChange={(e) => updateTemporalRule(rule.id, 'validFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  <span className="font-medium">Valid Until</span>
                  <span className="text-gray-500"> (ronl:validUntil)</span>
                </label>
                <input
                  type="date"
                  value={rule.validUntil}
                  onChange={(e) => updateTemporalRule(rule.id, 'validUntil', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Confidence Level */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                <span className="font-medium">Confidence Level</span>
                <span className="text-gray-500"> (ronl:confidenceLevel)</span>
              </label>
              <select
                value={rule.confidenceLevel}
                onChange={(e) => updateTemporalRule(rule.id, 'confidenceLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CONFIDENCE_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                <span className="font-medium">Description</span>
                <span className="text-gray-500"> (dct:description)</span>
              </label>
              <textarea
                value={rule.description}
                onChange={(e) => updateTemporalRule(rule.id, 'description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="10"
                placeholder="Describe this temporal rule..."
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add Temporal Rule Button */}
      <button
        onClick={addTemporalRule}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        <Plus size={18} /> Add Temporal Rule
      </button>
    </div>
  );
};

export default RulesTab;
