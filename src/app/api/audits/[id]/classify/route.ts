import { NextRequest, NextResponse } from 'next/server';
import { overrideClassification } from '@/lib/analysis/classifier';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const { tokenIds, classification } = body as {
      tokenIds: string[];
      classification: 'inherit' | 'adapt' | 'extend';
    };

    if (
      !tokenIds ||
      !Array.isArray(tokenIds) ||
      tokenIds.length === 0 ||
      !classification ||
      !['inherit', 'adapt', 'extend'].includes(classification)
    ) {
      return NextResponse.json(
        { error: 'tokenIds (non-empty array) and classification (inherit|adapt|extend) are required' },
        { status: 400 }
      );
    }

    await overrideClassification(tokenIds, classification);

    return NextResponse.json({ success: true, auditId: id });
  } catch (error) {
    console.error('[PATCH /api/audits/[id]/classify] Error:', error);
    return NextResponse.json(
      { error: 'Failed to override classification' },
      { status: 500 }
    );
  }
}
