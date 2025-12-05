import { FileText } from 'lucide-react';
import React from 'react';

export default function OutputSection({ output, setOutput }) {
  const updateField = (field, value) => {
    setOutput({ ...output, [field]: value });
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-green-600" />
        <h3 className="font-semibold text-gray-900">Service Output (cv:Output)</h3>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Optional:</strong> Define outputs/results produced by this service. Leave
          identifier empty if not applicable.
        </p>
      </div>

      {/* Output Identifier */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Output Identifier</span>
          <span className="text-gray-500"> (dct:identifier)</span>
        </label>
        <input
          type="text"
          value={output.identifier}
          onChange={(e) => updateField('identifier', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., output-001"
        />
      </div>

      {/* Show fields if identifier exists OR if any other field has data (for imports) */}
      {(output.identifier || output.name || output.description || output.type) && (
        <>
          {/* Output Name */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              <span className="font-medium">Output Name</span>
              <span className="text-gray-500"> (dct:title)</span>
              <span className="text-red-500"> *</span>
            </label>
            <input
              type="text"
              value={output.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., Permit Document"
            />
            <p className="text-xs text-green-600 mt-1">Required if output identifier is provided</p>
          </div>

          {/* Output Description */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              <span className="font-medium">Output Description</span>
              <span className="text-gray-500"> (dct:description)</span>
            </label>
            <textarea
              value={output.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows="2"
              placeholder="e.g., Official permit document with stamp"
            />
          </div>

          {/* Output Type */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              <span className="font-medium">Output Type</span>
              <span className="text-gray-500"> (dct:type)</span>
            </label>
            <input
              type="text"
              value={output.type}
              onChange={(e) => updateField('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="URI or code, e.g., http://example.org/types/Permit"
            />
            <p className="text-xs text-green-600 mt-1">
              URI reference to output type classification
            </p>
          </div>
        </>
      )}
    </div>
  );
}
