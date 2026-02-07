import { NextRequest, NextResponse } from 'next/server';
import { CrawlEngine } from '@/lib/crawl/engine';
import { getCrawl, setCrawl } from '@/lib/crawl/registry';
import { requireAuditOwner } from '@/lib/auth-helpers';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAuditOwner(id);
    if ('error' in result) return result.error;
    const { audit } = result;

    if (!['draft', 'crawled', 'error', 'complete'].includes(audit.status)) {
      return NextResponse.json(
        { error: `Cannot start crawl while audit is "${audit.status}". Wait for the current operation to finish.` },
        { status: 409 }
      );
    }

    if (getCrawl(id)) {
      return NextResponse.json(
        { error: 'A crawl is already running for this audit.' },
        { status: 409 }
      );
    }

    const productUrls: string[] = JSON.parse(audit.productUrls);
    if (productUrls.length === 0) {
      return NextResponse.json(
        { error: 'No product URLs configured. Add at least one URL in the setup page.' },
        { status: 400 }
      );
    }

    const engine = new CrawlEngine(id);
    setCrawl(id, engine);

    // Fire-and-forget: start the crawl without awaiting
    engine.start();

    return NextResponse.json(
      { status: 'started' },
      { status: 202 }
    );
  } catch (error) {
    console.error('[POST /api/audits/[id]/crawl] Error:', error);
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: `Failed to start crawl: ${message}` },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ownerResult = await requireAuditOwner(id);
  if ('error' in ownerResult) return ownerResult.error;

  const engine = getCrawl(id);

  if (!engine) {
    const status = ownerResult.audit?.status ?? 'unknown';

    const stream = new ReadableStream({
      start(controller) {
        const data = JSON.stringify({ type: 'status', data: { status } });
        controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // Active crawl -- stream progress events via SSE
  const activeEngine = engine;
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(type: string, data: unknown) {
        const payload = JSON.stringify({ type, data });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }

      const onProgress = (payload: unknown) => {
        send('progress', payload);
      };

      const onJobComplete = (payload: unknown) => {
        send('job-complete', payload);
      };

      const onError = (payload: unknown) => {
        send('error', payload);
        cleanup();
        controller.close();
      };

      const onComplete = (payload: unknown) => {
        send('complete', payload);
        cleanup();
        controller.close();
      };

      function cleanup() {
        activeEngine.progress.removeListener('progress', onProgress);
        activeEngine.progress.removeListener('job-complete', onJobComplete);
        activeEngine.progress.removeListener('error', onError);
        activeEngine.progress.removeListener('complete', onComplete);
      }

      activeEngine.progress.on('progress', onProgress);
      activeEngine.progress.on('job-complete', onJobComplete);
      activeEngine.progress.on('error', onError);
      activeEngine.progress.on('complete', onComplete);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
