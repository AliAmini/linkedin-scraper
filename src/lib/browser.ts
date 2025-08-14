import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright';
import { env } from './env';
import { parseCookiesJson, validateCookies, convertToPlaywrightCookies } from './cookie-parser';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

function findChromeExecutable(): string | undefined {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome Beta', 'Application', 'chrome.exe'),
  ];

  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  
  return undefined;
}

export async function launchBrowser(): Promise<Browser> {
  if (env.useExistingChromeProfile) {
    // Use launchPersistentContext for existing Chrome profile
    const userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
    const chromeExecutable = findChromeExecutable();
    
    if (!chromeExecutable) {
      console.warn('Chrome executable not found, falling back to bundled Chromium');
    }
    
    console.log('Using existing Chrome profile with saved cookies and sessions');
    
    // Note: This will return a BrowserContext instead of Browser
    // We need to modify the calling code to handle this
    throw new Error('Use launchBrowserWithContext() instead of launchBrowser() when using existing Chrome profile');
  } else {
    // Use regular browser launch for bundled Chromium
    console.log('Using Playwright\'s bundled Chromium (no existing profile)');
    
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
}

export async function launchBrowserWithContext(): Promise<{ browser: Browser; context: BrowserContext }> {
  if (env.useExistingChromeProfile) {
    // Use a separate user data directory to avoid conflicts with running Chrome
    const userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'LinkedInScraper', 'ChromeData');
    const chromeExecutable = findChromeExecutable();
    
    if (!chromeExecutable) {
      console.warn('Chrome executable not found, falling back to bundled Chromium');
    }
    
    console.log('Using separate Chrome profile for scraper');
    
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: env.headless,
      executablePath: chromeExecutable,
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
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
    
    // For persistent context, we need to return a mock browser object
    const mockBrowser = {
      newContext: () => Promise.resolve(context),
      close: () => context.close(),
    } as any;
    
    return { browser: mockBrowser, context };
  } else {
    // Use regular browser launch for bundled Chromium
    console.log('Using Playwright\'s bundled Chromium (no existing profile)');
    
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
    
    const context = await newLinkedInContext(browser);
    return { browser, context };
  }
}

export async function newLinkedInContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  });

  // Inject cookies if available (for separate profile approach)
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
  } else {
    console.log('No COOKIES_JSON provided - you may need to log in manually');
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