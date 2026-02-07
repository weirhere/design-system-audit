import { NextRequest, NextResponse } from 'next/server';
import { getRoadmap, generateRoadmap } from '@/lib/analysis/roadmap';
import { requireAuditOwner } from '@/lib/auth-helpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAuditOwner(id);
    if ('error' in result) return result.error;

    let tasks = await getRoadmap(id);

    if (tasks.length === 0) {
      await generateRoadmap(id);
      tasks = await getRoadmap(id);
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('[GET /api/audits/[id]/roadmap] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roadmap' },
      { status: 500 }
    );
  }
}
