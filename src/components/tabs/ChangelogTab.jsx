import { History } from 'lucide-react';
import React from 'react';

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

// Main ChangelogTab component
export default function ChangelogTab() {
  return (
    <div className="space-y-6">
      {/* Header Box with Everything */}
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
              NAMESPACE-PROPERTIES.md
            </a>
          </p>
          <p>
            <a
              href="https://git.open-regels.nl/showcases/ttl-editor/-/blob/main/docs/FIELD-MAPPING-CPSV-AP-3.2.0.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              FIELD-MAPPING-CPSV-AP-3.2.0.md
            </a>{' '}
            reflects the current implementation state for CPSV-AP 3.2.0 compliance
          </p>
        </div>
      </div>

      {/* Version History */}
      <div className="space-y-6">
        {changelogData.versions.map((version, versionIndex) => (
          <div
            key={versionIndex}
            className={`border-l-4 ${borderColorMap[version.borderColor] || borderColorMap.blue} bg-white rounded-lg shadow-md p-6`}
          >
            {/* Version Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Version {version.version}</h3>
                <p className="text-sm text-gray-600">{version.date}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBgColorMap[version.statusColor] || statusBgColorMap.blue}`}
              >
                {version.status}
              </span>
            </div>

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
        ))}
      </div>

      {/* Future Roadmap - unchanged */}
      {roadmapData?.items && roadmapData.items.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
          {/* Future Roadmap */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              🔮 Future Roadmap
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roadmapData.items.map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">{item.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
