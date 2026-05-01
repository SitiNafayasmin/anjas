import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ThemeToggle } from './components/theme-toggle';

export const metadata: Metadata = {
  title: 'CodeLink — One API key for every AI model',
  description: 'OpenAI-compatible coding AI API gateway with fallback, quota, billing, and dashboard.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
