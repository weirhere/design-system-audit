'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAudit } from '@/hooks/use-audit';
import { FilterBar } from '@/components/tokens/filter-bar';
import { ComparisonMatrix } from '@/components/matrix/comparison-matrix';
import { Card, CardContent } from '@/components/ui/card';
import type { MatrixRow } from '@/types/matrix';
import type { TokenLayer } from '@/types/audit';
import type { Classification } from '@/types/classification';

export default function MatrixPage() {
  const { id } = useParams<{ id: string }>();
  const { audit } = useAudit(id ?? null);

  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [layer, setLayer] = useState<TokenLayer | ''>('');
  const [classification, setClassification] = useState<Classification | ''>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetchMatrix = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/audits/${id}/matrix`);
        if (!res.ok) throw new Error('Failed to fetch matrix');
        const data = await res.json();
        setRows(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchMatrix();
  }, [id]);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (layer) {
      result = result.filter((r) => r.layer === layer);
    }

    if (classification) {
      result = result.filter((r) =>
        Object.values(r.productValues).some(
          (pv) => pv.classification === classification
        )
      );
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.property.toLowerCase().includes(q) ||
          r.canonicalValue.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rows, layer, classification, search]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Comparison Matrix</h2>

      <FilterBar
        layer={layer}
        onLayerChange={setLayer}
        classification={classification}
        onClassificationChange={setClassification}
        search={search}
        onSearchChange={setSearch}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 rounded bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <ComparisonMatrix
              rows={filteredRows}
              products={audit?.productUrls ?? []}
              globalFilter={search}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
