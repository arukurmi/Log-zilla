import React from 'react';

// The Log-zilla mark: three rising dorsal fins that double as a
// log-volume sparkline, cutting through a baseline "surface".
export default function ZillaMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="zilla-fin" x1="0" y1="40" x2="40" y2="0">
          <stop offset="0%" stopColor="var(--zl-accent-strong, #7c3aed)" />
          <stop offset="100%" stopColor="var(--zl-key, #38bdf8)" />
        </linearGradient>
      </defs>
      {/* dorsal fins, ascending */}
      <path
        d="M4 30 L9 20 L14 30 Z"
        fill="url(#zilla-fin)"
        opacity="0.55"
      />
      <path d="M13 30 L19.5 14 L26 30 Z" fill="url(#zilla-fin)" opacity="0.8" />
      <path d="M24 30 L31 6 L38 30 Z" fill="url(#zilla-fin)" />
      {/* waterline */}
      <rect
        x="2"
        y="31.5"
        width="36"
        height="2.5"
        rx="1.25"
        fill="var(--zl-accent, #8b5cf6)"
        opacity="0.7"
      />
    </svg>
  );
}
