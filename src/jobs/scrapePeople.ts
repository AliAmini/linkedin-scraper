import { Browser, BrowserContext } from 'playwright';
import { getPrisma } from '../lib/db';
import { env } from '../lib/env';
import { searchPeopleAndProcess } from '../lib/linkedin';
import { launchBrowserWithContext } from '../lib/browser';
import { ensureLoggedIn } from '../lib/scenarios';

export async function scrapePeopleJob(): Promise<void> {
  const prisma = getPrisma();
  const { browser, context } = await launchBrowserWithContext();
  const page = await context.newPage();

  try {
    await ensureLoggedIn(page);

    console.log(`Searching: role=${env.searchRole}, country=${env.searchCountry}`);
    const totalProcessed = await searchPeopleAndProcess(
      page, 
      context, 
      prisma, 
      env.searchRole, 
      env.searchCountry, 
      env.maxPagesToScrape
    );
    console.log(`Successfully processed ${totalProcessed} profiles for ${env.searchRole} in ${env.searchCountry}`);
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await prisma.$disconnect();
  }
} 