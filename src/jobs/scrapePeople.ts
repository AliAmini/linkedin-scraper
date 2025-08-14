import { Browser, BrowserContext } from 'playwright';
import { getPrisma } from '../lib/db';
import { env } from '../lib/env';
import { openProfileAndExtract, searchPeople } from '../lib/linkedin';
import { launchBrowser, newLinkedInContext } from '../lib/browser';
import { ensureLoggedIn } from '../lib/scenarios';
import { delay } from '../lib/functions.helper';

export async function scrapePeopleJob(): Promise<void> {
  const prisma = getPrisma();
  const browser: Browser = await launchBrowser();
  const context: BrowserContext = await newLinkedInContext(browser);
  const page = await context.newPage();

  try {
    await ensureLoggedIn(page);

    console.log(`Searching: role=${env.searchRole}, country=${env.searchCountry}`);
    const profileUrls = await searchPeople(page, env.searchRole, env.searchCountry, env.maxPagesToScrape);
    console.log(`Found ${profileUrls.length} total profiles for ${env.searchRole} in ${env.searchCountry}`);

    let processed = 0;
    for (const profileUrl of profileUrls) {
      try {
        const profilePage = await context.newPage();
        const data = await openProfileAndExtract(profilePage, profileUrl);
        await profilePage.close();

        if (!data.fullName) {
          continue;
        }

        const person = await prisma.person.upsert({
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

        let companyId: number | undefined = undefined;
        if (data.latestCompanyName) {
          if (data.latestCompanyUrl) {
            const existing = await prisma.company.findUnique({ where: { linkedinUrl: data.latestCompanyUrl } });
            if (existing) {
              const updated = await prisma.company.update({
                where: { id: existing.id },
                data: { name: data.latestCompanyName },
              });
              companyId = updated.id;
            } else {
              const created = await prisma.company.create({
                data: { name: data.latestCompanyName, linkedinUrl: data.latestCompanyUrl },
              });
              companyId = created.id;
            }
          } else {
            // No company URL; try find by name, else create without URL
            const existingByName = await prisma.company.findFirst({ where: { name: data.latestCompanyName } });
            if (existingByName) {
              companyId = existingByName.id;
            } else {
              const createdNoUrl = await prisma.company.create({ data: { name: data.latestCompanyName } });
              companyId = createdNoUrl.id;
            }
          }
        }

        if (data.latestCompanyName) {
          await prisma.experience.create({
            data: {
              personId: person.id,
              companyId: companyId,
              companyName: data.latestCompanyName,
              companyUrl: data.latestCompanyUrl,
              title: data.title,
              isCurrent: true,
            },
          });
        }

        processed += 1;
        if (processed % 5 === 0) {
          console.log(`Processed ${processed}/${profileUrls.length}...`);
        }

        await delay(500);
      } catch (err) {
        console.warn('Failed processing profile:', profileUrl, err);
      }
    }
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await prisma.$disconnect();
  }
} 