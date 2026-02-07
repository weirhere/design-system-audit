import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { audits } from '@/lib/db/schema';
import { generateId } from '@/lib/utils';
import { DEFAULT_AUDIT_CONFIG } from '@/lib/constants';
import { desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, parentSystemUrl, productUrls } = body as {
      name: string;
      parentSystemUrl?: string;
      productUrls: string[];
    };

    if (!name || !productUrls || !Array.isArray(productUrls) || productUrls.length === 0) {
      return NextResponse.json(
        { error: 'name and productUrls (non-empty array) are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();
    const id = generateId();

    const audit = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      parentSystemUrl: parentSystemUrl ?? null,
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
    return NextResponse.json(
      { error: 'Failed to create audit' },
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
    return NextResponse.json(
      { error: 'Failed to list audits' },
      { status: 500 }
    );
  }
}
