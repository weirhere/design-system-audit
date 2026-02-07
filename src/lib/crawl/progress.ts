import { EventEmitter } from 'events';

export interface CrawlProgressPayload {
  auditId: string;
  jobId?: string;
  url?: string;
  progress: number;
  message: string;
  timestamp: string;
}

export interface CrawlProgressEvents {
  start: [payload: CrawlProgressPayload];
  progress: [payload: CrawlProgressPayload];
  'page-complete': [payload: CrawlProgressPayload];
  'job-complete': [payload: CrawlProgressPayload];
  error: [payload: CrawlProgressPayload];
  complete: [payload: CrawlProgressPayload];
}

export default class CrawlProgress extends EventEmitter {
  private auditId: string;

  constructor(auditId: string) {
    super();
    this.auditId = auditId;
  }

  private buildPayload(
    overrides: Partial<CrawlProgressPayload> = {}
  ): CrawlProgressPayload {
    return {
      auditId: this.auditId,
      progress: 0,
      message: '',
      timestamp: new Date().toISOString(),
      ...overrides,
    };
  }

  emitStart(message: string): void {
    this.emit('start', this.buildPayload({ progress: 0, message }));
  }

  emitProgress(
    progress: number,
    message: string,
    jobId?: string,
    url?: string
  ): void {
    this.emit(
      'progress',
      this.buildPayload({ progress, message, jobId, url })
    );
  }

  emitPageComplete(jobId: string, url: string, progress: number): void {
    this.emit(
      'page-complete',
      this.buildPayload({
        jobId,
        url,
        progress,
        message: `Finished crawling ${url}`,
      })
    );
  }

  emitJobComplete(jobId: string, url: string): void {
    this.emit(
      'job-complete',
      this.buildPayload({
        jobId,
        url,
        progress: 1,
        message: `Crawl job complete for ${url}`,
      })
    );
  }

  emitError(message: string, jobId?: string, url?: string): void {
    this.emit('error', this.buildPayload({ message, jobId, url, progress: 0 }));
  }

  emitComplete(): void {
    this.emit(
      'complete',
      this.buildPayload({ progress: 1, message: 'All crawl jobs complete' })
    );
  }
}
