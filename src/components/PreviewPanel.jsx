import { Check, Copy } from 'lucide-react';
import React from 'react';

/**
 * PreviewPanel Component
 *
 * Displays live TTL preview in a side panel that updates in real-time as the user edits.
 * Compact design optimized for split-screen layout.
 *
 * @param {string} ttlContent - The generated TTL content to display
 */
const PreviewPanel = ({ ttlContent }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(ttlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 text-white border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Live TTL Preview</span>
          <span className="text-xs text-gray-400">Updates automatically</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check size={14} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy
            </>
          )}
        </button>
      </div>

      {/* TTL Content */}
      <div className="flex-1 overflow-auto bg-gray-900">
        <pre className="text-xs leading-relaxed text-green-400 bg-gray-900 p-4 min-h-full font-mono whitespace-pre-wrap break-words">
          {ttlContent || '// No content yet - start filling in the form fields'}
        </pre>
      </div>

      {/* Footer with line count */}
      <div className="px-4 py-2 bg-gray-800 text-gray-400 text-xs border-t border-gray-700">
        {ttlContent ? `${ttlContent.split('\n').length} lines` : 'Ready'}
      </div>
    </div>
  );
};

export default PreviewPanel;
