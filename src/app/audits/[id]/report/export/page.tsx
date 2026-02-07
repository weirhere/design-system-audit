'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ExportOption {
  format: string;
  title: string;
  description: string;
  filename: string;
}

const exportOptions: ExportOption[] = [
  {
    format: 'json',
    title: 'JSON',
    description: 'Full audit data as structured JSON. Ideal for programmatic consumption.',
    filename: 'audit-export.json',
  },
  {
    format: 'csv-tokens',
    title: 'CSV (Tokens)',
    description: 'Extracted tokens in CSV format for spreadsheet analysis.',
    filename: 'tokens.csv',
  },
  {
    format: 'csv-comparison',
    title: 'CSV (Comparison)',
    description: 'Comparison matrix as CSV with divergence scores.',
    filename: 'comparison.csv',
  },
  {
    format: 'html',
    title: 'HTML Report',
    description: 'Self-contained HTML report for sharing with stakeholders.',
    filename: 'audit-report.html',
  },
  {
    format: 'pdf',
    title: 'PDF Report',
    description: 'Printable PDF report with charts and data tables.',
    filename: 'audit-report.pdf',
  },
  {
    format: 'tickets',
    title: 'Jira Tickets',
    description: 'Migration tasks formatted as importable Jira tickets (CSV).',
    filename: 'jira-tickets.csv',
  },
];

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (option: ExportOption) => {
    if (!id) return;
    setDownloading(option.format);
    try {
      const res = await fetch(`/api/audits/${id}/export/${option.format}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(data.error || 'Download failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = option.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Export</h2>
      <p className="text-sm text-slate-500">
        Download audit data in various formats for analysis, reporting, and task tracking.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exportOptions.map((option) => (
          <Card key={option.format}>
            <CardHeader>
              <CardTitle>{option.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">{option.description}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownload(option)}
                disabled={downloading === option.format}
                className="w-full"
              >
                {downloading === option.format ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <path
                        d="M7 1v9M3 7l4 4 4-4M2 12h10"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Download
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
