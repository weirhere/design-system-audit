'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Audit } from '@/types/audit';

export function useAudit(auditId: string | null) {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    if (!auditId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/audits/${auditId}`);
      if (!res.ok) throw new Error('Failed to fetch audit');
      const data = await res.json();
      setAudit(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  return { audit, loading, error, refetch: fetchAudit };
}

export function useAudits() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/audits');
      if (!res.ok) throw new Error('Failed to fetch audits');
      const data = await res.json();
      setAudits(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  return { audits, loading, error, refetch: fetchAudits };
}
