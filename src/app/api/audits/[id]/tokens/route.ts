import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { extractedTokens } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const { searchParams } = request.nextUrl;
    const layer = searchParams.get('layer');
    const classification = searchParams.get('classification');
    const sourceProduct = searchParams.get('sourceProduct');

    const conditions = [eq(extractedTokens.auditId, id)];

    if (layer) {
      conditions.push(eq(extractedTokens.layer, layer as typeof extractedTokens.layer.enumValues[number]));
    }

    if (classification) {
      conditions.push(eq(extractedTokens.classification, classification as typeof extractedTokens.classification.enumValues[number]));
    }

    if (sourceProduct) {
      conditions.push(eq(extractedTokens.sourceProduct, sourceProduct));
    }

    const tokens = await db
      .select()
      .from(extractedTokens)
      .where(and(...conditions));

    return NextResponse.json(tokens);
  } catch (error) {
    console.error('[GET /api/audits/[id]/tokens] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}
