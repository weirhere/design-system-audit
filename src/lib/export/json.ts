import { getDb } from '@/lib/db';
import { extractedTokens, comparisonResults, audits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function exportAuditJson(auditId: string): Promise<string> {
  const db = getDb();

  const [audit] = await db.select().from(audits).where(eq(audits.id, auditId)).limit(1);
  if (!audit) throw new Error(`Audit ${auditId} not found`);

  const tokens = await db
    .select()
    .from(extractedTokens)
    .where(eq(extractedTokens.auditId, auditId));

  const comparisons = await db
    .select()
    .from(comparisonResults)
    .where(eq(comparisonResults.auditId, auditId));

  const output = {
    audit: {
      id: audit.id,
      name: audit.name,
      createdAt: audit.createdAt,
      parentSystemUrl: audit.parentSystemUrl,
      productUrls: JSON.parse(audit.productUrls),
      status: audit.status,
    },
    tokens: tokens.map((t) => ({
      id: t.id,
      sourceProduct: t.sourceProduct,
      layer: t.layer,
      property: t.property,
      computedValue: t.computedValue,
      rawValue: t.rawValue,
      cssVariable: t.cssVariable,
      frequency: t.frequency,
      classification: t.classification,
      classificationConfidence: t.classificationConfidence,
    })),
    comparisons: comparisons.map((c) => ({
      id: c.id,
      entityType: c.entityType,
      entityProperty: c.entityProperty,
      canonicalValue: c.canonicalValue,
      productValues: JSON.parse(c.productValues),
      divergenceScore: c.divergenceScore,
      classification: c.classification,
    })),
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(output, null, 2);
}
