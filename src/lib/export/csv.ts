import { getDb } from '@/lib/db';
import { extractedTokens, comparisonResults } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCsv).join(',');
}

export async function exportTokensCsv(auditId: string): Promise<string> {
  const db = getDb();

  const tokens = db
    .select()
    .from(extractedTokens)
    .where(eq(extractedTokens.auditId, auditId))
    .all();

  const headers = [
    'ID', 'Source Product', 'Layer', 'Property', 'Computed Value',
    'Raw Value', 'CSS Variable', 'Selector', 'Frequency',
    'Classification', 'Confidence',
  ];

  const rows = tokens.map((t) =>
    toCsvRow([
      t.id, t.sourceProduct, t.layer, t.property, t.computedValue,
      t.rawValue, t.cssVariable, t.selector, t.frequency,
      t.classification, t.classificationConfidence,
    ])
  );

  return [toCsvRow(headers), ...rows].join('\n');
}

export async function exportComparisonCsv(auditId: string): Promise<string> {
  const db = getDb();

  const comparisons = db
    .select()
    .from(comparisonResults)
    .where(eq(comparisonResults.auditId, auditId))
    .all();

  // Collect all product URLs from comparison data
  const allProducts = new Set<string>();
  comparisons.forEach((c) => {
    const values = JSON.parse(c.productValues) as Record<string, string>;
    Object.keys(values).forEach((k) => allProducts.add(k));
  });
  const productList = Array.from(allProducts).sort();

  const headers = [
    'Entity Type', 'Property', 'Canonical Value',
    ...productList,
    'Divergence Score', 'Classification',
  ];

  const rows = comparisons.map((c) => {
    const values = JSON.parse(c.productValues) as Record<string, string>;
    return toCsvRow([
      c.entityType, c.entityProperty, c.canonicalValue,
      ...productList.map((p) => values[p] || ''),
      c.divergenceScore, c.classification,
    ]);
  });

  return [toCsvRow(headers), ...rows].join('\n');
}
