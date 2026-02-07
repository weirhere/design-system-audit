// Phase 4: Pattern recognition
// Detects navigation, forms, data-display, feedback, layout patterns

import type { Page } from 'playwright-core';

export interface ExtractedPatternData {
  category: string;
  name: string;
  componentSelectors: string[];
  frequency: number;
}

export function getPatternExtractionScript(): string {
  return `
    (() => {
      const patterns = [];

      // Navigation patterns
      const navs = document.querySelectorAll('nav');
      navs.forEach(nav => {
        const links = nav.querySelectorAll('a');
        if (links.length > 2) {
          patterns.push({
            category: 'navigation',
            name: links.length > 6 ? 'mega-nav' : 'standard-nav',
            componentSelectors: ['nav'],
            frequency: 1,
          });
        }
      });

      // Form patterns
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        const name = inputs.length > 5 ? 'complex-form' : 'simple-form';
        patterns.push({
          category: 'forms',
          name,
          componentSelectors: ['form'],
          frequency: 1,
        });
      });

      // Data display patterns
      const tables = document.querySelectorAll('table');
      if (tables.length > 0) {
        patterns.push({
          category: 'data-display',
          name: 'data-table',
          componentSelectors: ['table'],
          frequency: tables.length,
        });
      }

      // Card/list patterns
      const lists = document.querySelectorAll('ul, ol');
      const cardLists = Array.from(lists).filter(l => l.children.length > 2);
      if (cardLists.length > 0) {
        patterns.push({
          category: 'data-display',
          name: 'list-layout',
          componentSelectors: ['ul', 'ol'],
          frequency: cardLists.length,
        });
      }

      // Feedback patterns
      const alerts = document.querySelectorAll('[role="alert"], [role="status"], .alert, .toast, .notification');
      if (alerts.length > 0) {
        patterns.push({
          category: 'feedback',
          name: 'alert',
          componentSelectors: ['[role="alert"]'],
          frequency: alerts.length,
        });
      }

      return patterns;
    })()
  `;
}

export async function extractPatternsFromPage(
  page: Page,
  _url: string
): Promise<ExtractedPatternData[]> {
  try {
    return await page.evaluate(getPatternExtractionScript());
  } catch {
    return [];
  }
}
