'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Overview', segment: '' },
  { label: 'Tokens', segment: '/tokens' },
  { label: 'Matrix', segment: '/matrix' },
  { label: 'Components', segment: '/components' },
  { label: 'Patterns', segment: '/patterns' },
  { label: 'Roadmap', segment: '/roadmap' },
  { label: 'Export', segment: '/export' },
];

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const basePath = `/audits/${id}/report`;

  return (
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
  );
}
