import React from 'react';
import { StreamEvent } from '@/core/eventBuffer';

interface StreamRowProps {
  event: StreamEvent;
  expanded: boolean;
  onToggleExpand: () => void;
}

const StreamRow: React.FC<StreamRowProps> = ({
  event,
  expanded,
  onToggleExpand,
}) => {
  // Severity dot color
  const getLevelColor = (level?: string) => {
    if (!level) return 'bg-gray-500';

    switch (level.toLowerCase()) {
      case 'error':
        return 'bg-red-500';
      case 'warn':
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-sky-500';
      case 'debug':
        return 'bg-violet-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Millisecond-precision local time
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return (
        date.toLocaleTimeString() +
        '.' +
        date.getMilliseconds().toString().padStart(3, '0')
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      return timestamp;
    }
  };

  // Everything beyond the core columns shows in the expanded panel
  const detailKeys = Object.keys(event).filter(
    (key) => !['id', 'timestamp', 'message', 'level', 'service'].includes(key),
  );

  return (
    <div className="border-b border-[var(--zl-border)] transition-colors hover:bg-[var(--zl-surface)]">
      {/* Main row - always visible */}
      <div
        className="flex cursor-pointer items-start p-2"
        onClick={onToggleExpand}
      >
        <div className="mr-2 flex flex-shrink-0 items-center space-x-2">
          <div
            className={`h-2 w-2 rounded-full ${getLevelColor(event.level)}`}
          ></div>
          <div className="w-24 truncate text-xs text-[var(--zl-muted)]">
            {formatTimestamp(event.timestamp)}
          </div>
        </div>

        {event.service && (
          <div className="mr-2 max-w-48 min-w-24 flex-shrink-0 truncate rounded bg-[var(--zl-surface-2)] px-2 py-1 text-xs text-[var(--zl-text)]">
            <span className="font-semibold">{event.service}</span>
          </div>
        )}

        <div className="flex-grow font-mono text-sm break-all text-[var(--zl-text)]">
          {event.message}
        </div>

        <div className="ml-2 flex-shrink-0">
          <svg
            className={`h-4 w-4 transform text-[var(--zl-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && detailKeys.length > 0 && (
        <div className="border-t border-[var(--zl-border)] bg-[var(--zl-surface-2)] p-3 font-mono">
          <div className="grid grid-cols-1 gap-1">
            {detailKeys.map((key) => (
              <div key={key} className="flex">
                <span className="mr-2 text-xs text-[var(--zl-muted)]">
                  {key}:
                </span>
                <span className="text-xs break-all text-[var(--zl-text)]">
                  {typeof event[key] === 'object'
                    ? JSON.stringify(event[key], null, 2)
                    : String(event[key])}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamRow;
