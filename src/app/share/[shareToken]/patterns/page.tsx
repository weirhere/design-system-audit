'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useSharedAudit } from '@/hooks/use-shared-audit';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ClassificationBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

interface Pattern {
  id: string;
  auditId: string;
  sourceProduct: string;
  category: string;
  name: string;
  componentIds: string;
  responsiveBehavior: string | null;
  classification: string;
  classificationConfidence: number;
  classificationOverridden: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  navigation: 'Navigation',
  forms: 'Forms',
  'data-display': 'Data Display',
  feedback: 'Feedback',
};

export default function SharedPatternsPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { audit } = useSharedAudit(shareToken ?? null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!audit) return;
    const fetchPatterns = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/audits/${audit.id}/patterns?shareToken=${shareToken}`
        );
        if (!res.ok) throw new Error('Failed');
        setPatterns(await res.json());
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchPatterns();
  }, [audit, shareToken]);

  const products = useMemo(() => {
    return Array.from(new Set(patterns.map(p => p.sourceProduct)));
  }, [patterns]);

  const grouped = useMemo(() => {
    const categoryMap = new Map<string, Map<string, Pattern[]>>();
    for (const pat of patterns) {
      if (!categoryMap.has(pat.category)) categoryMap.set(pat.category, new Map());
      const nameMap = categoryMap.get(pat.category)!;
      if (!nameMap.has(pat.name)) nameMap.set(pat.name, []);
      nameMap.get(pat.name)!.push(pat);
    }

    return Array.from(categoryMap.entries()).map(([category, nameMap]) => ({
      category,
      label: CATEGORY_LABELS[category] ?? category,
      patterns: Array.from(nameMap.entries()).map(([name, items]) => ({
        name,
        items,
        productCount: new Set(items.map(i => i.sourceProduct)).size,
      })),
    }));
  }, [patterns]);

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

  if (patterns.length === 0) {
    return (
      <EmptyState
        title="No patterns detected"
        description="Patterns will appear here after crawling. They are detected via navigation structures, forms, data displays, and feedback elements."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          Pattern Analysis
          <span className="ml-2 text-sm font-normal text-slate-400">
            {patterns.length} patterns across {products.length} products
          </span>
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pattern Coverage Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-2 pr-4 text-left font-medium text-slate-500">Category</th>
                  <th className="pb-2 pr-4 text-left font-medium text-slate-500">Pattern</th>
                  {products.map(p => {
                    let hostname: string;
                    try { hostname = new URL(p).hostname.replace('www.', ''); } catch { hostname = p; }
                    return (
                      <th key={p} className="pb-2 px-2 text-center font-medium text-slate-500 text-xs">
                        {hostname}
                      </th>
                    );
                  })}
                  <th className="pb-2 text-left font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {grouped.flatMap(({ category, label, patterns: categoryPatterns }) =>
                  categoryPatterns.map((pat, idx) => (
                    <tr key={`${category}-${pat.name}`} className="border-b border-slate-100 last:border-0">
                      {idx === 0 ? (
                        <td className="py-2 pr-4 text-slate-700 font-medium align-top" rowSpan={categoryPatterns.length}>
                          {label}
                        </td>
                      ) : null}
                      <td className="py-2 pr-4">
                        <code className="text-xs rounded bg-slate-100 px-1.5 py-0.5">{pat.name}</code>
                      </td>
                      {products.map(p => {
                        const found = pat.items.find(i => i.sourceProduct === p);
                        return (
                          <td key={p} className="py-2 px-2 text-center">
                            {found ? (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">
                                ✓
                              </span>
                            ) : (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2">
                        {pat.productCount === products.length ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Consistent
                          </span>
                        ) : pat.productCount > products.length / 2 ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            Inconsistent
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {grouped.map(({ category, label, patterns: categoryPatterns }) => (
        <section key={category} className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">{label}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {categoryPatterns.map((pat) => (
              <Card key={pat.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      <code className="text-sm font-mono">{pat.name}</code>
                    </CardTitle>
                    <span className="text-xs text-slate-400">
                      {pat.productCount}/{products.length} products
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pat.items.map(item => {
                      let hostname: string;
                      try { hostname = new URL(item.sourceProduct).hostname.replace('www.', ''); } catch { hostname = item.sourceProduct; }
                      return (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{hostname}</span>
                          <ClassificationBadge classification={item.classification as any} />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
