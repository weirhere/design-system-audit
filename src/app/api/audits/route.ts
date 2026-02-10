import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { audits } from '@/lib/db/schema';
import { generateId } from '@/lib/utils';
import { DEFAULT_AUDIT_CONFIG } from '@/lib/constants';
import { desc, eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;
    const { userId } = authResult;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body.' },
        { status: 400 }
      );
    }

    const { name, parentSystemUrl, productUrls } = body as {
      name: string;
      parentSystemUrl?: string;
      productUrls: string[];
    };

    // Validate name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Audit name is required.' },
        { status: 400 }
      );
    }

    // Validate productUrls
    if (!productUrls || !Array.isArray(productUrls) || productUrls.length === 0) {
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

    // Validate each URL is a non-empty string
    const invalidUrls = productUrls.filter((url: string) => typeof url !== 'string' || !url.trim());
    if (invalidUrls.length > 0) {
      return NextResponse.json(
        { error: 'Product URLs must be non-empty strings.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();
    const id = generateId();

    const audit = {
      id,
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
      parentSystemUrl: parentSystemUrl?.trim() || null,
      productUrls: JSON.stringify(productUrls),
      status: 'draft' as const,
      config: JSON.stringify(DEFAULT_AUDIT_CONFIG),
      userId,
    };

    await db.insert(audits).values(audit);

    return NextResponse.json(
      {
        ...audit,
        productUrls,
        config: DEFAULT_AUDIT_CONFIG,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/audits] Error:', error);
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: `Failed to create audit: ${message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;
    const { userId } = authResult;

    const db = getDb();

    const rows = await db
      .select()
      .from(audits)
      .where(eq(audits.userId, userId))
      .orderBy(desc(audits.createdAt));

    const parsed = rows.map((row) => ({
      ...row,
      productUrls: JSON.parse(row.productUrls),
      config: JSON.parse(row.config),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('[GET /api/audits] Error:', error);
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: `Failed to load audits: ${message}` },
      { status: 500 }
    );
  }
}
