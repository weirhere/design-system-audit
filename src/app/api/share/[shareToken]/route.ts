import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { audits } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params;
    const db = getDb();

    const audit = await db.query.audits.findFirst({
      where: and(eq(audits.shareToken, shareToken), eq(audits.isPublic, true)),
    });

    if (!audit) {
      return NextResponse.json(
        { error: 'Shared report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: audit.id,
      name: audit.name,
      status: audit.status,
      createdAt: audit.createdAt,
      updatedAt: audit.updatedAt,
      parentSystemUrl: audit.parentSystemUrl,
      productUrls: JSON.parse(audit.productUrls),
      shareToken: audit.shareToken,
    });
  } catch (error) {
    console.error('[GET /api/share/[shareToken]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared report' },
      { status: 500 }
    );
  }
}
