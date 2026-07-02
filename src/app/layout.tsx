import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import ThemeProvider from '@/ui/ThemeProvider';
import './globals.css';

const grotesk = Space_Grotesk({
  variable: '--font-grotesk',
  subsets: ['latin'],
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Log-zilla — Tame your logs',
  description:
    'Log-zilla is a real-time log console for everything running on your machine. Pipe any process into it and watch the stream.',
};

// Applies the persisted theme before first paint so there is no flash
const themeBootScript = `(function(){try{var t=localStorage.getItem('logzilla-theme');document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body
        className={`${grotesk.variable} ${jetbrains.variable} bg-[var(--zl-bg)] text-sm text-[var(--zl-text)] antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
