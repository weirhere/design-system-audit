'use client';

import Link from 'next/link';
import { useAudits } from '@/hooks/use-audit';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatRelativeTime } from '@/lib/utils';

export default function AuditsPage() {
  const { audits, loading } = useAudits();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Audits</h1>
        <Link href="/audits/new">
          <Button>New Audit</Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-lg bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      ) : audits.length === 0 ? (
        <EmptyState
          title="No audits yet"
          description="Create your first design system audit to get started."
          action={
            <Link href="/audits/new">
              <Button>New Audit</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audits.map((audit) => (
            <Link key={audit.id} href={`/audits/${audit.id}/setup`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{audit.name}</CardTitle>
                    <StatusBadge status={audit.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>
                      {audit.productUrls.length}{' '}
                      {audit.productUrls.length === 1 ? 'product' : 'products'}
                    </span>
                    <span>{formatRelativeTime(audit.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
