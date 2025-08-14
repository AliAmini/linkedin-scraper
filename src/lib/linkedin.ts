import { Page } from 'playwright';
import { waitForClickable, waitForElement } from './elements.helper';
import { delay } from './functions.helper';

export async function searchPeople(page: Page, role: string, country: string): Promise<string[]> {
  await page.goto('https://www.linkedin.com/feed/');
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for search input to be available
  await waitForElement(page, 'input[placeholder="Search"]', 10000);
  await page.click('input[placeholder="Search"]');
  await page.fill('input[placeholder="Search"]', role);
  await page.keyboard.press('Enter');
  await page.waitForLoadState('domcontentloaded');

  // Wait for and click People tab
  await waitForClickable(page, 'nav[aria-label="Search filters"] button:has-text("People")');
  await page.click('nav[aria-label="Search filters"] button:has-text("People")');
  await page.waitForLoadState('domcontentloaded');

  // Wait for and click Locations button
  await waitForClickable(page, 'nav[aria-label="Search filters"] button:has-text("Locations")');
  await page.click('nav[aria-label="Search filters"] button:has-text("Locations")');

  // Wait for and fill location input
  await waitForElement(page, 'input[placeholder="Add a location"]');
  await page.fill('input[placeholder="Add a location"]', country);
  await delay(3000); // Delay for dropdown to appear
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  
  // Wait for and click Show results button
  await waitForElement(page, 'button:has-text("Show results")');
  await page.click('button:has-text("Show results")');
  await page.waitForLoadState('domcontentloaded');

  // Infinite scroll to collect profile links
  const collected = new Set<string>();
  for (let i = 0; i < 10; i++) {
    const links = await page
      .locator('a[data-test-app-aware-link][href*="/in/"]')
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

  const fullName = (await page.locator('section[data-member-id] h1').first().textContent().catch(() => ''))?.trim() || '';
  const headline = (await page.locator('section[data-member-id] div[data-generated-suggestion-target]').first().textContent().catch(() => ''))?.trim() || undefined;
  const country = (await page.locator('section[data-member-id] span.text-body-small.inline.t-black--light.break-words').first().textContent().catch(() => ''))?.trim() || undefined;

  // Experience section selectors may vary; try a few
  const firstExperienceItem = page.locator('div[data-view-name=profile-component-entity]').first();
  let latestCompanyName: string | undefined;
  let latestCompanyUrl: string | undefined;
  let title: string | undefined;

  if (await firstExperienceItem.isVisible().catch(() => false)) {
    const companyLink = firstExperienceItem.locator('a[href*="/company/"]').first();

    latestCompanyUrl = (await companyLink.getAttribute('href').catch(() => null)) || undefined;
    if (latestCompanyUrl && latestCompanyUrl.startsWith('/')) {
      latestCompanyUrl = 'https://www.linkedin.com' + latestCompanyUrl;
    }
    const companyImage = companyLink.locator('img').first();
    latestCompanyName = (await companyImage.getAttribute('alt').catch(() => null)) || undefined;
    title = (await firstExperienceItem.locator('span[aria-hidden="true"]').first().textContent().catch(() => ''))?.trim() || undefined;
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