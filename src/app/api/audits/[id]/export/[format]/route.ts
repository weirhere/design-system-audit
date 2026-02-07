import { NextRequest, NextResponse } from 'next/server';
import { requireAuditOwner } from '@/lib/auth-helpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; format: string }> }
) {
  try {
    const { id, format } = await params;
    const result = await requireAuditOwner(id);
    if ('error' in result) return result.error;

    switch (format) {
      case 'json': {
        const { exportAuditJson } = await import('@/lib/export/json');
        const json = await exportAuditJson(id);

        return new NextResponse(json, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="audit-${id}.json"`,
          },
        });
      }

      case 'csv':
      case 'csv-tokens': {
        const { exportTokensCsv } = await import('@/lib/export/csv');
        const csv = await exportTokensCsv(id);

        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit-${id}-tokens.csv"`,
          },
        });
      }

      case 'csv-comparison': {
        const { exportComparisonCsv } = await import('@/lib/export/csv');
        const csv = await exportComparisonCsv(id);

        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit-${id}-comparison.csv"`,
          },
        });
      }

      case 'html': {
        const { exportHtmlReport } = await import('@/lib/export/html');
        const html = await exportHtmlReport(id);

        return new NextResponse(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `attachment; filename="audit-${id}-report.html"`,
          },
        });
      }

      case 'pdf': {
        const { exportPdfReport } = await import('@/lib/export/pdf');
        const pdf = await exportPdfReport(id);

        return new NextResponse(new Uint8Array(pdf), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="audit-${id}-report.pdf"`,
          },
        });
      }

      case 'tickets': {
        const { exportJiraTickets } = await import('@/lib/export/tickets');
        const tickets = await exportJiraTickets(id);

        return new NextResponse(tickets, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="audit-${id}-tickets.json"`,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unsupported export format: "${format}". Supported formats: json, csv, html, pdf, tickets` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[GET /api/audits/[id]/export/[format]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export audit' },
      { status: 500 }
    );
  }
}
