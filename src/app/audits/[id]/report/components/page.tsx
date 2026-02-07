'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ClassificationBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

interface Component {
  id: string;
  auditId: string;
  sourceProduct: string;
  name: string;
  selector: string;
  variants: string;
  states: string;
  tokenIds: string;
  htmlSnapshot: string;
  frequency: number;
  classification: string;
  classificationConfidence: number;
  classificationOverridden: boolean;
}

export default function ComponentsPage() {
  const { id } = useParams<{ id: string }>();
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!id) return;
    const fetchComponents = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/audits/${id}/components`);
        if (!res.ok) throw new Error('Failed');
        setComponents(await res.json());
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchComponents();
  }, [id]);

  // Group components by name across products
  const grouped = useMemo(() => {
    const map = new Map<string, Component[]>();
    for (const comp of components) {
      if (!map.has(comp.name)) map.set(comp.name, []);
      map.get(comp.name)!.push(comp);
    }
    return Array.from(map.entries())
      .map(([name, items]) => ({ name, items, totalFreq: items.reduce((s, c) => s + c.frequency, 0) }))
      .sort((a, b) => b.totalFreq - a.totalFreq);
  }, [components]);

  const filtered = useMemo(() => {
    if (filter === 'all') return grouped;
    return grouped.filter(g => g.items.some(c => c.classification === filter));
  }, [grouped, filter]);

  // Get unique products
  const products = useMemo(() => {
    return Array.from(new Set(components.map(c => c.sourceProduct)));
  }, [components]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-slate-100 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <EmptyState
        title="No components detected"
        description="Components will appear here after crawling. They are detected via ARIA roles and semantic HTML elements."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          Component Catalog
          <span className="ml-2 text-sm font-normal text-slate-400">
            {grouped.length} unique components across {products.length} products
          </span>
        </h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Classifications</option>
          <option value="inherit">Inherit</option>
          <option value="adapt">Adapt</option>
          <option value="extend">Extend</option>
          <option value="unclassified">Unclassified</option>
        </select>
      </div>

      <div className="space-y-4">
        {filtered.map(({ name, items, totalFreq }) => (
          <Card key={name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <code className="rounded bg-slate-100 px-2 py-0.5 text-sm font-mono">
                    {name}
                  </code>
                  <span className="text-sm font-normal text-slate-400">
                    {totalFreq} instance{totalFreq !== 1 ? 's' : ''}
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-2 pr-4 text-left font-medium text-slate-500">Product</th>
                      <th className="pb-2 pr-4 text-left font-medium text-slate-500">Selector</th>
                      <th className="pb-2 pr-4 text-right font-medium text-slate-500">Frequency</th>
                      <th className="pb-2 text-left font-medium text-slate-500">Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((comp) => {
                      let hostname: string;
                      try {
                        hostname = new URL(comp.sourceProduct).hostname.replace('www.', '');
                      } catch {
                        hostname = comp.sourceProduct;
                      }
                      return (
                        <tr key={comp.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 pr-4 text-slate-700">{hostname}</td>
                          <td className="py-2 pr-4">
                            <code className="text-xs text-slate-500">{comp.selector}</code>
                          </td>
                          <td className="py-2 pr-4 text-right text-slate-700">{comp.frequency}</td>
                          <td className="py-2">
                            <ClassificationBadge classification={comp.classification as any} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {items[0]?.htmlSnapshot && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600">
                    View HTML snapshot
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-600">
                    {items[0].htmlSnapshot}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
