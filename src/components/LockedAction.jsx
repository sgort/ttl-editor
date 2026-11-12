import { Lock } from 'lucide-react';

import { useLockedAction } from '../hooks/useAuth';

/**
 * A button for an action that changes shared state (#163 in
 * linked-data-explorer). Signed out, or signed in without lde-author, it is
 * disabled with a lock icon and a hint beside it; otherwise it is the normal
 * button.
 *
 * @param {{ verb: string, onClick?: () => void, disabled?: boolean,
 *   className?: string, title?: string, children: import('react').ReactNode }} props
 */
export default function LockedAction({ verb, onClick, disabled, className, title, children }) {
  const { locked, hint } = useLockedAction(verb);

  if (!locked) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={className}
        title={title}
      >
        {children}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled
        aria-disabled="true"
        className={`${className ?? ''} opacity-50 cursor-not-allowed`.trim()}
        title={hint}
      >
        <Lock size={16} aria-hidden="true" data-testid="lock-icon" />
        {children}
      </button>
      <span className="text-xs text-gray-500">{hint}</span>
    </span>
  );
}
