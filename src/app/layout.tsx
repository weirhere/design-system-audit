import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import AuthSessionProvider from '@/components/auth/session-provider';
import UserMenu from '@/components/auth/user-menu';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Design System Audit',
  description: 'Cross-product design system audit and comparison tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthSessionProvider>
          <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
              <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
                <a href="/audits" className="flex items-center gap-2 font-semibold text-slate-900">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-indigo-600">
                    <rect x="1" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="11" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="1" y="11" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="11" y="11" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
                  </svg>
                  Design Audit
                </a>
                <UserMenu />
              </div>
            </header>
            <main className="mx-auto max-w-7xl px-6 py-8">
              {children}
            </main>
          </div>
          <Analytics />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
