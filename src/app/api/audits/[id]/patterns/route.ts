import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { extractedPatterns } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuditOwner } from '@/lib/auth-helpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAuditOwner(id);
    if ('error' in result) return result.error;
    const db = getDb();

    const patterns = await db
      .select()
      .from(extractedPatterns)
      .where(eq(extractedPatterns.auditId, id));

    return NextResponse.json(patterns);
  } catch (error) {
    console.error('[GET /api/audits/[id]/patterns] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patterns' },
      { status: 500 }
    );
  }
}
