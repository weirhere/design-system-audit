// Phase 4: Layout/responsive extraction
// Multi-viewport crawl for grid/flex detection

import type { Page } from 'playwright-core';

export interface ExtractedLayoutData {
  viewport: number;
  layouts: LayoutInfo[];
}

export interface LayoutInfo {
  selector: string;
  display: string;
  flexDirection?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gap: string;
  childCount: number;
}

export const RESPONSIVE_VIEWPORTS = [320, 768, 1024, 1440, 1920];

export function getLayoutExtractionScript(): string {
  return `
    (() => {
      const layouts = [];
      const elements = document.querySelectorAll('*');
      const limit = Math.min(elements.length, 3000);

      for (let i = 0; i < limit; i++) {
        const el = elements[i];
        const style = getComputedStyle(el);
        const display = style.display;

        if (display === 'flex' || display === 'inline-flex' || display === 'grid' || display === 'inline-grid') {
          const info = {
            selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').filter(Boolean)[0] : ''),
            display,
            gap: style.gap,
            childCount: el.children.length,
          };

          if (display.includes('flex')) {
            info.flexDirection = style.flexDirection;
          }
          if (display.includes('grid')) {
            info.gridTemplateColumns = style.gridTemplateColumns;
            info.gridTemplateRows = style.gridTemplateRows;
          }

          layouts.push(info);
        }
      }

      return layouts;
    })()
  `;
}

export async function extractLayoutFromPage(
  page: Page,
  viewport: number
): Promise<ExtractedLayoutData> {
  try {
    await page.setViewportSize({ width: viewport, height: 900 });
    await page.waitForTimeout(500); // Allow reflow
    const layouts = await page.evaluate(getLayoutExtractionScript()) as LayoutInfo[];
    return { viewport, layouts };
  } catch {
    return { viewport, layouts: [] };
  }
}
