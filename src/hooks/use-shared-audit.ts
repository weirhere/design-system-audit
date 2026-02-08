'use client';

import { useState, useEffect } from 'react';

interface SharedAudit {
  id: string;
  name: string;
  status: string;
  shareToken: string;
  productUrls: string[];
  createdAt: string;
  updatedAt: string;
  parentSystemUrl: string | null;
}

export function useSharedAudit(shareToken: string | null) {
  const [audit, setAudit] = useState<SharedAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!shareToken) return;
    setLoading(true);
    fetch(`/api/share/${shareToken}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        setAudit(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [shareToken]);

  return { audit, loading, error };
}
