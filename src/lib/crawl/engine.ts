import { type Browser, type BrowserContext, type Page } from 'playwright-core';
import { connectBrowser } from '@/lib/browser';
import { getDb } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { extractTokensFromPage } from './extractors/tokens';
import { extractComponentsFromPage } from './extractors/components';
import { extractPatternsFromPage } from './extractors/patterns';
import { runComparison } from '@/lib/analysis/comparator';
import { classifyAuditTokens } from '@/lib/analysis/classifier';
import CrawlProgress from './progress';
import { generateId } from '@/lib/utils';
import { eq } from 'drizzle-orm';

export class CrawlEngine {
  auditId: string;
  browser: Browser | null = null;
  progress: CrawlProgress;

  constructor(auditId: string) {
    this.auditId = auditId;
    this.progress = new CrawlProgress(auditId);
  }

  async start(): Promise<void> {
    const db = getDb();

    try {
      // 1. Get audit from DB
      const audit = await db.query.audits.findFirst({
        where: eq(schema.audits.id, this.auditId),
      });

      if (!audit) {
        throw new Error(`Audit not found: ${this.auditId}`);
      }

      const productUrls: string[] = JSON.parse(audit.productUrls);

      // 2. Launch/connect browser
      this.browser = await connectBrowser();

      // 3. Update audit status to 'crawling'
      await db
        .update(schema.audits)
        .set({
          status: 'crawling',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.audits.id, this.auditId));

      this.progress.emitStart('Crawl started');

      // 4. If parentSystemUrl exists, add it to the front of the crawl list
      const urlsToCrawl: string[] = [];
      const ensureProtocol = (u: string) =>
        /^https?:\/\//i.test(u) ? u : `https://${u}`;

      if (audit.parentSystemUrl) {
        urlsToCrawl.push(ensureProtocol(audit.parentSystemUrl));
      }
      urlsToCrawl.push(...productUrls.map(ensureProtocol));

      const totalUrls = urlsToCrawl.length;
      const BATCH_SIZE = 100;

      // 5. Process each URL sequentially
      for (let i = 0; i < urlsToCrawl.length; i++) {
        const url = urlsToCrawl[i];

        let context: BrowserContext | null = null;

        try {
          // a. Create crawlJob record
          const jobId = generateId();
          const now = new Date().toISOString();

          await db.insert(schema.crawlJobs).values({
            id: jobId,
            auditId: this.auditId,
            url,
            status: 'running',
            startedAt: now,
            pageCount: 0,
            progress: 0,
          });

          this.progress.emitProgress(
            i / totalUrls,
            `Starting crawl for ${url}`,
            jobId,
            url
          );

          // b. Create new BrowserContext
          context = await this.browser.newContext();

          // c. Create new Page, navigate
          const page: Page = await context.newPage();

          await page.goto(url, {
            waitUntil: 'networkidle',
            timeout: 30000,
          });

          // d. Get page title
          const title = await page.title();

          // e. Create crawledPage record
          const pageId = generateId();
          const crawledAt = new Date().toISOString();

          await db.insert(schema.crawledPages).values({
            id: pageId,
            crawlJobId: jobId,
            auditId: this.auditId,
            url,
            title: title || url,
            crawledAt,
          });

          // f. Run token extraction
          this.progress.emitProgress(
            (i + 0.5) / totalUrls,
            `Extracting tokens from ${url}`,
            jobId,
            url
          );

          const rawTokens = await extractTokensFromPage(page, url);

          // g. Insert extracted tokens into DB
          if (rawTokens.length > 0) {
            const tokenRecords = rawTokens.map((token) => ({
              id: generateId(),
              auditId: this.auditId,
              crawledPageId: pageId,
              sourceProduct: url,
              layer: token.layer as
                | 'color'
                | 'typography'
                | 'spacing'
                | 'elevation'
                | 'border'
                | 'motion'
                | 'opacity',
              property: token.property,
              computedValue: token.computedValue,
              rawValue: token.rawValue,
              cssVariable: token.cssVariable,
              selector: token.selector,
              frequency: token.frequency,
              classification: 'unclassified' as const,
              classificationConfidence: 0,
              classificationOverridden: false,
            }));

            // Batch insert in chunks to avoid SQLite variable limits
            for (let j = 0; j < tokenRecords.length; j += BATCH_SIZE) {
              const batch = tokenRecords.slice(j, j + BATCH_SIZE);
              await db.insert(schema.extractedTokens).values(batch);
            }
          }

          // Run component extraction
          const rawComponents = await extractComponentsFromPage(page, url);
          if (rawComponents.length > 0) {
            const componentRecords = rawComponents.map((comp) => ({
              id: generateId(),
              auditId: this.auditId,
              sourceProduct: url,
              name: comp.name,
              selector: comp.selector,
              variants: JSON.stringify(comp.variants),
              states: JSON.stringify(comp.states),
              tokenIds: JSON.stringify([]),
              htmlSnapshot: comp.htmlSnapshot,
              frequency: comp.frequency,
              classification: 'unclassified' as const,
              classificationConfidence: 0,
              classificationOverridden: false,
            }));
            for (let j = 0; j < componentRecords.length; j += BATCH_SIZE) {
              const batch = componentRecords.slice(j, j + BATCH_SIZE);
              await db.insert(schema.extractedComponents).values(batch);
            }
          }

          // Run pattern extraction
          const rawPatterns = await extractPatternsFromPage(page, url);
          if (rawPatterns.length > 0) {
            const patternRecords = rawPatterns.map((pat) => ({
              id: generateId(),
              auditId: this.auditId,
              sourceProduct: url,
              category: pat.category,
              name: pat.name,
              componentIds: JSON.stringify(pat.componentSelectors),
              responsiveBehavior: null,
              classification: 'unclassified' as const,
              classificationConfidence: 0,
              classificationOverridden: false,
            }));
            for (let j = 0; j < patternRecords.length; j += BATCH_SIZE) {
              const batch = patternRecords.slice(j, j + BATCH_SIZE);
              await db.insert(schema.extractedPatterns).values(batch);
            }
          }

          // h. Update crawlJob progress to complete
          await db
            .update(schema.crawlJobs)
            .set({
              progress: 1.0,
              status: 'complete',
              completedAt: new Date().toISOString(),
              pageCount: 1,
            })
            .where(eq(schema.crawlJobs.id, jobId));

          // i. Emit progress events
          this.progress.emitPageComplete(jobId, url, (i + 1) / totalUrls);
          this.progress.emitJobComplete(jobId, url);
        } catch (productError) {
          // Handle per-product errors gracefully
          const errorMessage =
            productError instanceof Error
              ? productError.message
              : String(productError);

          console.error(`[crawl] Error processing ${url}:`, errorMessage);

          this.progress.emitError(
            `Failed to crawl ${url}: ${errorMessage}`,
            undefined,
            url
          );

          // Try to update the crawl job status to error if one was created
          try {
            const jobs = await db.query.crawlJobs.findMany({
              where: eq(schema.crawlJobs.auditId, this.auditId),
            });
            const failedJob = jobs.find(
              (j) => j.url === url && j.status === 'running'
            );
            if (failedJob) {
              await db
                .update(schema.crawlJobs)
                .set({
                  status: 'error',
                  error: errorMessage,
                  completedAt: new Date().toISOString(),
                })
                .where(eq(schema.crawlJobs.id, failedJob.id));
            }
          } catch {
            // Best-effort error status update
          }
        } finally {
          // j. Close context
          if (context) {
            try {
              await context.close();
            } catch {
              // Ignore context close errors
            }
          }
        }
      }

      // 6. Run comparison + classification analysis
      this.progress.emitProgress(1, 'Running cross-product comparison...', undefined, undefined);

      await db
        .update(schema.audits)
        .set({
          status: 'analyzing',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.audits.id, this.auditId));

      await runComparison(this.auditId);
      await classifyAuditTokens(this.auditId);

      // runComparison sets status to 'complete'
      this.progress.emitComplete();
    } catch (error) {
      // 7. Top-level error: update audit status to 'error'
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error(`[crawl] Fatal error for audit ${this.auditId}:`, errorMessage);

      try {
        await db
          .update(schema.audits)
          .set({
            status: 'error',
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.audits.id, this.auditId));
      } catch {
        // Best-effort status update
      }

      this.progress.emitError(errorMessage);
    } finally {
      // 8. Clean up browser
      if (this.browser) {
        try {
          await this.browser.close();
        } catch {
          // Ignore browser close errors
        }
        this.browser = null;
      }
    }
  }

  async stop(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch {
        // Ignore close errors
      }
      this.browser = null;
    }

    this.progress.emitComplete();
  }
}
