import React from "react";
import { History } from "lucide-react";
import changelogData from "../../data/changelog.json";
import roadmapData from "../../data/roadmap.json";

// Color mapping for Tailwind classes
const statusColors = {
  emerald: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-500",
  },
  green: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-500",
  },
  blue: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-500",
  },
  purple: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-500",
  },
  indigo: {
    bg: "bg-indigo-100",
    text: "text-indigo-800",
    border: "border-indigo-500",
  },
  gray: {
    bg: "bg-gray-200",
    text: "text-gray-700",
    border: "border-gray-400",
  },
};

const iconColors = {
  red: "text-red-600",
  blue: "text-blue-600",
  green: "text-green-600",
  emerald: "text-emerald-600",
  purple: "text-purple-600",
  indigo: "text-indigo-600",
  yellow: "text-yellow-600",
  gray: "text-gray-600",
};

// Version card component
function VersionCard({ version, status, statusColor, borderColor, date, sections }) {
  const colors = statusColors[statusColor] || statusColors.gray;
  const borderClass = statusColors[borderColor]?.border || "border-gray-400";

  return (
    <div className={`border-l-4 ${borderClass} bg-white rounded-lg shadow-sm p-6`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-gray-800">Version {version}</h3>
        <span className={`px-3 py-1 ${colors.bg} ${colors.text} text-sm font-semibold rounded-full`}>
          {status}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-4">Released: {date}</p>

      <div className="space-y-4">
        {sections.map((section, idx) => (
          <SectionBlock key={idx} {...section} />
        ))}
      </div>
    </div>
  );
}

// Section within a version
function SectionBlock({ title, icon, iconColor, items }) {
  const colorClass = iconColors[iconColor] || "text-gray-600";

  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
        <span className={colorClass}>{icon}</span> {title}
      </h4>
      <ul className="list-disc list-inside space-y-1 text-gray-600 ml-6">
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// Roadmap item
function RoadmapItem({ icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-400 mt-1">{icon}</span>
      <div>
        <h4 className="font-semibold text-gray-700">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

// Main ChangelogTab component
export default function ChangelogTab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <History className="text-blue-600" size={28} />
          <h2 className="text-2xl font-bold text-gray-800">
            Enhancement Changelog
          </h2>
        </div>
        <p className="text-sm text-gray-600">
          Complete history of features and improvements to the Public Service
          TTL Editor
        </p>
      </div>

      {/* Version Cards */}
      {changelogData.map((versionData) => (
        <VersionCard key={versionData.version} {...versionData} />
      ))}

      {/* Roadmap Section */}
      <div className="border-l-4 border-gray-400 bg-gray-50 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-800">Future Enhancements</h3>
          <span className="px-3 py-1 bg-gray-200 text-gray-700 text-sm font-semibold rounded-full">
            Roadmap
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4">Planned features</p>

        <div className="space-y-3">
          {roadmapData.map((item, idx) => (
            <RoadmapItem key={idx} {...item} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm pt-6 border-t">
        <p>Part of the RONL (Regels Overheid Nederland) initiative</p>
        <p className="mt-1">
          For detailed documentation, see{" "}
          <a
            href="https://git.open-regels.nl/showcases/aow/-/blob/main/NAMESPACE-PROPERTIES.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            NAMESPACE-PROPERTIES.md
          </a>
        </p>
      </div>
    </div>
  );
}
