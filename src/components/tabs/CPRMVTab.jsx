import { Database, FileUp, Plus, Trash2 } from 'lucide-react';
import React from 'react';

import exampleCPRMVData from '../../data/cprmv-example.json';

const CPRMVTab = ({
  cprmvRules,
  addCPRMVRule,
  removeCPRMVRule,
  updateCPRMVRule,
  handleImportJSON,
  setCprmvRules, // âž• ADD THIS
}) => {
  // Function to load example data
  const loadExampleData = () => {
    // Map all example rules and set them directly
    const mappedRules = exampleCPRMVData.map((rule, index) => ({
      id: Date.now() + index, // Unique ID for each rule
      ruleId: rule['https://cprmv.open-regels.nl/0.3.0/id'] || '',
      rulesetId: rule.rulesetid || '',
      definition: rule['https://cprmv.open-regels.nl/0.3.0/definition'] || '',
      situatie: rule.situatie || '',
      norm: rule.norm || '',
      ruleIdPath: rule.rule_id_path || '',
    }));

    // Set all rules at once
    setCprmvRules(mappedRules);
  };
  return (
    <div className="space-y-4">
      {/* Import JSON Button - Top, matches Import TTL purple color */}
      <div className="flex items-center justify-end gap-3">
        {/* Load Example Button */}
        <button
          onClick={loadExampleData}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer shadow-md transition-colors"
        >
          <Database size={20} />
          Load Example
        </button>{' '}
        <input
          type="file"
          id="json-import"
          accept=".json"
          onChange={handleImportJSON}
          className="hidden"
        />
        <label
          htmlFor="json-import"
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer shadow-md transition-colors"
        >
          <FileUp size={20} />
          Import JSON
        </label>
      </div>

      {/* Information Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>CPRMV Rules</strong> are normative values extracted with the experimental{' '}
          <a
            href="https://cprmv.open-regels.nl/docs#/default/rules_rules__rule_id_path__get"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-medium"
          >
            CPRMV Rules Serve API
          </a>{' '}
          from Dutch legislation used in calculations and decision rules. For example: benefit
          amounts, income thresholds, percentages defined in social assistance laws.
          <br />
          <br /> The <strong>Import JSON</strong> function allows you to load the collected output
          into this tab, or try the{' '}
          <button
            onClick={loadExampleData}
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            example data
          </button>
          .
        </p>
      </div>

      {/* Rules List */}
      {cprmvRules.map((rule, index) => (
        <div key={rule.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          {/* Rule Header */}
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-700">Rule {index + 1}</h4>
            {cprmvRules.length >= 1 && (
              <button
                onClick={() => removeCPRMVRule(rule.id)}
                className="text-red-600 hover:text-red-800 transition-colors"
                aria-label={`Remove Rule ${index + 1}`}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          {/* Rule Fields */}
          <div className="space-y-3">
            {/* Rule ID Path - Top position, full width */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                <span className="font-medium">Rule ID Path</span>
                <span className="text-gray-500"> (cprmv:ruleIdPath)</span>
                <span className="text-red-500"> *</span>
              </label>
              <input
                type="text"
                value={rule.ruleIdPath}
                onChange={(e) => updateCPRMVRule(rule.id, 'ruleIdPath', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., BWBR0015703_2025-07-01_0, Artikel 20, lid 1, onderdeel a."
              />
            </div>

            {/* Rule ID and Ruleset ID - Two columns */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  <span className="font-medium">Rule ID</span>
                  <span className="text-gray-500"> (cprmv:id)</span>
                  <span className="text-red-500"> *</span>
                </label>
                <input
                  type="text"
                  value={rule.ruleId}
                  onChange={(e) => updateCPRMVRule(rule.id, 'ruleId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., onderdeel a."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  <span className="font-medium">Ruleset ID</span>
                  <span className="text-gray-500"> (cprmv:rulesetId)</span>
                  <span className="text-red-500"> *</span>
                </label>
                <input
                  type="text"
                  value={rule.rulesetId}
                  onChange={(e) => updateCPRMVRule(rule.id, 'rulesetId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., BWBR0015703"
                />
              </div>
            </div>

            {/* Definition - Full width */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                <span className="font-medium">Definition</span>
                <span className="text-gray-500"> (cprmv:definition)</span>
                <span className="text-red-500"> *</span>
              </label>
              <textarea
                value={rule.definition}
                onChange={(e) => updateCPRMVRule(rule.id, 'definition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Full text definition from legislation"
                rows={3}
              />
            </div>

            {/* Situation and Norm - Two columns */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  <span className="font-medium">Situation</span>
                  <span className="text-gray-500"> (cprmv:situatie)</span>
                  <span className="text-red-500"> *</span>
                </label>
                <input
                  type="text"
                  value={rule.situatie}
                  onChange={(e) => updateCPRMVRule(rule.id, 'situatie', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., een alleenstaande"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  <span className="font-medium">Norm</span>
                  <span className="text-gray-500"> (cprmv:norm)</span>
                  <span className="text-red-500"> *</span>
                </label>
                <input
                  type="text"
                  value={rule.norm}
                  onChange={(e) => updateCPRMVRule(rule.id, 'norm', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 337,98"
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Empty State */}
      {cprmvRules.length === 0 && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">
            No CPRMV rules yet. Import a JSON file or add rules manually.
          </p>
        </div>
      )}

      {/* Add Rule Button - Bottom, blue like Parameters tab */}
      <button
        onClick={addCPRMVRule}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-colors"
      >
        <Plus size={20} />
        Add Rule
      </button>
    </div>
  );
};

export default CPRMVTab;
