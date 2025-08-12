import { BrowserContext, Page } from 'playwright';
import { env } from './env';

export async function ensureLoggedIn(page: Page): Promise<void> {
  await page.goto('https://www.linkedin.com/feed/');
  if (await page.locator('input#session_key').first().isVisible().catch(() => false)) {
    if (!env.linkedinEmail || !env.linkedinPassword) {
      throw new Error('Not logged in and LINKEDIN_EMAIL/PASSWORD not provided. Provide COOKIES_JSON or credentials.');
    }
    await page.fill('input#session_key', env.linkedinEmail);
    await page.fill('input#session_password', env.linkedinPassword);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('button[type="submit"]:has-text("Sign in")'),
    ]);
  }
}

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchPeople(page: Page, role: string, country: string): Promise<string[]> {
  await page.goto('https://www.linkedin.com/feed/');
  await page.waitForLoadState('domcontentloaded');
  await page.click('input[placeholder="Search"]', { timeout: 10000 }).catch(() => {});
  await page.fill('input[placeholder="Search"]', role);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.keyboard.press('Enter'),
  ]);

  // Switch to People tab
  const peopleTab = page.locator('button[aria-label="People"]');
  if (await peopleTab.isVisible().catch(() => false)) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      peopleTab.click(),
    ]);
  }

  // Open All filters
  const allFilters = page.locator('button:has-text("All filters")');
  if (await allFilters.isVisible().catch(() => false)) {
    await allFilters.click();
    // Set Locations
    const locationsInput = page.locator('input[placeholder="Add a location"]');
    if (await locationsInput.isVisible().catch(() => false)) {
      await locationsInput.fill(country);
      await delay(500);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }
    const showResults = page.locator('button:has-text("Show results")');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      showResults.click(),
    ]);
  }

  // Infinite scroll to collect profile links
  const collected = new Set<string>();
  for (let i = 0; i < 10; i++) {
    const links = await page
      .locator('a.app-aware-link[href*="/in/"]')
      .evaluateAll((elements: Element[]) => elements.map((el) => (el as HTMLAnchorElement).href));
    links.forEach((l: string) => collected.add(l.split('?')[0]));
    await page.mouse.wheel(0, 2000);
    await delay(800);
  }

  return Array.from(collected);
}

export async function openProfileAndExtract(page: Page, profileUrl: string): Promise<{
  fullName: string;
  headline?: string;
  country?: string;
  latestCompanyName?: string;
  latestCompanyUrl?: string;
  title?: string;
}> {
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
  await delay(1000);

  const fullName = (await page.locator('h1.text-heading-xlarge').first().textContent().catch(() => ''))?.trim() || '';
  const headline = (await page.locator('div.text-body-medium.break-words').first().textContent().catch(() => ''))?.trim() || undefined;
  const country = (await page.locator('span.text-body-small.inline.t-black--light.break-words').first().textContent().catch(() => ''))?.trim() || undefined;

  // Experience section selectors may vary; try a few
  const experienceSection = page.locator('section[id*="experience"]');
  let latestCompanyName: string | undefined;
  let latestCompanyUrl: string | undefined;
  let title: string | undefined;

  if (await experienceSection.isVisible().catch(() => false)) {
    const firstItem = experienceSection.locator('li.artdeco-list__item').first();
    const companyLink = firstItem.locator('a[href*="/company/"]').first();
    latestCompanyUrl = (await companyLink.getAttribute('href').catch(() => null)) || undefined;
    if (latestCompanyUrl && latestCompanyUrl.startsWith('/')) {
      latestCompanyUrl = 'https://www.linkedin.com' + latestCompanyUrl;
    }
    latestCompanyName = (await companyLink.textContent().catch(() => ''))?.trim() || undefined;
    if (!latestCompanyName) {
      latestCompanyName = (await firstItem.locator('span.t-14.t-normal').first().textContent().catch(() => ''))?.trim() || undefined;
    }
    title = (await firstItem.locator('span[aria-hidden="true"]').first().textContent().catch(() => ''))?.trim() || undefined;
  }

  return { fullName, headline, country, latestCompanyName, latestCompanyUrl, title };
}

export async function openCompanyAndExtract(page: Page, companyUrl: string): Promise<{
  title?: string;
  description?: string;
  sizeLabel?: string;
}> {
  let url = companyUrl;
  if (!url.includes('/about')) {
    url = companyUrl.replace(/\/?$/, '/about/');
  }
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await delay(1000);

  const title = (await page.locator('h1').first().textContent().catch(() => ''))?.trim() || undefined;

  let description = (await page.locator('p.break-words.white-space-pre-wrap').first().textContent().catch(() => ''))?.trim() || undefined;
  if (!description) {
    description = (await page.locator('div.org-grid__core-rail--no-margin-left p').first().textContent().catch(() => ''))?.trim() || undefined;
  }

  let sizeLabel: string | undefined;
  const factsText = await page.locator('dt:has-text("Company size") + dd').first().textContent().catch(() => '');
  sizeLabel = factsText?.trim() || undefined;

  return { title, description, sizeLabel };
}

export function mapSizeLabelToEnum(sizeLabel?: string): 'RANGE_1_10' | 'RANGE_11_50' | 'RANGE_51_200' | 'RANGE_201_500' | 'RANGE_501_1000' | 'RANGE_1001_5000' | 'RANGE_5001_10000' | 'RANGE_10001_PLUS' | 'UNKNOWN' {
  if (!sizeLabel) return 'UNKNOWN';
  const label = sizeLabel.toLowerCase();
  if (label.includes('1-10')) return 'RANGE_1_10';
  if (label.includes('11-50')) return 'RANGE_11_50';
  if (label.includes('51-200')) return 'RANGE_51_200';
  if (label.includes('201-500')) return 'RANGE_201_500';
  if (label.includes('501-1,000') || label.includes('501-1000')) return 'RANGE_501_1000';
  if (label.includes('1,001-5,000') || label.includes('1001-5000')) return 'RANGE_1001_5000';
  if (label.includes('5,001-10,000') || label.includes('5001-10000')) return 'RANGE_5001_10000';
  if (label.includes('10,001+') || label.includes('10001+')) return 'RANGE_10001_PLUS';
  return 'UNKNOWN';
} 