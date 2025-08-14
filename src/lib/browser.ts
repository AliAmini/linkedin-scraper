import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright';
import { env } from './env';
import { parseCookiesJson, validateCookies, convertToPlaywrightCookies } from './cookie-parser';

export async function launchBrowser(): Promise<Browser> {
  const browser = await chromium.launch({ 
    headless: env.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images',
      '--disable-javascript',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=site-per-process',
      '--disable-site-isolation-trials',
      '--disable-features=TranslateUI',
      '--disable-features=BlinkGenPropertyTrees',
      '--disable-features=ImprovedCookieControls',
      '--disable-features=MediaRouter',
      '--disable-features=OptimizationHints',
      '--disable-features=AudioServiceOutOfProcess',
      '--disable-features=UseChromeOSDirectVideoDecoder',
      '--disable-features=GlobalMediaControls',
      '--disable-features=LiveCaption',
      '--disable-features=Bluetooth',
      '--disable-features=WebUIDarkMode',
      '--disable-features=AutofillServerCommunication',
      '--disable-features=AutofillShowTypePredictions',
      '--disable-features=AutofillShowManualFallbackForPasswordFields',
    ],
   });
  return browser;
}

export async function newLinkedInContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  });

  if (env.cookiesJson) {
    try {
      const rawCookies = parseCookiesJson(env.cookiesJson);
      const validRawCookies = validateCookies(rawCookies);
      const linkedInRawCookies = validRawCookies.filter((c) => (c.domain || '').includes('linkedin.com'));
      
      if (linkedInRawCookies.length > 0) {
        const playwrightCookies = convertToPlaywrightCookies(linkedInRawCookies);
        await context.addCookies(playwrightCookies);
        console.log(`Added ${playwrightCookies.length} LinkedIn cookies to browser context`);
      }
    } catch (err) {
      console.warn('Failed to parse COOKIES_JSON, proceeding without cookies', err);
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