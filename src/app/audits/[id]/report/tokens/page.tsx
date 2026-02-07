'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTokens } from '@/hooks/use-tokens';
import { useAudit } from '@/hooks/use-audit';
import { FilterBar } from '@/components/tokens/filter-bar';
import { TokenTable } from '@/components/tokens/token-table';
import { Card, CardContent } from '@/components/ui/card';
import type { TokenLayer } from '@/types/audit';
import type { Classification } from '@/types/classification';

export default function TokensPage() {
  const { id } = useParams<{ id: string }>();
  const { audit } = useAudit(id ?? null);

  const [layer, setLayer] = useState<TokenLayer | ''>('');
  const [classification, setClassification] = useState<Classification | ''>('');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');

  const { tokens, loading } = useTokens({
    auditId: id ?? null,
    layer: layer || undefined,
    classification: classification || undefined,
    sourceProduct: selectedProduct || undefined,
  });

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
