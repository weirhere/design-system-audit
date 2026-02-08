'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSharedAudit } from '@/hooks/use-shared-audit';
import { FilterBar } from '@/components/tokens/filter-bar';
import { TokenTable } from '@/components/tokens/token-table';
import { Card, CardContent } from '@/components/ui/card';
import type { ExtractedToken } from '@/types/token';
import type { TokenLayer } from '@/types/audit';
import type { Classification } from '@/types/classification';

export default function SharedTokensPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { audit } = useSharedAudit(shareToken ?? null);

  const [layer, setLayer] = useState<TokenLayer | ''>('');
  const [classification, setClassification] = useState<Classification | ''>('');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [tokens, setTokens] = useState<ExtractedToken[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTokens = useCallback(async () => {
    if (!audit) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ shareToken: shareToken! });
      if (layer) params.set('layer', layer);
      if (classification) params.set('classification', classification);
      if (selectedProduct) params.set('sourceProduct', selectedProduct);

      const res = await fetch(`/api/audits/${audit.id}/tokens?${params}`);
      if (!res.ok) throw new Error('Failed');
      setTokens(await res.json());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [audit, shareToken, layer, classification, selectedProduct]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Token Comparison</h2>

      <FilterBar
        layer={layer}
        onLayerChange={setLayer}
        classification={classification}
        onClassificationChange={setClassification}
        search={search}
        onSearchChange={setSearch}
        products={audit?.productUrls}
        selectedProduct={selectedProduct}
        onProductChange={setSelectedProduct}
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
            <TokenTable tokens={tokens} globalFilter={search} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
