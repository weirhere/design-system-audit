import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  comparisonResults,
  extractedTokens,
  migrationTasks,
} from '@/lib/db/schema';
import { generateId } from '@/lib/utils';
import type { MigrationTask } from '@/types/matrix';
import type { Classification } from '@/types/classification';

/**
 * Generate a migration roadmap for an audit.
 *
 * Phase 1: 'inherit' tokens - just adopt the parent/canonical values (effort: xs)
 * Phase 2: 'adapt' tokens - need density/context modifiers (effort: sm/md)
 * Phase 3: 'extend' tokens - new tokens required (effort: md/lg)
 *
 * Priority is determined by token frequency (how widely used the token is).
 */
export async function generateRoadmap(auditId: string): Promise<void> {
  const db = getDb();

  // 1. Get all comparison results for this audit
  const results = await db
    .select()
    .from(comparisonResults)
    .where(eq(comparisonResults.auditId, auditId));

  // 2. Get all extracted tokens grouped by classification
  const tokens = await db
    .select()
    .from(extractedTokens)
    .where(eq(extractedTokens.auditId, auditId));

  // Group tokens by layer::property for lookup
  const tokensByLayerProperty = new Map<string, typeof tokens>();
  for (const token of tokens) {
    const key = `${token.layer}::${token.property}`;
    if (!tokensByLayerProperty.has(key)) {
      tokensByLayerProperty.set(key, []);
    }
    tokensByLayerProperty.get(key)!.push(token);
  }

  // Delete any existing migration tasks for this audit
  await db
    .delete(migrationTasks)
    .where(eq(migrationTasks.auditId, auditId));

  // 3. Create migration tasks grouped by classification and product
  const taskValues: Array<{
    id: string;
    auditId: string;
    title: string;
    description: string;
    entityType: 'token' | 'component' | 'pattern';
    entityIds: string;
    sourceProduct: string;
    classification: Classification;
    effortEstimate: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    priority: 'critical' | 'high' | 'medium' | 'low';
    phase: number;
    status: 'todo' | 'in-progress' | 'done';
  }> = [];

  for (const result of results) {
    if (result.classification === 'unclassified') continue;

    const relatedTokens = tokensByLayerProperty.get(result.entityProperty) ?? [];
    if (relatedTokens.length === 0) continue;

    // Group related tokens by source product
    const tokensByProduct = new Map<string, typeof tokens>();
    for (const token of relatedTokens) {
      if (!tokensByProduct.has(token.sourceProduct)) {
        tokensByProduct.set(token.sourceProduct, []);
      }
      tokensByProduct.get(token.sourceProduct)!.push(token);
    }

    const [layer, property] = result.entityProperty.split('::');
    const classification = result.classification as Classification;

    for (const [sourceProduct, productTokens] of Array.from(tokensByProduct.entries())) {
      // Calculate total frequency for priority
      const totalFrequency = productTokens.reduce(
        (sum, t) => sum + t.frequency,
        0
      );

      const entityIds = productTokens.map((t) => t.id);

      let phase: number;
      let effortEstimate: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
      let priority: 'critical' | 'high' | 'medium' | 'low';
      let title: string;
      let description: string;

      switch (classification) {
        case 'inherit':
          phase = 1;
          effortEstimate = 'xs';
          priority = determinePriorityByFrequency(totalFrequency);
          title = `Adopt ${layer} ${property} from design system`;
          description =
            `Replace current ${layer} ${property} value with the canonical design system value ` +
            `"${result.canonicalValue}". This is a direct adoption with no modifications needed. ` +
            `Affects ${entityIds.length} token instance(s) across ${sourceProduct}.`;
          break;

        case 'adapt':
          phase = 2;
          effortEstimate = totalFrequency > 20 ? 'md' : 'sm';
          priority = 'high';
          title = `Adapt ${layer} ${property} for ${getProductLabel(sourceProduct)}`;
          description =
            `Modify the ${layer} ${property} value to align with the design system canonical value ` +
            `"${result.canonicalValue}" while accounting for product-specific density or context. ` +
            `Current divergence score: ${result.divergenceScore.toFixed(3)}. ` +
            `Affects ${entityIds.length} token instance(s) across ${sourceProduct}.`;
          break;

        case 'extend':
          phase = 3;
          effortEstimate = totalFrequency > 20 ? 'lg' : 'md';
          priority = 'medium';
          title = `Extend design system with ${layer} ${property} for ${getProductLabel(sourceProduct)}`;
          description =
            `Create a new design system token for ${layer} ${property}. ` +
            `The current product value diverges significantly from the canonical value ` +
            `"${result.canonicalValue}" (divergence: ${result.divergenceScore.toFixed(3)}). ` +
            `Evaluate whether this represents a legitimate product need or should be consolidated. ` +
            `Affects ${entityIds.length} token instance(s) across ${sourceProduct}.`;
          break;

        default:
          continue;
      }

      taskValues.push({
        id: generateId(),
        auditId,
        title,
        description,
        entityType: 'token',
        entityIds: JSON.stringify(entityIds),
        sourceProduct,
        classification,
        effortEstimate,
        priority,
        phase,
        status: 'todo',
      });
    }
  }

  // 4. Insert all migration tasks
  if (taskValues.length > 0) {
    for (const task of taskValues) {
      await db.insert(migrationTasks).values(task);
    }
  }
}

/**
 * Fetch the migration roadmap for an audit.
 */
export async function getRoadmap(auditId: string): Promise<MigrationTask[]> {
  const db = getDb();

  const tasks = await db
    .select()
    .from(migrationTasks)
    .where(eq(migrationTasks.auditId, auditId));

  return tasks.map((task) => ({
    id: task.id,
    auditId: task.auditId,
    title: task.title,
    description: task.description,
    entityType: task.entityType as MigrationTask['entityType'],
    entityIds: JSON.parse(task.entityIds) as string[],
    sourceProduct: task.sourceProduct,
    classification: task.classification as MigrationTask['classification'],
    effortEstimate: task.effortEstimate as MigrationTask['effortEstimate'],
    priority: task.priority as MigrationTask['priority'],
    phase: task.phase,
    status: task.status as MigrationTask['status'],
  }));
}

/**
 * Determine task priority based on token frequency.
 * Higher frequency tokens are more critical to migrate.
 */
function determinePriorityByFrequency(
  totalFrequency: number
): 'critical' | 'high' | 'medium' | 'low' {
  if (totalFrequency >= 50) return 'critical';
  if (totalFrequency >= 20) return 'high';
  if (totalFrequency >= 5) return 'medium';
  return 'low';
}

/**
 * Extract a readable label from a product URL.
 */
function getProductLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return url;
  }
}
