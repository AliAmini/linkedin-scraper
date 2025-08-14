import { Page } from 'playwright';
import { waitForClickable, waitForElement } from './elements.helper';
import { delay } from './functions.helper';
import { PrismaClient } from '@prisma/client';

export async function searchPeopleAndProcess(
  page: Page, 
  context: any, 
  prisma: PrismaClient,
  role: string, 
  country: string, 
  maxPages: number = 100
): Promise<number> {
  await page.goto('https://www.linkedin.com/feed/');
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for search input to be available
  await waitForElement(page, 'input[placeholder="Search"]');
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
  await delay(500);
  const btnSelector = 'div[data-basic-filter-parameter-name="geoUrn"] button[aria-label="Apply current filter to show results"]';
  await waitForElement(page, btnSelector);
  await page.click(btnSelector);
  await page.waitForLoadState('domcontentloaded');

  let totalProcessed = 0;
  let currentPage = 1;
  
  while (currentPage <= maxPages) {
    console.log(`Scraping page ${currentPage}...`);
    
    // Wait for results to load
    await delay(2000);

    // Scroll to the bottom to trigger any lazy loading/infinite scroll
    let lastHeight = await page.evaluate(() => document.body.scrollHeight);
    let scrollAttempts = 0;
    const maxScrollAttempts = 5;
    while (scrollAttempts < maxScrollAttempts) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await delay(1500);
      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === lastHeight) {
        // No more content loaded, break
        break;
      }
      lastHeight = newHeight;
      scrollAttempts++;
    }
    
    // Collect profile links from current page
    const links = await page
      .locator('a[data-test-app-aware-link][href*="/in/"]')
      .evaluateAll((elements: Element[]) => elements.map((el) => (el as HTMLAnchorElement).href));
    
    // Remove query parameters and duplicates
    const uniqueLinks = [...new Set(links.map((l: string) => l.split('?')[0]))];
    
    console.log(`Found ${uniqueLinks.length} profiles on page ${currentPage}`);
    
    // Process each profile immediately
    for (const profileUrl of uniqueLinks) {
      try {
        await processProfile(context, prisma, profileUrl);
        totalProcessed++;
        
        if (totalProcessed % 5 === 0) {
          console.log(`Processed ${totalProcessed} profiles so far...`);
        }
      } catch (err) {
        console.warn('Failed processing profile:', profileUrl, err);
      }
    }
    
    // Check if there's a next page
    const hasNextPage = await hasNextPageAvailable(page);
    if (!hasNextPage) {
      console.log('No more pages available, stopping pagination');
      break;
    }
    
    // Click next page
    await clickNextPage(page);
    currentPage++;
    
    // Add delay between pages to avoid rate limiting
    await delay(3000);
  }

  return totalProcessed;
}

async function hasNextPageAvailable(page: Page): Promise<boolean> {
  try {
    // Look for next button - LinkedIn typically uses "Next" or arrow buttons
    const nextButton = page.locator('button[aria-label="Next"]').first();
    
    // Check if any of these buttons exist and are enabled
    const nextExists = await nextButton.isVisible().catch(() => false);
    
    if (nextExists) {
      const disabled = await nextButton.getAttribute('disabled').catch(() => null);
      return disabled === null;
    }
    
    return false;
  } catch (error) {
    console.warn('Error checking for next page:', error);
    return false;
  }
}

async function clickNextPage(page: Page): Promise<boolean> {
  try {
    // Try different selectors for the next button
    const nextButton = page.locator('button[aria-label="Next"]').first();
    const nextButtonAlt = page.locator('button:has-text("Next")').first();
    const arrowButton = page.locator('button[aria-label*="Next"]').first();
    
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      return true;
    }
    if (await nextButtonAlt.isVisible().catch(() => false)) {
      await nextButtonAlt.click();
      return true;
    }
    if (await arrowButton.isVisible().catch(() => false)) {
      await arrowButton.click();
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('Error clicking next page:', error);
    return false;
  }
}

