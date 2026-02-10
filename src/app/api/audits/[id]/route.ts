import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { audits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuditOwner, requireAuditAccess } from '@/lib/auth-helpers';
import { TOKEN_LAYERS } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shareToken = request.nextUrl.searchParams.get('shareToken');
    const result = await requireAuditAccess(id, shareToken);
    if ('error' in result) return result.error;

    return NextResponse.json({
      ...result.audit,
      productUrls: JSON.parse(result.audit.productUrls),
      config: JSON.parse(result.audit.config),
    });
  } catch (error) {
    console.error('[GET /api/audits/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAuditOwner(id);
    if ('error' in result) return result.error;

    const db = getDb();
    await db.delete(audits).where(eq(audits.id, id));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[DELETE /api/audits/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete audit' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAuditOwner(id);
    if ('error' in result) return result.error;

    const audit = result.audit;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body.' },
        { status: 400 }
      );
    }

    const updates: Record<string, string> = {
      updatedAt: new Date().toISOString(),
    };
    let urlsOrConfigChanged = false;

    // Validate & apply name
    if ('name' in body) {
      if (!body.name || typeof body.name !== 'string' || !(body.name as string).trim()) {
        return NextResponse.json(
          { error: 'Audit name is required.' },
          { status: 400 }
        );
      }
      updates.name = (body.name as string).trim();
    }

    // Validate & apply parentSystemUrl
    if ('parentSystemUrl' in body) {
      const parentUrl = body.parentSystemUrl as string | null;
      if (parentUrl && typeof parentUrl === 'string' && parentUrl.trim()) {
        updates.parentSystemUrl = parentUrl.trim();
      } else {
        updates.parentSystemUrl = '';
      }
      urlsOrConfigChanged = true;
    }

    // Validate & apply productUrls
    if ('productUrls' in body) {
      const productUrls = body.productUrls as string[];
      if (!Array.isArray(productUrls) || productUrls.length === 0) {
        return NextResponse.json(
          { error: 'At least one product URL is required.' },
          { status: 400 }
        );
      }
      if (productUrls.length > 6) {
        return NextResponse.json(
          { error: 'A maximum of 6 product URLs is supported.' },
          { status: 400 }
        );
      }
      const invalidUrls = productUrls.filter((url: string) => typeof url !== 'string' || !url.trim());
      if (invalidUrls.length > 0) {
        return NextResponse.json(
          { error: 'Product URLs must be non-empty strings.' },
          { status: 400 }
        );
      }
      updates.productUrls = JSON.stringify(productUrls);
      urlsOrConfigChanged = true;
    }

    // Validate & apply config
    if ('config' in body) {
      const config = body.config as {
        maxPagesPerProduct?: number;
        viewports?: number[];
        extractLayers?: string[];
      };
      if (!config || typeof config !== 'object') {
        return NextResponse.json(
          { error: 'Config must be an object.' },
          { status: 400 }
        );
      }
      const currentConfig = JSON.parse(audit.config);
      const merged = { ...currentConfig };

      if ('maxPagesPerProduct' in config) {
        const val = config.maxPagesPerProduct;
        if (typeof val !== 'number' || val < 1 || val > 200) {
          return NextResponse.json(
            { error: 'maxPagesPerProduct must be a number between 1 and 200.' },
            { status: 400 }
          );
        }
        merged.maxPagesPerProduct = val;
      }
      if ('viewports' in config) {
        const val = config.viewports;
        if (!Array.isArray(val) || val.length === 0 || !val.every((v: unknown) => typeof v === 'number' && v > 0)) {
          return NextResponse.json(
            { error: 'Viewports must be an array of positive numbers.' },
            { status: 400 }
          );
        }
        merged.viewports = val;
      }
      if ('extractLayers' in config) {
        const val = config.extractLayers;
        if (!Array.isArray(val) || val.length === 0 || !val.every((l: unknown) => TOKEN_LAYERS.includes(l as typeof TOKEN_LAYERS[number]))) {
          return NextResponse.json(
            { error: `extractLayers must include at least one of: ${TOKEN_LAYERS.join(', ')}.` },
            { status: 400 }
          );
        }
        merged.extractLayers = val;
      }

      updates.config = JSON.stringify(merged);
      urlsOrConfigChanged = true;
    }

    // Reset status to draft if URLs/config changed on a crawled audit
    if (urlsOrConfigChanged && ['crawled', 'analyzing', 'complete'].includes(audit.status)) {
      updates.status = 'draft';
    }

    const db = getDb();
    await db.update(audits).set(updates).where(eq(audits.id, id));

    // Re-fetch to return the updated audit
    const [updated] = await db.select().from(audits).where(eq(audits.id, id));
    return NextResponse.json({
      ...updated,
      productUrls: JSON.parse(updated.productUrls),
      config: JSON.parse(updated.config),
    });
  } catch (error) {
    console.error('[PATCH /api/audits/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update audit' },
      { status: 500 }
    );
  }
}
