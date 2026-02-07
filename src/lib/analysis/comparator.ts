import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  audits,
  extractedTokens,
  comparisonResults,
} from '@/lib/db/schema';
import { tokenDistance } from '@/lib/analysis/similarity';
import { generateId } from '@/lib/utils';
import type { MatrixRow } from '@/types/matrix';
import type { TokenLayer } from '@/types/audit';
import type { Classification } from '@/types/classification';

/**
 * Run cross-product token comparison for an audit.
 *
 * 1. Fetches all extracted tokens for the audit
 * 2. Groups tokens by layer + property to find unique value sets
 * 3. Determines a canonical value (from parent system or most frequent)
 * 4. Computes per-product divergence scores
 * 5. Inserts comparison results and marks the audit complete
 */
export async function runComparison(auditId: string): Promise<void> {
  const db = getDb();

  // 1. Get all extracted tokens for this audit
  const tokens = await db
    .select()
    .from(extractedTokens)
    .where(eq(extractedTokens.auditId, auditId));

  if (tokens.length === 0) return;

  // Get the audit to determine parent system URL
  const [audit] = await db
    .select()
    .from(audits)
    .where(eq(audits.id, auditId))
    .limit(1);

  if (!audit) return;

  const parentSystemUrl = audit.parentSystemUrl;

  // 2. Group tokens by layer::property to find unique combinations
  const groupedByLayerProperty = new Map<
    string,
    Map<string, { sourceProducts: Map<string, number>; tokens: typeof tokens }>
  >();

  for (const token of tokens) {
    const key = `${token.layer}::${token.property}`;

    if (!groupedByLayerProperty.has(key)) {
      groupedByLayerProperty.set(key, new Map());
    }

    const valueMap = groupedByLayerProperty.get(key)!;
    const valueKey = token.computedValue;

    if (!valueMap.has(valueKey)) {
      valueMap.set(valueKey, {
        sourceProducts: new Map(),
        tokens: [],
      });
    }

    const entry = valueMap.get(valueKey)!;
    entry.tokens.push(token);

    const currentCount = entry.sourceProducts.get(token.sourceProduct) ?? 0;
    entry.sourceProducts.set(token.sourceProduct, currentCount + token.frequency);
  }

  // 3. For each layer+property combination, compute comparison
  // Delete any existing comparison results for this audit
  await db
    .delete(comparisonResults)
    .where(eq(comparisonResults.auditId, auditId));

  for (const [layerProperty, valueMap] of Array.from(groupedByLayerProperty.entries())) {
    const [layer, property] = layerProperty.split('::') as [TokenLayer, string];

    // Collect all unique values across products
    const allValues = Array.from(valueMap.keys());

    // Collect per-product values: which products have which values
    const productValueMap = new Map<string, string>();
    const valueTotalFrequency = new Map<string, number>();

    for (const [value, entry] of Array.from(valueMap.entries())) {
      let totalFreq = 0;
      for (const [product, freq] of Array.from(entry.sourceProducts.entries())) {
        // Use the most frequent value for each product
        if (!productValueMap.has(product)) {
          productValueMap.set(product, value);
        } else {
          const existingValue = productValueMap.get(product)!;
          const existingEntry = valueMap.get(existingValue)!;
          const existingFreq = existingEntry.sourceProducts.get(product) ?? 0;
          const currentFreq = entry.sourceProducts.get(product) ?? 0;
          if (currentFreq > existingFreq) {
            productValueMap.set(product, value);
          }
        }
        totalFreq += freq;
      }
      valueTotalFrequency.set(value, totalFreq);
    }

    // Determine canonical value
    let canonicalValue: string;

    if (parentSystemUrl && productValueMap.has(parentSystemUrl)) {
      // Use the parent system's value as canonical
      canonicalValue = productValueMap.get(parentSystemUrl)!;
    } else {
      // Use the most frequent value across all products
      let maxFreq = 0;
      canonicalValue = allValues[0];

      for (const [value, freq] of Array.from(valueTotalFrequency.entries())) {
        if (freq > maxFreq) {
          maxFreq = freq;
          canonicalValue = value;
        }
      }
    }

    // Compute per-product divergence
    const productValues: Record<string, string> = {};
    let maxDivergence = 0;

    for (const [product, value] of Array.from(productValueMap.entries())) {
      productValues[product] = value;
      const divergence = tokenDistance(layer, property, canonicalValue, value);
      if (divergence > maxDivergence) {
        maxDivergence = divergence;
      }
    }

    // Insert comparison result
    await db.insert(comparisonResults).values({
      id: generateId(),
      auditId,
      entityType: 'token',
      entityProperty: `${layer}::${property}`,
      canonicalValue,
      productValues: JSON.stringify(productValues),
      divergenceScore: maxDivergence,
      classification: 'unclassified',
    });
  }

  // 4. Update audit status to complete
  await db
    .update(audits)
    .set({
      status: 'complete',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(audits.id, auditId));
}

/**
 * Get comparison results formatted as matrix rows for the matrix view.
 */
export async function getComparisonMatrix(
  auditId: string
): Promise<MatrixRow[]> {
  const db = getDb();

  const results = await db
    .select()
    .from(comparisonResults)
    .where(eq(comparisonResults.auditId, auditId));

  return results.map((result) => {
    const [layer, property] = result.entityProperty.split('::') as [
      TokenLayer,
      string,
    ];

    const rawProductValues: Record<string, string> = JSON.parse(
      result.productValues
    );

    const productValues: MatrixRow['productValues'] = {};
    for (const [product, value] of Object.entries(rawProductValues)) {
      const divergence = tokenDistance(
        layer,
        property,
        result.canonicalValue,
        value
      );
      productValues[product] = {
        value,
        divergence,
        classification: result.classification as Classification,
      };
    }

    return {
      id: result.id,
      layer,
      property,
      canonicalValue: result.canonicalValue,
      productValues,
      maxDivergence: result.divergenceScore,
    };
  });
}
