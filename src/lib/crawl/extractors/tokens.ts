import type { Page } from 'playwright-core';

export interface RawExtractedToken {
  layer: string;
  property: string;
  computedValue: string;
  rawValue: string | null;
  cssVariable: string | null;
  selector: string;
  frequency: number;
}

/**
 * Returns a stringified JS function body to be executed inside page.evaluate().
 * The script extracts design tokens from all visible elements on the page.
 */
export function getTokenExtractionScript(): string {
  return `
    (() => {
      const MAX_ELEMENTS = 5000;

      // Collect all elements, filter hidden, cap at MAX_ELEMENTS
      const allElements = Array.from(document.querySelectorAll('*'));
      const visibleElements = [];
      for (let i = 0; i < allElements.length && visibleElements.length < MAX_ELEMENTS; i++) {
        const el = allElements[i];
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || el.offsetParent === null) {
          // Exception: fixed/sticky positioned elements can have null offsetParent
          if (style.position !== 'fixed' && style.position !== 'sticky') {
            continue;
          }
        }
        visibleElements.push(el);
      }

      // Build a minimal selector for an element
      function getSelector(el) {
        if (el.id) return '#' + el.id;
        if (el.className && typeof el.className === 'string') {
          const cls = el.className.trim().split(/\\s+/).slice(0, 2).join('.');
          if (cls) return el.tagName.toLowerCase() + '.' + cls;
        }
        return el.tagName.toLowerCase();
      }

      // Deduplication map: key -> { token, frequency }
      const tokenMap = new Map();

      function addToken(layer, property, computedValue, rawValue, cssVariable, selector) {
        if (!computedValue || computedValue === 'none' || computedValue === 'normal' || computedValue === 'auto') {
          // Keep 'auto' for some properties
          if (computedValue !== 'auto' || (property !== 'gap' && property !== 'margin' && property !== 'padding')) {
            return;
          }
        }
        // Skip zero/default values for spacing
        if (layer === 'spacing' && computedValue === '0px') return;
        // Skip transparent colors
        if (layer === 'color' && (computedValue === 'rgba(0, 0, 0, 0)' || computedValue === 'transparent')) return;
        // Skip default border
        if (layer === 'border' && property === 'borderWidth' && computedValue === '0px') return;
        if (layer === 'border' && property === 'borderStyle' && computedValue === 'none') return;
        // Skip default opacity
        if (layer === 'opacity' && computedValue === '1') return;
        // Skip zero duration
        if (layer === 'motion' && (computedValue === '0s' || computedValue === '0ms')) return;

        const key = layer + '|' + property + '|' + computedValue;
        const existing = tokenMap.get(key);
        if (existing) {
          existing.frequency++;
        } else {
          tokenMap.set(key, {
            token: {
              layer: layer,
              property: property,
              computedValue: computedValue,
              rawValue: rawValue,
              cssVariable: cssVariable,
              selector: selector,
              frequency: 1,
            },
            frequency: 1,
          });
        }
      }

      // Extract tokens from each visible element
      for (const el of visibleElements) {
        const style = window.getComputedStyle(el);
        const sel = getSelector(el);

        // Color layer
        addToken('color', 'color', style.color, null, null, sel);
        addToken('color', 'backgroundColor', style.backgroundColor, null, null, sel);
        addToken('color', 'borderColor', style.borderColor, null, null, sel);

        // Typography layer
        addToken('typography', 'fontFamily', style.fontFamily, null, null, sel);
        addToken('typography', 'fontSize', style.fontSize, null, null, sel);
        addToken('typography', 'fontWeight', style.fontWeight, null, null, sel);
        addToken('typography', 'lineHeight', style.lineHeight, null, null, sel);
        addToken('typography', 'letterSpacing', style.letterSpacing, null, null, sel);

        // Spacing layer
        addToken('spacing', 'marginTop', style.marginTop, null, null, sel);
        addToken('spacing', 'marginRight', style.marginRight, null, null, sel);
        addToken('spacing', 'marginBottom', style.marginBottom, null, null, sel);
        addToken('spacing', 'marginLeft', style.marginLeft, null, null, sel);
        addToken('spacing', 'paddingTop', style.paddingTop, null, null, sel);
        addToken('spacing', 'paddingRight', style.paddingRight, null, null, sel);
        addToken('spacing', 'paddingBottom', style.paddingBottom, null, null, sel);
        addToken('spacing', 'paddingLeft', style.paddingLeft, null, null, sel);
        addToken('spacing', 'gap', style.gap, null, null, sel);

        // Elevation layer
        addToken('elevation', 'boxShadow', style.boxShadow, null, null, sel);

        // Border layer
        addToken('border', 'borderWidth', style.borderWidth, null, null, sel);
        addToken('border', 'borderStyle', style.borderStyle, null, null, sel);
        addToken('border', 'borderRadius', style.borderRadius, null, null, sel);

        // Motion layer
        addToken('motion', 'transitionDuration', style.transitionDuration, null, null, sel);
        addToken('motion', 'transitionTimingFunction', style.transitionTimingFunction, null, null, sel);
        addToken('motion', 'animationDuration', style.animationDuration, null, null, sel);

        // Opacity layer
        addToken('opacity', 'opacity', style.opacity, null, null, sel);
      }

      // Scan CSS custom properties from stylesheets
      const cssVariables = new Map();
      try {
        for (const sheet of document.styleSheets) {
          try {
            const rules = sheet.cssRules || sheet.rules;
            for (const rule of rules) {
              if (rule.style) {
                for (let i = 0; i < rule.style.length; i++) {
                  const prop = rule.style[i];
                  if (prop.startsWith('--')) {
                    const value = rule.style.getPropertyValue(prop).trim();
                    if (value && !cssVariables.has(prop)) {
                      cssVariables.set(prop, value);
                    }
                  }
                }
              }
            }
          } catch (e) {
            // SecurityError for cross-origin stylesheets - skip silently
          }
        }
      } catch (e) {
        // Outer catch for any unexpected errors scanning stylesheets
      }

      // Attempt to match CSS variables to extracted tokens
      for (const [varName, varValue] of cssVariables) {
        for (const [key, entry] of tokenMap) {
          if (entry.token.computedValue === varValue || entry.token.computedValue.includes(varValue)) {
            if (!entry.token.cssVariable) {
              entry.token.cssVariable = varName;
              entry.token.rawValue = 'var(' + varName + ')';
            }
          }
        }
      }

      // Build final results array with correct frequency counts
      const results = [];
      for (const [, entry] of tokenMap) {
        entry.token.frequency = entry.frequency;
        results.push(entry.token);
      }

      return results;
    })()
  `;
}

/**
 * Runs the token extraction script inside a Playwright page and returns typed results.
 */
export async function extractTokensFromPage(
  page: Page,
  url: string
): Promise<RawExtractedToken[]> {
  try {
    const tokens = await page.evaluate(getTokenExtractionScript());
    return (tokens as RawExtractedToken[]) || [];
  } catch (error) {
    console.error(`[tokens] Extraction failed for ${url}:`, error);
    return [];
  }
}
