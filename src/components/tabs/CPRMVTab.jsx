import { AlertCircle, Database, FileText, FileUp, Plus, Trash2 } from 'lucide-react';
import React from 'react';

import exampleCPRMVData from '../../data/cprmv-example.json';

const CPRMVTab = ({
  cprmvRules,
  addCPRMVRule,
  removeCPRMVRule,
  updateCPRMVRule,
  handleImportJSON,
  setCprmvRules,
  legalResource,
}) => {
  // Function to load example data
  const loadExampleData = () => {
    // Map all example rules and set them directly
    const mappedRules = exampleCPRMVData.map((rule, index) => ({
      id: Date.now() + index,
      ruleId: rule['https://cprmv.open-regels.nl/0.3.0/id'] || '',
      rulesetId: rule.rulesetid || '',
      definition: rule['https://cprmv.open-regels.nl/0.3.0/definition'] || '',
      situatie: rule.situatie || '',
      norm: rule.norm || '',
      ruleIdPath: rule.rule_id_path || '',
    }));

    setCprmvRules(mappedRules);
  };

  return (
    <div className="space-y-4">
      {/* Import JSON Button */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={loadExampleData}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer shadow-md transition-colors"
        >
          <Database size={20} />
          Load Example
        </button>
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

      {/* RPP Architecture Banner */}
      <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <FileText className="w-5 h-5 text-purple-600 mt-0.5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-purple-900">Norms & Standards (Policy)</h3>
              <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full font-medium">
                RPP Layer: Policy
              </span>
            </div>
            <p className="text-sm text-purple-700 leading-relaxed mb-3">
              Normative values derived directly from laws and regulations (CPRMV vocabulary). These
              policies are traceable to authoritative legal sources and remain stable across
              implementations. Changes require legal amendments.
            </p>
            <p className="text-xs text-purple-600 mb-3">
              <strong>RPP Pattern:</strong> Legislation - Policy - Rules - Parameters
            </p>

            <div className="border-t border-purple-200 my-3"></div>

            <div className="text-sm text-purple-700">
              <p className="mb-2">
                CPRMV rules are extracted using the experimental{' '}
                <a
                  href="https://cprmv.open-regels.nl/docs#/default/rules_rules__rule_id_path__get"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-800 underline font-medium"
                >
                  CPRMV Rules API
                </a>{' '}
                from Dutch legislation. Examples: benefit amounts, income thresholds, percentages
                defined in social assistance laws.
              </p>
              <p className="text-xs text-purple-600">
                Quick start: Use{' '}
                <button
                  onClick={loadExampleData}
                  className="text-purple-600 hover:text-purple-800 underline font-semibold"
                >
                  example data
                </button>{' '}
                or import JSON.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Resource Link Info Banner - NEW */}
      {legalResource.bwbId &&
        (() => {
          // Determine the URL for the legal resource
          const identifier = legalResource.bwbId;
          const isFullUri = identifier.startsWith('http://') || identifier.startsWith('https://');

          let legalUrl;
          if (isFullUri) {
            legalUrl = identifier;
          } else {
            const isBWB = /BWB[A-Z]?\d+/i.test(identifier);
            const isCVDR = /CVDR\d+/i.test(identifier);

            if (isBWB) {
              legalUrl = `https://wetten.overheid.nl/${identifier}`;
            } else if (isCVDR) {
              legalUrl = `https://lokaleregelgeving.overheid.nl/${identifier}/1`;
            } else {
              legalUrl = `https://wetten.overheid.nl/${identifier}`;
            }
          }

          // If version exists, append it to create versioned URI
          if (legalResource.version) {
            legalUrl = `${legalUrl}/${legalResource.version}`;
          }

          return (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                </div>
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Legal Source:</strong> All rules will automatically link to{' '}
                    <a
                      href={legalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono underline hover:text-blue-600 transition-colors"
                    >
                      {legalUrl}
                    </a>{' '}
                    via <span className="font-mono">cprmv:implements</span>
                  </p>
                  {legalResource.title && (
                    <p className="text-xs text-blue-700 mt-1">{legalResource.title}</p>
                  )}
                  {legalResource.version && (
                    <p className="text-xs text-blue-700 mt-1">
                      📅 Version: {legalResource.version}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {!legalResource.bwbId && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            </div>
            <div>
              <p className="text-sm text-yellow-800">
                <strong>No legal resource defined.</strong> Add a legal resource in the Legal tab to
                automatically link it to these rules via{' '}
                <span className="font-mono">cprmv:implements</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      {cprmvRules.map((rule, index) => (
        <div key={rule.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
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

          <div className="space-y-3">
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

      {/* Add Rule Button */}
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
