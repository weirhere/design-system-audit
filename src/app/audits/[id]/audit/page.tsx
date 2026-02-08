'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAudit } from '@/hooks/use-audit';
import { CrawlButton } from '@/components/audit/crawl-button';
import { CrawlProgress, initialCrawlState, type CrawlState } from '@/components/audit/crawl-progress';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LAYER_LABELS } from '@/lib/constants';
import type { TokenLayer } from '@/types/audit';
import type { TokenSummary } from '@/types/token';

function readCrawlStream(
  response: Response,
  onEvent: (event: { type: string; data: Record<string, unknown> }) => void
) {
  const body = response.body;
  if (!body) return;

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  async function read() {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            onEvent(JSON.parse(trimmed.slice(6)));
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err) {
      console.error('[readCrawlStream] error:', err);
    }
  }

  read();
}

export default function AuditPage() {
  const { id } = useParams<{ id: string }>();
  const { audit, loading, refetch } = useAudit(id ?? null);
  const [crawl, setCrawl] = useState<CrawlState>(initialCrawlState);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<TokenSummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const isCrawling = crawl.status === 'crawling' || audit?.status === 'crawling';

  useEffect(() => {
    if (
      audit &&
      (audit.status === 'crawled' ||
        audit.status === 'analyzing' ||
        audit.status === 'complete')
    ) {
      fetchSummaries();
    }
  }, [audit?.status]);

  const fetchSummaries = async () => {
    if (!id) return;
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/audits/${id}/tokens`);
      if (!res.ok) return;
      const tokens = await res.json();

      const grouped: Record<string, TokenSummary> = {};
      for (const token of tokens) {
        const layer = token.layer as TokenLayer;
        if (!grouped[layer]) {
          grouped[layer] = {
            layer,
            total: 0,
            unique: 0,
            inherit: 0,
            adapt: 0,
            extend: 0,
            unclassified: 0,
          };
        }
        grouped[layer].total += 1;
        grouped[layer][token.classification as keyof Omit<TokenSummary, 'layer' | 'total' | 'unique'>] += 1;
      }

      setSummaries(Object.values(grouped));
    } catch {
      // silently fail
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleEvent = useCallback((event: { type: string; data: Record<string, unknown> }) => {
    const data = event.data;
    switch (event.type) {
      case 'start':
        setCrawl(prev => ({
          ...prev,
          status: 'crawling',
          message: (data.message as string) || 'Starting crawl...',
        }));
        break;
      case 'progress':
        setCrawl(prev => ({
          ...prev,
          progress: (data.progress as number) || 0,
          message: (data.message as string) || '',
          jobs: data.jobs ? (data.jobs as CrawlState['jobs']) : prev.jobs,
        }));
        break;
      case 'job-complete':
        setCrawl(prev => ({
          ...prev,
          jobs: prev.jobs.map(j =>
            j.url === data.url ? { ...j, status: 'complete', progress: 1 } : j
          ),
        }));
        break;
      case 'error':
        setCrawl(prev => ({
          ...prev,
          status: 'error',
          message: (data.message as string) || 'Crawl failed',
        }));
        break;
      case 'complete':
        setCrawl({
          status: 'complete',
          message: 'Crawl complete',
          progress: 1,
          jobs: [],
        });
        refetchRef.current();
        fetchSummaries();
        setTimeout(() => setCrawl(initialCrawlState), 2000);
        break;
    }
  }, []);

  const handleStream = (response: Response) => {
    setError(null);
    setCrawl({ ...initialCrawlState, status: 'crawling', message: 'Connecting...' });
    readCrawlStream(response, handleEvent);
  };

  const handleCrawlError = (message: string) => {
    setError(message);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-slate-100 animate-pulse" />
        <div className="h-48 rounded-lg bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (!audit) {
    return (
      <p className="text-sm text-slate-500">Audit not found.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Crawl & Extract</h2>
        <CrawlButton
          auditId={audit.id}
          disabled={isCrawling}
          onStream={handleStream}
          onError={handleCrawlError}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {(isCrawling || crawl.status !== 'idle') && (
        <Card>
          <CardHeader>
            <CardTitle>Crawl Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <CrawlProgress state={crawl} />
          </CardContent>
        </Card>
      )}

      {summaries.length > 0 && !summaryLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Tokens Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                      Layer
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                      Total
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-emerald-600 uppercase bg-slate-50 border-b border-slate-200">
                      Inherit
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-amber-600 uppercase bg-slate-50 border-b border-slate-200">
                      Adapt
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-red-600 uppercase bg-slate-50 border-b border-slate-200">
                      Extend
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 uppercase bg-slate-50 border-b border-slate-200">
                      Unclassified
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s) => (
                    <tr key={s.layer} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-700 capitalize">
                        {LAYER_LABELS[s.layer]}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.total}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-600">
                        {s.inherit}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-600">
                        {s.adapt}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-600">
                        {s.extend}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                        {s.unclassified}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {summaryLoading && (
        <div className="h-48 rounded-lg bg-slate-100 animate-pulse" />
      )}
    </div>
  );
}
