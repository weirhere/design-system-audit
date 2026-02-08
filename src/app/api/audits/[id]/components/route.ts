import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { extractedComponents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuditAccess } from '@/lib/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shareToken = request.nextUrl.searchParams.get('shareToken');
    const result = await requireAuditAccess(id, shareToken);
    if ('error' in result) return result.error;
    const db = getDb();

    const components = await db
      .select()
      .from(extractedComponents)
      .where(eq(extractedComponents.auditId, id));

    return NextResponse.json(components);
  } catch (error) {
    console.error('[GET /api/audits/[id]/components] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch components' },
      { status: 500 }
    );
  }
}
