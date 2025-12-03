import { Plus, Trash2 } from 'lucide-react';
import React from 'react';

import { UNIT_OPTIONS } from '../../utils';

/**
 * ParametersTab Component
 *
 * Manages parameters (ronl:ParameterWaarde) with dynamic add/remove functionality.
 * Parameters are constant values used in calculations and conditions.
 * Each parameter includes notation, label, value, unit, description, and validity periods.
 *
 * @param {Array} parameters - Array of parameter objects
 * @param {Function} addParameter - Handler to add a new parameter
 * @param {Function} removeParameter - Handler to remove a parameter by ID
 * @param {Function} updateParameter - Handler to update a specific field of a parameter
 */
const ParametersTab = ({ parameters, addParameter, removeParameter, updateParameter }) => {
  return (
    <div className="space-y-4">
      {/* Information Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Parameters</strong> are constant values used in calculations and conditions.
          <br />
          For example: income limits, asset thresholds, percentages of social assistance norms.
        </p>
      </div>

      {/* Parameters List */}
      {parameters.map((param, index) => (
        <div key={param.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          {/* Parameter Header */}
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-700">Parameter {index + 1}</h4>
            {parameters.length > 1 && (
              <button
                onClick={() => removeParameter(param.id)}
                className="text-red-600 hover:text-red-800 transition-colors"
                aria-label={`Remove Parameter ${index + 1}`}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          {/* Parameter Fields */}
          <div className="space-y-3">
            {/* Notation and Label */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  <span className="font-medium">Notation (Machine-readable)</span>
                  <span className="text-gray-500"> (skos:notation)</span>
                  <span className="text-red-500"> *</span>
                </label>
                <input
                  type="text"
                  value={param.notation}
                  onChange={(e) => updateParameter(param.id, 'notation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="BOVENGRENS_INKOMEN_ALLEENSTAANDE"
                />
                <p className="text-xs text-green-600 mt-1">✓ Use UPPERCASE_WITH_UNDERSCORES</p>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  <span className="font-medium">Label (Human-readable)</span>
                  <span className="text-gray-500"> (skos:prefLabel)</span>
                  <span className="text-red-500"> *</span>
                </label>
                <input
                  type="text"
                  value={param.label}
                  onChange={(e) => updateParameter(param.id, 'label', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Bovengrens inkomen alleenstaande"
                />
              </div>
            </div>

            {/* Value and Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  <span className="font-medium">Value</span>
                  <span className="text-gray-500"> (schema:value)</span>
                  <span className="text-red-500"> *</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={param.value}
                  onChange={(e) => updateParameter(param.id, 'value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1207.30"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  <span className="font-medium">Unit</span>
                  <span className="text-gray-500"> (schema:unitCode)</span>
                </label>
                <select
                  value={param.unit}
                  onChange={(e) => updateParameter(param.id, 'unit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {UNIT_OPTIONS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                <span className="font-medium">Description</span>
                <span className="text-gray-500"> (dct:description)</span>
              </label>
              <textarea
                value={param.description}
                onChange={(e) => updateParameter(param.id, 'description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="2"
                placeholder="Maximum inkomensgrens voor alleenstaanden om in aanmerking te komen voor de regeling"
              />
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
                  value={param.validFrom}
                  onChange={(e) => updateParameter(param.id, 'validFrom', e.target.value)}
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
                  value={param.validUntil}
                  onChange={(e) => updateParameter(param.id, 'validUntil', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Add Parameter Button */}
      <button
        onClick={addParameter}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        <Plus size={18} /> Add Parameter
      </button>
    </div>
  );
};

export default ParametersTab;
