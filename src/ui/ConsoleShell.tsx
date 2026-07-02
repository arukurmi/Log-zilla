'use client';

import dynamic from 'next/dynamic';

// The console uses browser-only APIs, so it must skip SSR entirely
const StreamConsole = dynamic(() => import('./StreamConsole'), {
  ssr: false,
});

export default function ConsoleShell() {
  return <StreamConsole />;
}
