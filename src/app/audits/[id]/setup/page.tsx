'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAudit } from '@/hooks/use-audit';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';

export default function SetupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { audit, loading } = useAudit(id ?? null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!audit) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${audit.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/audits/${audit.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete audit');
      router.push('/audits');
    } catch {
      alert('Failed to delete audit.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-slate-100 animate-pulse" />
        <div className="h-64 rounded-lg bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (!audit) {
    return (
      <p className="text-sm text-slate-500">Audit not found.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-900">{audit.name}</h2>
          <StatusBadge status={audit.status} />
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Delete Audit'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                Audit Name
              </label>
              <p className="text-sm text-slate-900">{audit.name}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                Parent System URL
              </label>
              <p className="text-sm text-slate-900">
                {audit.parentSystemUrl || (
                  <span className="text-slate-400">Not specified</span>
                )}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                Status
              </label>
              <StatusBadge status={audit.status} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product URLs</CardTitle>
          </CardHeader>
          <CardContent>
            {audit.productUrls.length === 0 ? (
              <p className="text-sm text-slate-400">No product URLs configured.</p>
            ) : (
              <ul className="space-y-2">
                {audit.productUrls.map((url, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-500">
                      {i + 1}
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:underline truncate"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Crawl Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Max Pages per Product
                </label>
                <p className="text-sm text-slate-900">
                  {audit.config.maxPagesPerProduct}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Viewports
                </label>
                <p className="text-sm text-slate-900">
                  {audit.config.viewports.join(', ')}px
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Extract Layers
                </label>
                <p className="text-sm text-slate-900 capitalize">
                  {audit.config.extractLayers.join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
