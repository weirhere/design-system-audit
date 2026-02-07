'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ExtractedToken } from '@/types/token';
import type { TokenLayer } from '@/types/audit';

interface UseTokensOptions {
  auditId: string | null;
  layer?: TokenLayer;
  classification?: string;
  sourceProduct?: string;
}

export function useTokens({ auditId, layer, classification, sourceProduct }: UseTokensOptions) {
  const [tokens, setTokens] = useState<ExtractedToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!auditId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (layer) params.set('layer', layer);
      if (classification) params.set('classification', classification);
      if (sourceProduct) params.set('sourceProduct', sourceProduct);

      const qs = params.toString();
      const res = await fetch(`/api/audits/${auditId}/tokens${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch tokens');
      const data = await res.json();
      setTokens(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [auditId, layer, classification, sourceProduct]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return { tokens, loading, error, refetch: fetchTokens };
}
