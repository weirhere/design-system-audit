'use client';

import { useSSE, type SSEEvent } from '@/hooks/use-sse';
import { useState, useCallback } from 'react';
import { StatusBadge } from '@/components/ui/badge';

interface CrawlJob {
  url: string;
  status: string;
  progress: number;
  error?: string;
  pageCount?: number;
}

interface CrawlProgressProps {
  auditId: string;
  isActive: boolean;
  onComplete?: () => void;
}

export function CrawlProgress({ auditId, isActive, onComplete }: CrawlProgressProps) {
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [status, setStatus] = useState<string>('idle');
  const [message, setMessage] = useState<string>('');

  const handleEvent = useCallback((event: SSEEvent) => {
    const data = event.data;
    switch (event.type) {
      case 'start':
        setStatus('crawling');
        setMessage(data.message as string || 'Starting crawl...');
        break;
      case 'progress':
        setOverallProgress(data.progress as number || 0);
        setMessage(data.message as string || '');
        if (data.jobs) {
          setJobs(data.jobs as CrawlJob[]);
        }
        break;
      case 'job-complete':
        setJobs((prev) => prev.map((j) =>
          j.url === data.url ? { ...j, status: 'complete', progress: 1 } : j
        ));
        break;
      case 'error':
        setStatus('error');
        setMessage(data.message as string || 'Crawl failed');
        break;
      case 'complete':
        setStatus('complete');
        setMessage('Crawl complete');
        setOverallProgress(1);
        onComplete?.();
        break;
    }
  }, [onComplete]);

  useSSE({
    url: isActive ? `/api/audits/${auditId}/crawl` : null,
    onEvent: handleEvent,
  });

  if (status === 'idle' && !isActive) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-sm text-slate-600">{message}</span>
        </div>
        <span className="text-sm font-medium text-slate-700">
          {Math.round(overallProgress * 100)}%
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${overallProgress * 100}%` }}
        />
      </div>

      {/* Per-job progress */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.url} className="flex items-center gap-3 text-sm">
              <div className="w-3 h-3 shrink-0">
                {job.status === 'complete' ? (
                  <svg viewBox="0 0 12 12" fill="none" className="text-emerald-500">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : job.status === 'error' ? (
                  <svg viewBox="0 0 12 12" fill="none" className="text-red-500">
                    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ) : job.status === 'running' ? (
                  <div className="w-3 h-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-slate-200" />
                )}
              </div>
              <span className="truncate flex-1 text-slate-600">{job.url}</span>
              {job.pageCount !== undefined && job.pageCount > 0 && (
                <span className="text-slate-400 shrink-0">{job.pageCount} pages</span>
              )}
              {job.error && (
                <span className="text-red-500 text-xs shrink-0">{job.error}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
