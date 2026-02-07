import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { audits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const audit = await db.query.audits.findFirst({
      where: eq(audits.id, id),
    });

    if (!audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...audit,
      productUrls: JSON.parse(audit.productUrls),
      config: JSON.parse(audit.config),
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
