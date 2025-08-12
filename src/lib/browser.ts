import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright';
import { env } from './env';

export async function launchBrowser(): Promise<Browser> {
  const browser = await chromium.launch({ headless: true });
  return browser;
}

export async function newLinkedInContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  if (env.cookiesJson) {
    try {
      const cookies: Cookie[] = JSON.parse(env.cookiesJson);
      const linkedInCookies = cookies.filter((c) => (c.domain || '').includes('linkedin.com'));
      if (linkedInCookies.length > 0) {
        await context.addCookies(linkedInCookies);
      }
    } catch (err) {
      console.warn('Failed to parse COOKIES_JSON, proceeding without cookies');
    }
  }

  return context;
}

export async function newPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.addInitScript(() => {
    // Minimal stealth: mask webdriver
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  return page;
} 