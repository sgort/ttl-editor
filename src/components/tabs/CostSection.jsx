import { Euro } from 'lucide-react';
import React from 'react';

export default function CostSection({ cost, setCost }) {
  const updateField = (field, value) => {
    setCost({ ...cost, [field]: value });
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Euro className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Service Cost (cv:Cost)</h3>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Optional:</strong> Define costs associated with this service. Leave identifier
          empty if service has no costs.
        </p>
      </div>

      {/* Cost Identifier */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Cost Identifier</span>
          <span className="text-gray-500"> (dct:identifier)</span>
        </label>
        <input
          type="text"
          value={cost.identifier || ''}
          onChange={(e) => updateField('identifier', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., cost-001"
        />
      </div>

      {/* Show fields if identifier exists OR if any other field has data (for imports) */}
      {(cost.identifier || cost.value || cost.currency || cost.description) && (
        <>
          {/* Amount */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              <span className="font-medium">Amount</span>
              <span className="text-gray-500"> (cv:value)</span>
            </label>
            <input
              type="text"
              value={cost.value || ''}
              onChange={(e) => updateField('value', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., 25.00 or Free"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              <span className="font-medium">Currency</span>
              <span className="text-gray-500"> (cv:currency)</span>
            </label>
            <select
              value={cost.currency || 'EUR'}
              onChange={(e) => updateField('currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              <span className="font-medium">Cost Description</span>
              <span className="text-gray-500"> (dct:description)</span>
            </label>
            <textarea
              value={cost.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows="2"
              placeholder="e.g., Application processing fee"
            />
          </div>
        </>
      )}
    </div>
  );
}
