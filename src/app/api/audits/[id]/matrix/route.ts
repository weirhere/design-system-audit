import { NextRequest, NextResponse } from 'next/server';
import { getComparisonMatrix } from '@/lib/analysis/comparator';
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

    const matrix = await getComparisonMatrix(id);

    return NextResponse.json(matrix);
  } catch (error) {
    console.error('[GET /api/audits/[id]/matrix] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comparison matrix' },
      { status: 500 }
    );
  }
}
