import { Browser, BrowserContext } from 'playwright';
import { getPrisma } from '../lib/db';
import { env } from '../lib/env';
import { ensureLoggedIn, mapSizeLabelToEnum, openCompanyAndExtract } from '../lib/linkedin';
import { launchBrowser, newLinkedInContext } from '../lib/browser';

export async function fetchCompaniesJob(): Promise<void> {
  const prisma = getPrisma();
  const browser: Browser = await launchBrowser();
  const context: BrowserContext = await newLinkedInContext(browser);
  const page = await context.newPage();

  try {
    await ensureLoggedIn(page);

    const companies = await prisma.company.findMany({
      where: { size: 'UNKNOWN', NOT: { linkedinUrl: null } },
      take: 200,
    });

    console.log(`Companies to fetch: ${companies.length}`);

    for (const company of companies) {
      if (!company.linkedinUrl) continue;
      try {
        const data = await openCompanyAndExtract(page, company.linkedinUrl);
        const sizeEnum = mapSizeLabelToEnum(data.sizeLabel);
        await prisma.company.update({
          where: { id: company.id },
          data: {
            name: data.title || company.name,
            description: data.description,
            size: sizeEnum,
            sizeLabel: data.sizeLabel,
          },
        });
        console.log(`Updated company: ${company.name} (${data.sizeLabel || 'UNKNOWN'})`);
      } catch (err) {
        console.warn('Failed fetching company', company.linkedinUrl, err);
      }
    }
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await prisma.$disconnect();
  }
} 