export async function openProfileAndExtract(page: Page, profileUrl: string): Promise<{
  fullName: string;
  headline?: string;
  country?: string;
  latestCompanyName?: string;
  latestCompanyUrl?: string;
  title?: string;
  description?: string;
  duration?: string;
}> {
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
  await delay(1000);

  console.log('start finding general person\'s info', profileUrl);
  const fullName = (await page.locator('section[data-member-id] h1').first().textContent().catch(() => ''))?.trim() || '';
  const headline = (await page.locator('section[data-member-id] div[data-generated-suggestion-target]').first().textContent().catch(() => ''))?.trim() || undefined;
  const country = (await page.locator('section[data-member-id] span.text-body-small.inline.t-black--light.break-words').first().textContent().catch(() => ''))?.trim() || undefined;

  // Experience section selectors may vary; try a few
  const firstExperienceSelector = 'div[data-view-name=profile-component-entity]';
  console.log('start waiting for first experience');
  await waitForElement(page, firstExperienceSelector);
  const firstExperienceItem = page.locator(firstExperienceSelector).first();
  let latestCompanyName: string | undefined;
  let latestCompanyUrl: string | undefined;
  let title: string | undefined;
  let description: string | undefined;
  let duration: string | undefined;

  console.log('Checking first experience is visible');
  if (await firstExperienceItem.isVisible().catch(() => false)) {
    const companyLink = firstExperienceItem.locator('a[href*="/company/"]').first();

    console.log('start getting more info');
    latestCompanyUrl = (await companyLink.getAttribute('href').catch(() => null)) || undefined;
    if (latestCompanyUrl && latestCompanyUrl.startsWith('/')) {
      latestCompanyUrl = 'https://www.linkedin.com' + latestCompanyUrl;
    }
    const companyImage = companyLink.locator('img').first();
    console.log('Extracting latestCompanyName');
    latestCompanyName = (await companyImage.getAttribute('alt').catch(() => null)) || undefined;

    console.log('Extracting title');
    title = (await firstExperienceItem.locator('span[aria-hidden="true"]').first().textContent().catch(() => ''))?.trim() || undefined;

    console.log('Extracting description');
    // # Commented Because of making a lot of delay
    // description = (await firstExperienceItem.locator('.pvs-entity__sub-components').first().textContent().catch(() => ''))?.trim() || undefined;

    console.log('Extracting duration');
    duration = (await firstExperienceItem.locator('.pvs-entity__caption-wrapper').first().textContent().catch(() => ''))?.trim() || undefined;
    console.log('end of getting more info');
  } else {
    console.log('don\'t have more info');
  }

  return { fullName, headline, country, latestCompanyName, latestCompanyUrl, title, description, duration };
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

// Helper function to process a single profile
async function processProfile(context: any, prisma: PrismaClient, profileUrl: string): Promise<void> {
  const profilePage = await context.newPage();
  try {
    const data = await openProfileAndExtract(profilePage, profileUrl);
    
    if (!data.fullName) {
      return;
    }

    // Upsert person
    const person = await upsertPerson(prisma, profileUrl, data);
    
    // Handle company data if available
    if (data.latestCompanyName) {
      const companyId = await upsertCompany(prisma, data.latestCompanyName, data.latestCompanyUrl);
      
      // Create experience record
      await createExperience(prisma, person.id, companyId, data);
    }
    
    await delay(500);
  } finally {
    await profilePage.close();
  }
}

// Helper function to upsert a person
async function upsertPerson(prisma: PrismaClient, profileUrl: string, data: any) {
  return await prisma.person.upsert({
    where: { profileUrl },
    update: {
      fullName: data.fullName,
      headline: data.headline,
      country: data.country,
    },
    create: {
      fullName: data.fullName,
      headline: data.headline,
      country: data.country,
      profileUrl,
    },
  });
}

// Helper function to upsert a company
async function upsertCompany(prisma: PrismaClient, companyName: string, companyUrl?: string): Promise<number> {
  if (companyUrl) {
    const existing = await prisma.company.findUnique({ where: { linkedinUrl: companyUrl } });
    if (existing) {
      const updated = await prisma.company.update({
        where: { id: existing.id },
        data: { name: companyName },
      });
      return updated.id;
    } else {
      const created = await prisma.company.create({
        data: { name: companyName, linkedinUrl: companyUrl },
      });
      return created.id;
    }
  } else {
    // No company URL; try find by name, else create without URL
    const existingByName = await prisma.company.findFirst({ where: { name: companyName } });
    if (existingByName) {
      return existingByName.id;
    } else {
      const createdNoUrl = await prisma.company.create({ data: { name: companyName } });
      return createdNoUrl.id;
    }
  }
}

// Helper function to create experience record
async function createExperience(prisma: PrismaClient, personId: number, companyId: number, data: any): Promise<void> {
  await prisma.experience.create({
    data: {
      personId: personId,
      companyId: companyId,
      companyName: data.latestCompanyName,
      companyUrl: data.latestCompanyUrl,
      title: data.title,
      isCurrent: true,
      description: data.description,
      duration: data.duration
    },
  });
} 