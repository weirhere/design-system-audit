'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

interface ShareButtonProps {
  auditId: string;
  shareToken: string | null | undefined;
  isPublic: boolean | undefined;
  onUpdate: () => void;
}

export function ShareButton({ auditId, shareToken, isPublic, onUpdate }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : null;

  const generateLink = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/share`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate link');
      onUpdate();
    } finally {
      setLoading(false);
    }
  }, [auditId, onUpdate]);

  const disableSharing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/share`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disable sharing');
      onUpdate();
    } finally {
      setLoading(false);
    }
  }, [auditId, onUpdate]);

  const regenerateLink = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/share`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to regenerate link');
      onUpdate();
    } finally {
      setLoading(false);
    }
  }, [auditId, onUpdate]);

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        Share
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Share Report">
        {isPublic && shareToken ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Anyone with this link can view the report (read-only).
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl ?? ''}
                className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none"
              />
              <Button size="sm" onClick={copyLink} disabled={loading}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={regenerateLink}
                disabled={loading}
              >
                Regenerate Link
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={disableSharing}
                disabled={loading}
              >
                Disable Sharing
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Generate a public link to share this report with stakeholders.
              They will have read-only access to all report tabs.
            </p>
            <Button onClick={generateLink} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Link'}
            </Button>
          </div>
        )}
      </Dialog>
    </>
  );
}
