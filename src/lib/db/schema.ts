import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const audits = sqliteTable('audits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  parentSystemUrl: text('parent_system_url'),
  productUrls: text('product_urls').notNull(), // JSON array
  status: text('status', {
    enum: ['draft', 'crawling', 'crawled', 'analyzing', 'complete', 'error'],
  }).notNull().default('draft'),
  config: text('config').notNull(), // JSON
});

export const crawlJobs = sqliteTable('crawl_jobs', {
  id: text('id').primaryKey(),
  auditId: text('audit_id').notNull().references(() => audits.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  status: text('status', {
    enum: ['pending', 'running', 'complete', 'error'],
  }).notNull().default('pending'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  error: text('error'),
  pageCount: integer('page_count').notNull().default(0),
  progress: real('progress').notNull().default(0),
});

export const crawledPages = sqliteTable('crawled_pages', {
  id: text('id').primaryKey(),
  crawlJobId: text('crawl_job_id').notNull().references(() => crawlJobs.id, { onDelete: 'cascade' }),
  auditId: text('audit_id').notNull().references(() => audits.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  title: text('title').notNull(),
  screenshotPath: text('screenshot_path'),
  crawledAt: text('crawled_at').notNull(),
});

export const extractedTokens = sqliteTable('extracted_tokens', {
  id: text('id').primaryKey(),
  auditId: text('audit_id').notNull().references(() => audits.id, { onDelete: 'cascade' }),
  crawledPageId: text('crawled_page_id').notNull().references(() => crawledPages.id, { onDelete: 'cascade' }),
  sourceProduct: text('source_product').notNull(),
  layer: text('layer', {
    enum: ['color', 'typography', 'spacing', 'elevation', 'border', 'motion', 'opacity'],
  }).notNull(),
  property: text('property').notNull(),
  computedValue: text('computed_value').notNull(),
  rawValue: text('raw_value'),
  cssVariable: text('css_variable'),
  selector: text('selector').notNull(),
  frequency: integer('frequency').notNull().default(1),
  classification: text('classification', {
    enum: ['unclassified', 'inherit', 'adapt', 'extend'],
  }).notNull().default('unclassified'),
  classificationConfidence: real('classification_confidence').notNull().default(0),
  classificationOverridden: integer('classification_overridden', { mode: 'boolean' }).notNull().default(false),
  metadata: text('metadata'), // JSON
});

export const extractedComponents = sqliteTable('extracted_components', {
  id: text('id').primaryKey(),
  auditId: text('audit_id').notNull().references(() => audits.id, { onDelete: 'cascade' }),
  sourceProduct: text('source_product').notNull(),
  name: text('name').notNull(),
  selector: text('selector').notNull(),
  variants: text('variants'), // JSON
  states: text('states'), // JSON
  tokenIds: text('token_ids'), // JSON
  htmlSnapshot: text('html_snapshot'),
  frequency: integer('frequency').notNull().default(1),
  classification: text('classification', {
    enum: ['unclassified', 'inherit', 'adapt', 'extend'],
  }).notNull().default('unclassified'),
  classificationConfidence: real('classification_confidence').notNull().default(0),
  classificationOverridden: integer('classification_overridden', { mode: 'boolean' }).notNull().default(false),
});

export const extractedPatterns = sqliteTable('extracted_patterns', {
  id: text('id').primaryKey(),
  auditId: text('audit_id').notNull().references(() => audits.id, { onDelete: 'cascade' }),
  sourceProduct: text('source_product').notNull(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  componentIds: text('component_ids'), // JSON
  responsiveBehavior: text('responsive_behavior'), // JSON
  classification: text('classification', {
    enum: ['unclassified', 'inherit', 'adapt', 'extend'],
  }).notNull().default('unclassified'),
  classificationConfidence: real('classification_confidence').notNull().default(0),
  classificationOverridden: integer('classification_overridden', { mode: 'boolean' }).notNull().default(false),
});

export const comparisonResults = sqliteTable('comparison_results', {
  id: text('id').primaryKey(),
  auditId: text('audit_id').notNull().references(() => audits.id, { onDelete: 'cascade' }),
  entityType: text('entity_type', {
    enum: ['token', 'component', 'pattern'],
  }).notNull(),
  entityProperty: text('entity_property').notNull(),
  canonicalValue: text('canonical_value').notNull(),
  productValues: text('product_values').notNull(), // JSON map
  divergenceScore: real('divergence_score').notNull().default(0),
  classification: text('classification', {
    enum: ['unclassified', 'inherit', 'adapt', 'extend'],
  }).notNull().default('unclassified'),
});

export const migrationTasks = sqliteTable('migration_tasks', {
  id: text('id').primaryKey(),
  auditId: text('audit_id').notNull().references(() => audits.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  entityType: text('entity_type', {
    enum: ['token', 'component', 'pattern'],
  }).notNull(),
  entityIds: text('entity_ids').notNull(), // JSON
  sourceProduct: text('source_product').notNull(),
  classification: text('classification', {
    enum: ['unclassified', 'inherit', 'adapt', 'extend'],
  }).notNull(),
  effortEstimate: text('effort_estimate', {
    enum: ['xs', 'sm', 'md', 'lg', 'xl'],
  }).notNull(),
  priority: text('priority', {
    enum: ['critical', 'high', 'medium', 'low'],
  }).notNull(),
  phase: integer('phase').notNull(),
  status: text('status', {
    enum: ['todo', 'in-progress', 'done'],
  }).notNull().default('todo'),
});
