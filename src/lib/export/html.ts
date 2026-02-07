import { getDb } from '@/lib/db';
import { audits, extractedTokens, comparisonResults } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { CLASSIFICATION_COLORS, LAYER_LABELS } from '@/lib/constants';
import type { TokenLayer } from '@/types/audit';

export async function exportHtmlReport(auditId: string): Promise<string> {
  const db = getDb();

  const audit = db.select().from(audits).where(eq(audits.id, auditId)).get();
  if (!audit) throw new Error(`Audit ${auditId} not found`);

  const tokens = db
    .select()
    .from(extractedTokens)
    .where(eq(extractedTokens.auditId, auditId))
    .all();

  const comparisons = db
    .select()
    .from(comparisonResults)
    .where(eq(comparisonResults.auditId, auditId))
    .all();

  const productUrls = JSON.parse(audit.productUrls) as string[];

  // Aggregate stats
  const layerStats: Record<string, { total: number; inherit: number; adapt: number; extend: number }> = {};
  for (const t of tokens) {
    if (!layerStats[t.layer]) {
      layerStats[t.layer] = { total: 0, inherit: 0, adapt: 0, extend: 0 };
    }
    layerStats[t.layer].total++;
    if (t.classification === 'inherit' || t.classification === 'adapt' || t.classification === 'extend') {
      layerStats[t.layer][t.classification]++;
    }
  }

  const classificationCounts = {
    inherit: tokens.filter((t) => t.classification === 'inherit').length,
    adapt: tokens.filter((t) => t.classification === 'adapt').length,
    extend: tokens.filter((t) => t.classification === 'extend').length,
    unclassified: tokens.filter((t) => t.classification === 'unclassified').length,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design Audit Report — ${escapeHtml(audit.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; line-height: 1.6; padding: 2rem; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.25rem; margin: 2rem 0 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
    h3 { font-size: 1rem; margin: 1.5rem 0 0.75rem; }
    .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; }
    .card-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .card-value { font-size: 1.5rem; font-weight: 600; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; color: white; }
    .badge-inherit { background: ${CLASSIFICATION_COLORS.inherit}; }
    .badge-adapt { background: ${CLASSIFICATION_COLORS.adapt}; color: #1e293b; }
    .badge-extend { background: ${CLASSIFICATION_COLORS.extend}; }
    .badge-unclassified { background: ${CLASSIFICATION_COLORS.unclassified}; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin-bottom: 2rem; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; position: sticky; top: 0; }
    .swatch { display: inline-block; width: 16px; height: 16px; border-radius: 3px; border: 1px solid #e2e8f0; vertical-align: middle; margin-right: 6px; }
    .products { list-style: none; }
    .products li { padding: 0.25rem 0; }
    .products li::before { content: '→'; margin-right: 0.5rem; color: #94a3b8; }
    .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>Design Audit Report</h1>
  <p class="meta">${escapeHtml(audit.name)} — Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

  <h2>Products Audited</h2>
  <ul class="products">
    ${audit.parentSystemUrl ? `<li><strong>Parent System:</strong> ${escapeHtml(audit.parentSystemUrl)}</li>` : ''}
    ${productUrls.map((u) => `<li>${escapeHtml(u)}</li>`).join('\n    ')}
  </ul>

  <h2>Classification Summary</h2>
  <div class="grid">
    <div class="card">
      <div class="card-label">Inherit</div>
      <div class="card-value" style="color:${CLASSIFICATION_COLORS.inherit}">${classificationCounts.inherit}</div>
    </div>
    <div class="card">
      <div class="card-label">Adapt</div>
      <div class="card-value" style="color:${CLASSIFICATION_COLORS.adapt}">${classificationCounts.adapt}</div>
    </div>
    <div class="card">
      <div class="card-label">Extend</div>
      <div class="card-value" style="color:${CLASSIFICATION_COLORS.extend}">${classificationCounts.extend}</div>
    </div>
    <div class="card">
      <div class="card-label">Unclassified</div>
      <div class="card-value" style="color:${CLASSIFICATION_COLORS.unclassified}">${classificationCounts.unclassified}</div>
    </div>
  </div>

  <h2>Tokens by Layer</h2>
  <table>
    <thead><tr><th>Layer</th><th>Total</th><th>Inherit</th><th>Adapt</th><th>Extend</th></tr></thead>
    <tbody>
      ${Object.entries(layerStats)
        .map(([layer, s]) => `<tr><td>${LAYER_LABELS[layer as TokenLayer] || layer}</td><td>${s.total}</td><td>${s.inherit}</td><td>${s.adapt}</td><td>${s.extend}</td></tr>`)
        .join('\n      ')}
    </tbody>
  </table>

  <h2>Comparison Matrix</h2>
  <table>
    <thead>
      <tr>
        <th>Property</th>
        <th>Canonical</th>
        ${productUrls.map((u) => `<th>${escapeHtml(new URL(u).hostname)}</th>`).join('')}
        <th>Divergence</th>
        <th>Classification</th>
      </tr>
    </thead>
    <tbody>
      ${comparisons.slice(0, 200).map((c) => {
        const pv = JSON.parse(c.productValues) as Record<string, string>;
        const isColor = c.entityProperty.startsWith('color::');
        return `<tr>
          <td>${escapeHtml(c.entityProperty)}</td>
          <td>${isColor ? `<span class="swatch" style="background:${escapeHtml(c.canonicalValue)}"></span>` : ''}${escapeHtml(c.canonicalValue)}</td>
          ${productUrls.map((u) => {
            const val = pv[u] || '—';
            return `<td>${isColor ? `<span class="swatch" style="background:${escapeHtml(val)}"></span>` : ''}${escapeHtml(val)}</td>`;
          }).join('')}
          <td>${(c.divergenceScore * 100).toFixed(1)}%</td>
          <td><span class="badge badge-${c.classification}">${c.classification}</span></td>
        </tr>`;
      }).join('\n      ')}
    </tbody>
  </table>
  ${comparisons.length > 200 ? `<p class="meta">Showing first 200 of ${comparisons.length} comparisons.</p>` : ''}

  <div class="footer">
    Generated by Design System Audit Tool — ${new Date().toISOString()}
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
