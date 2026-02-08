import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { audits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuditOwner } from '@/lib/auth-helpers';
import { generateId } from '@/lib/utils';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAuditOwner(id);
    if ('error' in result) return result.error;

    const shareToken = generateId();
    const db = getDb();
    await db
      .update(audits)
      .set({ shareToken, isPublic: true })
      .where(eq(audits.id, id));

    return NextResponse.json({ shareToken });
  } catch (error) {
    console.error('[POST /api/audits/[id]/share] Error:', error);
    return NextResponse.json(
      { error: 'Failed to enable sharing' },
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
    await db
      .update(audits)
      .set({ isPublic: false })
      .where(eq(audits.id, id));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[DELETE /api/audits/[id]/share] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disable sharing' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAuditOwner(id);
    if ('error' in result) return result.error;

    const shareToken = generateId();
    const db = getDb();
    await db
      .update(audits)
      .set({ shareToken, isPublic: true })
      .where(eq(audits.id, id));

    return NextResponse.json({ shareToken });
  } catch (error) {
    console.error('[PATCH /api/audits/[id]/share] Error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate share link' },
      { status: 500 }
    );
  }
}
