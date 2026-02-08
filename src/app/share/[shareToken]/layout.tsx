'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SharedAudit {
  id: string;
  name: string;
  status: string;
  shareToken: string;
  productUrls: string[];
}

const navItems = [
  { label: 'Overview', segment: '' },
  { label: 'Tokens', segment: '/tokens' },
  { label: 'Matrix', segment: '/matrix' },
  { label: 'Components', segment: '/components' },
  { label: 'Patterns', segment: '/patterns' },
  { label: 'Roadmap', segment: '/roadmap' },
];

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { shareToken } = useParams<{ shareToken: string }>();
  const pathname = usePathname();
  const basePath = `/share/${shareToken}`;

  const [audit, setAudit] = useState<SharedAudit | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!shareToken) return;
    fetch(`/api/share/${shareToken}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setAudit)
      .catch(() => setError(true));
  }, [shareToken]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Report Not Found</h1>
          <p className="mt-2 text-sm text-slate-500">
            This shared report link is invalid or sharing has been disabled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-900">
              {audit?.name ?? 'Loading...'}
            </span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              Shared Report
            </span>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex gap-6">
          <nav className="w-48 shrink-0">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const href = `${basePath}${item.segment}`;
                const isActive =
                  item.segment === ''
                    ? pathname === basePath
                    : pathname === href || pathname.startsWith(href + '/');

                return (
                  <li key={item.segment}>
                    <Link
                      href={href}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
