import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { audits } from '@/lib/db/schema';
import { generateId } from '@/lib/utils';
import { DEFAULT_AUDIT_CONFIG } from '@/lib/constants';
import { desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
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

    // Validate each URL
    const invalidUrls: string[] = [];
    for (const url of productUrls) {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          invalidUrls.push(url);
        }
      } catch {
        invalidUrls.push(url);
      }
    }

    if (invalidUrls.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid URL${invalidUrls.length > 1 ? 's' : ''}: ${invalidUrls.join(', ')}. URLs must start with http:// or https://.`,
        },
        { status: 400 }
      );
    }

    // Validate parent URL if provided
    if (parentSystemUrl && typeof parentSystemUrl === 'string' && parentSystemUrl.trim()) {
      try {
        const parsed = new URL(parentSystemUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return NextResponse.json(
            { error: 'Parent design system URL must start with http:// or https://.' },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: `Invalid parent design system URL: ${parentSystemUrl}` },
          { status: 400 }
        );
      }
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
    const db = getDb();

    const rows = await db
      .select()
      .from(audits)
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
