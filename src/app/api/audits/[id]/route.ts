import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { audits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuditOwner, requireAuditAccess } from '@/lib/auth-helpers';

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
