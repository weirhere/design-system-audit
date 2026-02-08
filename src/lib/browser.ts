import { chromium, type Browser } from 'playwright-core';

/**
 * Connect to a browser instance.
 * - When BROWSERLESS_TOKEN is set: connects to Browserless.io via CDP (for Vercel/production)
 * - When unset: launches a local Chromium process (for local development)
 */
export async function connectBrowser(): Promise<Browser> {
  const token = process.env.BROWSERLESS_TOKEN;

  if (token) {
    return chromium.connectOverCDP(
      `wss://production-sfo.browserless.io?token=${token}`
    );
  }

  return chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}
