import type { CrawlEngine } from './engine';

const activeCrawls: Map<string, CrawlEngine> = new Map();

export function getCrawl(auditId: string): CrawlEngine | undefined {
  return activeCrawls.get(auditId);
}

export function setCrawl(auditId: string, engine: CrawlEngine): void {
  activeCrawls.set(auditId, engine);
}

export function removeCrawl(auditId: string): boolean {
  return activeCrawls.delete(auditId);
}

export { activeCrawls };
