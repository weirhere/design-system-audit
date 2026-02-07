'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UrlInputList } from '@/components/audit/url-input-list';

export default function NewAuditPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [parentSystemUrl, setParentSystemUrl] = useState('');
  const [productUrls, setProductUrls] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validUrls = productUrls.filter((url) => url.trim() !== '');
    if (!name.trim()) {
      setError('Audit name is required.');
      return;
    }
    if (validUrls.length === 0) {
      setError('At least one product URL is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          parentSystemUrl: parentSystemUrl.trim() || undefined,
          productUrls: validUrls,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create audit');
      }

      const audit = await res.json();
      router.push(`/audits/${audit.id}/setup`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create audit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">New Audit</h1>

      <Card>
        <CardHeader>
          <CardTitle>Audit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-700"
              >
                Audit Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q1 2026 Design System Audit"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="parentSystemUrl"
                className="block text-sm font-medium text-slate-700"
              >
                Parent Design System URL{' '}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Input
                id="parentSystemUrl"
                type="url"
                value={parentSystemUrl}
                onChange={(e) => setParentSystemUrl(e.target.value)}
                placeholder="https://design-system.example.com"
              />
            </div>

            <UrlInputList urls={productUrls} onChange={setProductUrls} />

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Audit'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
