import React from 'react';

import { LANGUAGE_OPTIONS, SECTOR_OPTIONS } from '../../utils';
import CostSection from './CostSection';
import OutputSection from './OutputSection';

/**
 * ServiceTab - Form for editing public service metadata
 * Maps to cpsv:PublicService in CPSV-AP 3.2.0
 */
export default function ServiceTab({ service, setService, cost, setCost, output, setOutput }) {
  // Helper to update a single field
  const updateField = (field, value) => {
    setService({ ...service, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Service Identifier - MANDATORY */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Unique identifier for this service</span>
          <span className="text-gray-500"> (dct:identifier)</span>
          <span className="text-red-500"> *</span>
        </label>
        <input
          type="text"
          value={service.identifier}
          onChange={(e) => updateField('identifier', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., aow-leeftijd"
        />
      </div>

      {/* Service Name - MANDATORY */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Official name of the service</span>
          <span className="text-gray-500"> (dct:title)</span>
          <span className="text-red-500"> *</span>
        </label>
        <input
          type="text"
          value={service.name}
          onChange={(e) => updateField('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., AOW Leeftijdsbepaling"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Detailed description of the service</span>
          <span className="text-gray-500"> (dct:description)</span>
        </label>
        <textarea
          value={service.description}
          onChange={(e) => updateField('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows="3"
          placeholder="Describe the service..."
        />
      </div>

      {/* Thematic Area */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">URI for thematic classification</span>
          <span className="text-gray-500"> (cv:thematicArea)</span>
        </label>
        <input
          type="text"
          value={service.thematicArea}
          onChange={(e) => updateField('thematicArea', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., https://standaarden.overheid.nl/owms/terms/aow-leeftijd"
        />
      </div>

      {/* Sector */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Government level providing this service</span>
          <span className="text-gray-500"> (cv:sector)</span>
        </label>
        <select
          value={service.sector || ''}
          onChange={(e) => {
            const selectedValue = e.target.value;
            // Update both fields in a single state update
            setService({
              ...service,
              sector: selectedValue,
              customSector: selectedValue === 'custom' ? service.customSector : '',
            });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          {SECTOR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom URI input */}
        {service.sector === 'custom' && (
          <input
            type="text"
            value={service.customSector || ''}
            onChange={(e) => updateField('customSector', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
            placeholder="Enter custom sector URI"
          />
        )}

        <p className="text-xs text-gray-500 mt-1">
          URI reference to government sector classification
        </p>
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Comma-separated keywords</span>
          <span className="text-gray-500"> (dcat:keyword)</span>
        </label>
        <input
          type="text"
          value={service.keywords}
          onChange={(e) => updateField('keywords', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="e.g., pension, retirement"
        />
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">
          <span className="font-medium">Language of the service</span>
          <span className="text-gray-500"> (dct:language)</span>
        </label>
        <select
          value={service.language}
          onChange={(e) => updateField('language', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <CostSection cost={cost} setCost={setCost} />
      <OutputSection output={output} setOutput={setOutput} />
    </div>
  );
}
