'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Tab {
  label: string;
  href: string;
}

interface TabsProps {
  tabs: Tab[];
  className?: string;
}

export function Tabs({ tabs, className }: TabsProps) {
  const pathname = usePathname();

  return (
    <nav className={cn('flex gap-1 border-b border-slate-200', className)}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-indigo-600" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
