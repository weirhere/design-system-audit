'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface CrawlButtonProps {
  auditId: string;
  disabled?: boolean;
  onStream?: (response: Response) => void;
  onError?: (message: string) => void;
}

export function CrawlButton({ auditId, disabled, onStream, onError }: CrawlButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/crawl`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error || `Server returned ${res.status}`;
        onError?.(message);
        return;
      }
      onStream?.(res);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Failed to start crawl');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={disabled || loading}>
      {loading ? (
        <>
          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          Starting...
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 2l10 6-10 6V2z" fill="currentColor" />
          </svg>
          Start Crawl
        </>
      )}
    </Button>
  );
}
