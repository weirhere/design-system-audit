import { eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  comparisonResults,
  extractedTokens,
} from '@/lib/db/schema';
import { CLASSIFICATION_THRESHOLDS } from '@/lib/constants';
import { generateId } from '@/lib/utils';
import type { TokenLayer } from '@/types/audit';
import type { Classification } from '@/types/classification';

/**
 * Classify a single token based on its divergence score and layer-specific thresholds.
 *
 * - divergence <= inheritMax  -> 'inherit'  (confidence decreases as divergence approaches threshold)
 * - divergence <= adaptMax    -> 'adapt'    (confidence decreases as divergence approaches threshold)
 * - divergence > adaptMax     -> 'extend'   (confidence increases with divergence)
 */
export function classifyToken(
  layer: TokenLayer,
  divergenceScore: number
): { classification: Classification; confidence: number } {
  const thresholds = CLASSIFICATION_THRESHOLDS[layer];
  const { inheritMax, adaptMax } = thresholds;

  if (divergenceScore <= inheritMax) {
    const confidence =
      inheritMax === 0 ? 1 : 1 - divergenceScore / inheritMax;
    return { classification: 'inherit', confidence };
  }

  if (divergenceScore <= adaptMax) {
    const range = adaptMax - inheritMax;
    const confidence =
      range === 0
        ? 1
        : 1 - (divergenceScore - inheritMax) / range;
    return { classification: 'adapt', confidence };
  }

  const range = 1 - adaptMax;
  const confidence =
    range === 0
      ? 1
      : Math.min(1, (divergenceScore - adaptMax) / range);
  return { classification: 'extend', confidence };
}

/**
 * Classify all tokens for an audit:
 *
 * 1. Fetch all comparison results for the audit
 * 2. Determine classification using classifyToken for each result
 * 3. Update comparison result classifications
 * 4. Update all related extracted tokens with classification and confidence
 */
export async function classifyAuditTokens(auditId: string): Promise<void> {
  const db = getDb();

  // 1. Get all comparison results for this audit
  const results = await db
    .select()
    .from(comparisonResults)
    .where(eq(comparisonResults.auditId, auditId));

  // 2 & 3. For each token comparison result, classify and update
  for (const result of results) {
    if (result.entityType !== 'token') continue; // components/patterns handled below

    const [layerStr, property] = result.entityProperty.split('::');
    const layer = layerStr as TokenLayer;

    const { classification, confidence } = classifyToken(
      layer,
      result.divergenceScore
    );

    // Update the comparison result with classification
    await db
      .update(comparisonResults)
      .set({ classification })
      .where(eq(comparisonResults.id, result.id));

    // 4. Update all extracted tokens that match this layer+property combination
    // and belong to this audit (where classification has not been manually overridden)
    const matchingTokens = await db
      .select()
      .from(extractedTokens)
      .where(eq(extractedTokens.auditId, auditId));

    const tokenIdsToUpdate = matchingTokens
      .filter(
        (t) =>
          t.layer === layer &&
          t.property === property &&
          !t.classificationOverridden
      )
      .map((t) => t.id);

    if (tokenIdsToUpdate.length > 0) {
      await db
        .update(extractedTokens)
        .set({
          classification,
          classificationConfidence: confidence,
        })
        .where(inArray(extractedTokens.id, tokenIdsToUpdate));
    }
  }

  // Classify component and pattern comparison results
  const entityResults = await db
    .select()
    .from(comparisonResults)
    .where(eq(comparisonResults.auditId, auditId));

  for (const result of entityResults) {
    if (result.entityType === 'token') continue; // already handled above

    // For components/patterns, use simple thresholds on divergence
    let entityClassification: Classification;
    if (result.divergenceScore <= 0.0) {
      entityClassification = 'inherit';
    } else if (result.divergenceScore <= 0.5) {
      entityClassification = 'adapt';
    } else {
      entityClassification = 'extend';
    }

    await db
      .update(comparisonResults)
      .set({ classification: entityClassification })
      .where(eq(comparisonResults.id, result.id));
  }
}

/**
 * Override classification for specific tokens manually.
 * Sets the classificationOverridden flag to true so automatic reclassification
 * will not overwrite the manual decision.
 */
export async function overrideClassification(
  tokenIds: string[],
  classification: Classification
): Promise<void> {
  if (tokenIds.length === 0) return;

  const db = getDb();

  await db
    .update(extractedTokens)
    .set({
      classification,
      classificationOverridden: true,
      classificationConfidence: 1,
    })
    .where(inArray(extractedTokens.id, tokenIds));
}
