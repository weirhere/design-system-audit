'use client';

import { StatusBadge } from '@/components/ui/badge';

interface CrawlJob {
  url: string;
  status: string;
  progress: number;
  error?: string;
  pageCount?: number;
}

export interface CrawlState {
  status: string;
  progress: number;
  message: string;
  jobs: CrawlJob[];
}

export const initialCrawlState: CrawlState = {
  status: 'idle',
  progress: 0,
  message: '',
  jobs: [],
};

interface CrawlProgressProps {
  state: CrawlState;
}

export function CrawlProgress({ state }: CrawlProgressProps) {
  const { status, progress, message, jobs } = state;

  if (status === 'idle') return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-sm text-slate-600">{message}</span>
        </div>
        <span className="text-sm font-medium text-slate-700">
          {Math.round(progress * 100)}%
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
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
