import { NextRequest, NextResponse } from 'next/server';
import { CrawlEngine } from '@/lib/crawl/engine';
import { requireAuditOwner } from '@/lib/auth-helpers';

export const maxDuration = 300;

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

    const productUrls: string[] = JSON.parse(audit.productUrls);
    if (productUrls.length === 0) {
      return NextResponse.json(
        { error: 'No product URLs configured. Add at least one URL in the setup page.' },
        { status: 400 }
      );
    }

    const engine = new CrawlEngine(id);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        let closed = false;

        function send(type: string, data: unknown) {
          if (closed) return;
          const payload = JSON.stringify({ type, data });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        }

        // Send initial event immediately to flush Vercel's response buffer
        send('start', { message: 'Connecting to browser...', progress: 0 });

        function closeStream() {
          if (closed) return;
          closed = true;
          cleanup();
          controller.close();
        }

        const onStart = (payload: unknown) => send('start', payload);
        const onProgress = (payload: unknown) => send('progress', payload);
        const onJobComplete = (payload: unknown) => send('job-complete', payload);

        const onError = (payload: unknown) => {
          send('error', payload);
          closeStream();
        };

        const onComplete = (payload: unknown) => {
          send('complete', payload);
          closeStream();
        };

        function cleanup() {
          engine.progress.removeListener('start', onStart);
          engine.progress.removeListener('progress', onProgress);
          engine.progress.removeListener('job-complete', onJobComplete);
          engine.progress.removeListener('error', onError);
          engine.progress.removeListener('complete', onComplete);
        }

        engine.progress.on('start', onStart);
        engine.progress.on('progress', onProgress);
        engine.progress.on('job-complete', onJobComplete);
        engine.progress.on('error', onError);
        engine.progress.on('complete', onComplete);

        // Start the crawl within this streaming response
        engine.start().catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          send('error', { message });
          closeStream();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
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

  const status = ownerResult.audit?.status ?? 'unknown';
  return NextResponse.json({ status });
}
