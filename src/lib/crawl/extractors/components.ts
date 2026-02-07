// Phase 4: Component extraction
// Detects semantic HTML + ARIA roles + class pattern heuristics

import type { Page } from 'playwright-core';

export interface ExtractedComponentData {
  name: string;
  selector: string;
  variants: string[];
  states: string[];
  htmlSnapshot: string;
  frequency: number;
}

export function getComponentExtractionScript(): string {
  return `
    (() => {
      const components = [];

      // Detect by ARIA roles
      const roleElements = document.querySelectorAll('[role]');
      const roleCounts = {};
      roleElements.forEach(el => {
        const role = el.getAttribute('role');
        if (!role) return;
        if (!roleCounts[role]) roleCounts[role] = { count: 0, selector: '', html: '' };
        roleCounts[role].count++;
        if (!roleCounts[role].selector) {
          roleCounts[role].selector = el.tagName.toLowerCase() + '[role="' + role + '"]';
          roleCounts[role].html = el.outerHTML.slice(0, 500);
        }
      });

      Object.entries(roleCounts).forEach(([role, data]) => {
        components.push({
          name: 'aria-' + role,
          selector: data.selector,
          variants: [],
          states: [],
          htmlSnapshot: data.html,
          frequency: data.count,
        });
      });

      // Detect common semantic elements
      const semanticSelectors = [
        { selector: 'nav', name: 'Navigation' },
        { selector: 'form', name: 'Form' },
        { selector: 'table', name: 'Table' },
        { selector: 'dialog', name: 'Dialog' },
        { selector: 'details', name: 'Details' },
        { selector: '[data-component]', name: 'DataComponent' },
      ];

      semanticSelectors.forEach(({ selector, name }) => {
        const els = document.querySelectorAll(selector);
        if (els.length > 0) {
          components.push({
            name,
            selector,
            variants: [],
            states: [],
            htmlSnapshot: els[0].outerHTML.slice(0, 500),
            frequency: els.length,
          });
        }
      });

      return components;
    })()
  `;
}

export async function extractComponentsFromPage(
  page: Page,
  _url: string
): Promise<ExtractedComponentData[]> {
  try {
    return await page.evaluate(getComponentExtractionScript());
  } catch {
    return [];
  }
}
