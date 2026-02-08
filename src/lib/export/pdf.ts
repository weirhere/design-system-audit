import { connectBrowser } from '@/lib/browser';
import { exportHtmlReport } from './html';

export async function exportPdfReport(auditId: string): Promise<Buffer> {
  const html = await exportHtmlReport(auditId);

  const browser = await connectBrowser();

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      printBackground: true,
    });

    await context.close();
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
