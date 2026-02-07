export type AuditStatus =
  | 'draft'
  | 'crawling'
  | 'crawled'
  | 'analyzing'
  | 'complete'
  | 'error';

export interface AuditConfig {
  maxPagesPerProduct: number;
  viewports: number[];
  extractLayers: TokenLayer[];
}

export type TokenLayer =
  | 'color'
  | 'typography'
  | 'spacing'
  | 'elevation'
  | 'border'
  | 'motion'
  | 'opacity';

export interface Audit {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  parentSystemUrl: string | null;
  productUrls: string[];
  status: AuditStatus;
  config: AuditConfig;
}

export interface CrawlJob {
  id: string;
  auditId: string;
  url: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  pageCount: number;
  progress: number;
}

export interface CrawledPage {
  id: string;
  crawlJobId: string;
  auditId: string;
  url: string;
  title: string;
  screenshotPath: string | null;
  crawledAt: string;
}
