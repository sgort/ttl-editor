import { ChevronDown, ChevronUp, History } from 'lucide-react';
import React, { useState } from 'react';

import changelogData from '../../data/changelog.json';
import roadmapData from '../../data/roadmap.json';

const borderColorMap = {
  green: 'border-green-500',
  emerald: 'border-emerald-500',
  blue: 'border-blue-500',
  purple: 'border-purple-500',
  indigo: 'border-indigo-500',
  yellow: 'border-yellow-500',
  red: 'border-red-500',
};

const statusBgColorMap = {
  green: 'bg-green-100 text-green-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
};

const iconColorMap = {
  emerald: 'text-emerald-600',
  green: 'text-green-600',
  blue: 'text-blue-600',
  purple: 'text-purple-600',
  indigo: 'text-indigo-600',
  yellow: 'text-yellow-600',
  red: 'text-red-600',
  gray: 'text-gray-600',
};

// Main ChangelogTab component with collapsible versions
export default function ChangelogTab() {
  // Track which versions are expanded (only first one by default)
  const [expandedVersions, setExpandedVersions] = useState(
    new Set(changelogData.versions.length > 0 ? [0] : [])
  );

  const toggleVersion = (index) => {
    setExpandedVersions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        {/* Title and GitLab Link Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <History className="text-blue-600" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Documentation & Changelog</h2>
              <p className="text-gray-600 text-sm mt-1">
                Complete history of features, improvements, and documentation
              </p>
            </div>
          </div>

          {/* GitLab Link */}
          <a
            href="https://git.open-regels.nl/showcases/ttl-editor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
            title="View on GitLab"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 0 0-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 0 0-.867 0L1.387 9.452.045 13.587a.924.924 0 0 0 .331 1.023L12 23.054l11.624-8.443a.92.92 0 0 0 .331-1.024" />
            </svg>
            <span className="text-sm font-medium">GitLab</span>
          </a>
        </div>

        {/* Documentation Links */}
        <div className="pt-4 border-t border-blue-200 text-left text-gray-700 text-sm">
          <p className="font-semibold text-gray-800 mb-2">Core Public Service Editor</p>
          <p className="mb-2">
            A RONL Initiative based on{' '}
            <a
              href="https://git.open-regels.nl/showcases/ttl-editor/-/blob/main/docs/NAMESPACE-PROPERTIES.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              Namespace Properties Reference
            </a>
          </p>
          <p>
            <a
              href="https://git.open-regels.nl/showcases/ttl-editor/-/blob/main/docs/FIELD-MAPPING-CPSV-AP-3.2.0.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              Field-to-Property Mapping: CPSV-AP 3.2.0
            </a>{' '}
            reflects the current implementation state for CPSV-AP 3.2.0 compliance
          </p>
        </div>
      </div>

      {/* Collapsible Version History */}
      <div className="space-y-4">
        {changelogData.versions.map((version, versionIndex) => {
          const isExpanded = expandedVersions.has(versionIndex);

          return (
            <div
              key={versionIndex}
              className={`border-l-4 ${borderColorMap[version.borderColor] || borderColorMap.blue} bg-white rounded-lg shadow-md overflow-hidden transition-all`}
            >
              {/* Clickable Header */}
              <button
                onClick={() => toggleVersion(versionIndex)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Version Info */}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-800">Version {version.version}</h3>
                    <p className="text-sm text-gray-600 mt-1">{version.date}</p>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBgColorMap[version.statusColor] || statusBgColorMap.blue}`}
                  >
                    {version.status}
                  </span>
                </div>

                {/* Expand/Collapse Icon */}
                <div className="ml-4 text-gray-400">
                  {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
              </button>

              {/* Expandable Content */}
              {isExpanded && (
                <div className="px-6 pb-6">
                  {/* Version Sections */}
                  {version.sections?.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="mb-6 last:mb-0">
                      <h4
                        className={`text-lg font-semibold mb-3 flex items-center gap-2 ${iconColorMap[section.iconColor] || iconColorMap.blue}`}
                      >
                        <span>{section.icon}</span>
                        {section.title}
                      </h4>
                      <ul className="space-y-2 ml-8">
                        {section.items?.map((item, itemIndex) => (
                          <li key={itemIndex} className="text-gray-700 flex items-start gap-2">
                            <span className="text-gray-400 mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Future Roadmap */}
      {roadmapData?.planned && roadmapData.planned.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            🔮 Future Roadmap
          </h3>

          {/* Completed Features */}
          {roadmapData?.completed && roadmapData.completed.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-green-600">✅</span> Recently Completed
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {roadmapData.completed.map((item, index) => (
                  <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold text-gray-800 text-sm">{item.title}</h5>
                          <span className="text-xs text-green-700 font-medium">{item.version}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Planned Features by Phase */}
          <h4 className="text-lg font-semibold text-gray-700 mb-3">📋 Planned Features</h4>

          {/* Group by phase */}
          {['Phase B', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', 'Phase 6'].map((phase) => {
            const phaseItems = roadmapData.planned.filter((item) => item.phase === phase);
            if (phaseItems.length === 0) return null;

            // Get phase description from notes
            const phaseDescription = roadmapData?.notes?.phases?.[phase];

            return (
              <div key={phase} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <h5 className="text-md font-semibold text-purple-700">{phase}</h5>
                  {phaseDescription && (
                    <span className="text-xs text-purple-600 italic">({phaseDescription})</span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {phaseItems.map((item, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-3 shadow-sm border border-gray-200"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl flex-shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h6 className="font-semibold text-gray-800 text-sm">{item.title}</h6>
                            <div className="flex gap-1 flex-shrink-0">
                              <span
                                className={`text-xs px-2 py-0.5 rounded font-medium ${
                                  item.priority === 'High'
                                    ? 'bg-red-100 text-red-700'
                                    : item.priority === 'Medium'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {item.priority}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded font-medium ${
                                  item.effort === 'Very High' || item.effort === 'High'
                                    ? 'bg-orange-100 text-orange-700'
                                    : item.effort === 'Medium'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {item.effort}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Roadmap Notes */}
          {roadmapData?.notes?.general && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Note:</span> {roadmapData.notes.general}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
