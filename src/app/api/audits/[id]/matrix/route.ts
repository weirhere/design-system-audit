import { NextRequest, NextResponse } from 'next/server';
import { getComparisonMatrix } from '@/lib/analysis/comparator';
import { requireAuditOwner } from '@/lib/auth-helpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAuditOwner(id);
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
