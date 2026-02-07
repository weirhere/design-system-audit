import { NextRequest, NextResponse } from 'next/server';
import { getComparisonMatrix } from '@/lib/analysis/comparator';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
