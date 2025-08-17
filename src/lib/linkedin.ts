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
  await delay(2000); // Reduced from 3000ms
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  
  // Wait for and click Show results button
  await delay(300); // Reduced from 500ms
  const btnSelector = 'div[data-basic-filter-parameter-name="geoUrn"] button[aria-label="Apply current filter to show results"]';
  await waitForElement(page, btnSelector);
  await page.click(btnSelector);
  await page.waitForLoadState('domcontentloaded');

  let totalProcessed = 0;
  let currentPage = 1;
  
  while (currentPage <= maxPages) {
    console.log(`Scraping page ${currentPage}...`);
    
    // Wait for results to load
    await delay(1000); // Reduced from 2000ms

    // Optimized scrolling - use a single scroll to bottom with shorter delay
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(800); // Reduced from 1500ms and single scroll instead of multiple
    
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
        await processProfile(context, prisma, profileUrl, role, country);
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
    await delay(2000); // Reduced from 3000ms
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
  await delay(500); // Reduced from 1000ms

  console.log('start finding general person\'s info', profileUrl);
  
  // Batch all text extractions in parallel using evaluate
  const profileData = await page.evaluate(() => {
    const section = document.querySelector('section[data-member-id]');
    if (!section) return { fullName: '', headline: undefined, country: undefined };

    const fullName = section.querySelector('h1')?.textContent?.trim() || '';
    const headline = section.querySelector('div[data-generated-suggestion-target]')?.textContent?.trim();
    const country = section.querySelector('span.text-body-small.inline.t-black--light.break-words')?.textContent?.trim();

    return { fullName, headline, country };
  });

  // Experience section - use more specific selector and batch operations
  const firstExperienceSelector = 'div[data-view-name=profile-component-entity]';
  console.log('start waiting for first experience');
  await waitForElement(page, firstExperienceSelector);
  
  // Batch all experience data extraction in one evaluate call
  const experienceData = await page.evaluate(() => {
    const firstExperience = document.querySelector('a[data-field="experience_company_logo"]')?.closest('div[data-view-name="profile-component-entity"]') || document.querySelector('div[data-view-name=profile-component-entity]');
    if (!firstExperience) return { latestCompanyName: undefined, latestCompanyUrl: undefined, title: undefined, duration: undefined };

    const companyLink = firstExperience.querySelector('a[href*="/company/"]') as HTMLAnchorElement;
    if (!companyLink) return { latestCompanyName: undefined, latestCompanyUrl: undefined, title: undefined, duration: undefined };

    let latestCompanyUrl = companyLink.href;
    if (latestCompanyUrl && latestCompanyUrl.startsWith('/')) {
      latestCompanyUrl = 'https://www.linkedin.com' + latestCompanyUrl;
    }

    const companyImage = companyLink.querySelector('img') as HTMLImageElement;
    const latestCompanyName = companyImage?.alt;

    const title = firstExperience.querySelector('span[aria-hidden="true"]')?.textContent?.trim();
    const duration = firstExperience.querySelector('.pvs-entity__caption-wrapper')?.textContent?.trim();

    return { latestCompanyName, latestCompanyUrl, title, duration };
  });


  console.log('end of getting more info', experienceData);

  return { 
    ...profileData, 
    ...experienceData,
    description: undefined // Keep commented out as it was causing delays
  };
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
  await delay(500); // Reduced from 1000ms

  // Batch all company data extraction in one evaluate call
  const companyData = await page.evaluate(() => {
    const title = document.querySelector('h1')?.textContent?.trim();
    const description = document.querySelector('.org-about-module__description')?.textContent?.trim();
    const sizeLabel = document.querySelector('.ember-view.org-top-card-summary-info-list__info-item span')?.textContent?.trim();

    return { title, description, sizeLabel };
  });

  return companyData;
}

export function mapSizeLabelToEnum(sizeLabel?: string): 'RANGE_1_10' | 'RANGE_11_50' | 'RANGE_51_200' | 'RANGE_201_500' | 'RANGE_501_1000' | 'RANGE_1001_5000' | 'RANGE_5001_10000' | 'RANGE_10001_PLUS' | 'UNKNOWN' {
  if (!sizeLabel) return 'UNKNOWN';
  const label = sizeLabel.toLowerCase();
  if (label.includes('2-10')) return 'RANGE_1_10';
  if (label.includes('11-50')) return 'RANGE_11_50';
  if (label.includes('51-200')) return 'RANGE_51_200';
  if (label.includes('201-500')) return 'RANGE_201_500';
  if (label.includes('501-1K') || label.includes('501-1000')) return 'RANGE_501_1000';
  if (label.includes('1K-5K') || label.includes('1001-5000')) return 'RANGE_1001_5000';
  if (label.includes('5K-10K') || label.includes('5001-10000')) return 'RANGE_5001_10000';
  if (label.includes('10K+') || label.includes('10001+')) return 'RANGE_10001_PLUS';
  return 'UNKNOWN';
}

// Helper function to process a single profile
async function processProfile(context: any, prisma: PrismaClient, profileUrl: string, role: string, country: string): Promise<void> {
  const profilePage = await context.newPage();
  try {
    const data = await openProfileAndExtract(profilePage, profileUrl);
    
    if (!data.fullName) {
      return;
    }

    // Upsert person
    const person = await upsertPerson(prisma, profileUrl, data, role, country);
    
    // Handle company data if available
    if (data.latestCompanyName) {
      const companyId = await upsertCompany(prisma, data.latestCompanyName, data.latestCompanyUrl);
      
      // Create experience record
      await createExperience(prisma, person.id, companyId, data);
    }
    
    await delay(200); // Reduced from 500ms
  } finally {
    await profilePage.close();
  }
}

// Helper function to upsert a person
async function upsertPerson(prisma: PrismaClient, profileUrl: string, data: any, role: string, country: string) {
  return await prisma.person.upsert({
    where: { profileUrl },
    update: {
      fullName: data.fullName,
      headline: data.headline,
      country: data.country,
      searchingRole: role,
      searchingCountry: country,
    },
    create: {
      fullName: data.fullName,
      headline: data.headline,
      country: data.country,
      profileUrl,
      searchingRole: role,
      searchingCountry: country,
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