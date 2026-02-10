'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAudit } from '@/hooks/use-audit';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { UrlInputList } from '@/components/audit/url-input-list';
import { TOKEN_LAYERS, LAYER_LABELS } from '@/lib/constants';
import type { TokenLayer } from '@/types/audit';

export default function SetupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { audit, loading, refetch } = useAudit(id ?? null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editParentUrl, setEditParentUrl] = useState('');
  const [editProductUrls, setEditProductUrls] = useState<string[]>(['']);
  const [editMaxPages, setEditMaxPages] = useState(50);
  const [editViewports, setEditViewports] = useState('1440');
  const [editLayers, setEditLayers] = useState<TokenLayer[]>([...TOKEN_LAYERS]);

  const startEditing = () => {
    if (!audit) return;
    setEditName(audit.name);
    setEditParentUrl(audit.parentSystemUrl || '');
    setEditProductUrls(audit.productUrls.length > 0 ? [...audit.productUrls] : ['']);
    setEditMaxPages(audit.config.maxPagesPerProduct);
    setEditViewports(audit.config.viewports.join(', '));
    setEditLayers([...audit.config.extractLayers]);
    setError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError(null);
  };

  const toggleLayer = (layer: TokenLayer) => {
    setEditLayers((prev) =>
      prev.includes(layer)
        ? prev.filter((l) => l !== layer)
        : [...prev, layer]
    );
  };

  const handleSave = async () => {
    if (!audit) return;
    setError(null);

    const validUrls = editProductUrls.filter((url) => url.trim() !== '');
    if (!editName.trim()) {
      setError('Audit name is required.');
      return;
    }
    if (validUrls.length === 0) {
      setError('At least one product URL is required.');
      return;
    }
    if (editLayers.length === 0) {
      setError('At least one extract layer is required.');
      return;
    }

    const viewportNums = editViewports
      .split(',')
      .map((v) => parseInt(v.trim(), 10))
      .filter((v) => !isNaN(v) && v > 0);
    if (viewportNums.length === 0) {
      setError('At least one valid viewport width is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/audits/${audit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          parentSystemUrl: editParentUrl.trim() || null,
          productUrls: validUrls,
          config: {
            maxPagesPerProduct: editMaxPages,
            viewports: viewportNums,
            extractLayers: editLayers,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update audit');
      }

      await refetch();
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update audit');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!audit) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/audits/${audit.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete audit');
      router.push('/audits');
    } catch {
      setError('Failed to delete audit.');
      setDeleting(false);
      setShowDeleteConfirm(false);
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
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={startEditing}
              >
                Edit Setup
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Audit'}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {editing && audit.status !== 'draft' && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-800">
            Changing URLs or crawl settings will reset this audit to draft status. You&apos;ll need to re-crawl to generate updated results.
          </p>
        </div>
      )}

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
              {editing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g., Q1 2026 Design System Audit"
                />
              ) : (
                <p className="text-sm text-slate-900">{audit.name}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                Parent System URL
              </label>
              {editing ? (
                <Input
                  value={editParentUrl}
                  onChange={(e) => setEditParentUrl(e.target.value)}
                  placeholder="https://design-system.example.com"
                />
              ) : audit.parentSystemUrl ? (
                <a
                  href={/^https?:\/\//i.test(audit.parentSystemUrl) ? audit.parentSystemUrl : `https://${audit.parentSystemUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:underline"
                >
                  {audit.parentSystemUrl}
                </a>
              ) : (
                <p className="text-sm text-slate-400">Not specified</p>
              )}
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
            {editing ? (
              <UrlInputList urls={editProductUrls} onChange={setEditProductUrls} />
            ) : audit.productUrls.length === 0 ? (
              <p className="text-sm text-slate-400">No product URLs configured.</p>
            ) : (
              <ul className="space-y-2">
                {audit.productUrls.map((url, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-500">
                      {i + 1}
                    </span>
                    <a
                      href={/^https?:\/\//i.test(url) ? url : `https://${url}`}
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
            {editing ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                      Max Pages per Product
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={200}
                      value={editMaxPages}
                      onChange={(e) => setEditMaxPages(parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                      Viewports (px, comma-separated)
                    </label>
                    <Input
                      value={editViewports}
                      onChange={(e) => setEditViewports(e.target.value)}
                      placeholder="1440, 768, 375"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Extract Layers
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TOKEN_LAYERS.map((layer) => (
                      <button
                        key={layer}
                        type="button"
                        onClick={() => toggleLayer(layer)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                          editLayers.includes(layer)
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        {LAYER_LABELS[layer]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Audit"
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-medium text-slate-900">&ldquo;{audit.name}&rdquo;</span>? All crawl data, tokens, and reports will be permanently removed. This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Yes, Delete Audit'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
