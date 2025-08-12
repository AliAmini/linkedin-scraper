import { Browser, BrowserContext, Page } from 'playwright';
import { getPrisma } from '../lib/db';
import { ensureLoggedIn, delay } from '../lib/linkedin';
import { launchBrowser, newLinkedInContext } from '../lib/browser';

async function sendConnectionRequest(page: Page): Promise<'SENT' | 'ALREADY' | 'FAILED'> {
  // Try a direct Connect button
  const connectButton = page.locator('button:has-text("Connect")').first();
  if (await connectButton.isVisible().catch(() => false)) {
    await connectButton.click();
  } else {
    // Under More menu
    const moreBtn = page.locator('button:has-text("More")').first();
    if (await moreBtn.isVisible().catch(() => false)) {
      await moreBtn.click();
      const menuConnect = page.locator('div[role="menu"] div:has-text("Connect")').first();
      if (await menuConnect.isVisible().catch(() => false)) {
        await menuConnect.click();
      }
    }
  }

  // Confirm dialog
  const addNoteBtn = page.locator('button:has-text("Add a note")');
  const sendBtn = page.locator('button:has-text("Send")');

  if (await addNoteBtn.isVisible().catch(() => false)) {
    await addNoteBtn.click();
    // Optional: add a short note
    const textarea = page.locator('textarea');
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill('Hi! Would love to connect.');
    }
  }

  if (await sendBtn.isVisible().catch(() => false)) {
    await sendBtn.click();
    await delay(800);
    return 'SENT';
  }

  // If no button or already connected
  const messageBtn = page.locator('a:has-text("Message"), button:has-text("Message")').first();
  if (await messageBtn.isVisible().catch(() => false)) {
    return 'ALREADY';
  }

  return 'FAILED';
}

export async function connectJob(): Promise<void> {
  const prisma = getPrisma();
  const browser: Browser = await launchBrowser();
  const context: BrowserContext = await newLinkedInContext(browser);
  const page = await context.newPage();

  try {
    await ensureLoggedIn(page);

    // Find people with current experience at micro or very small companies
    const candidates = await prisma.person.findMany({
      where: {
        connectionStatus: 'NONE',
        experiences: {
          some: {
            isCurrent: true,
            company: { size: { in: ['RANGE_1_10', 'RANGE_11_50'] } },
          },
        },
      },
      include: { experiences: { where: { isCurrent: true }, include: { company: true } } },
      take: 50,
    });

    console.log(`Candidates to connect: ${candidates.length}`);

    for (const person of candidates) {
      try {
        await page.goto(person.profileUrl, { waitUntil: 'domcontentloaded' });
        await delay(1000);
        const result = await sendConnectionRequest(page);
        if (result === 'SENT' || result === 'ALREADY') {
          await prisma.person.update({
            where: { id: person.id },
            data: {
              connectionStatus: result === 'ALREADY' ? 'CONNECTED' : 'PENDING',
              connectedAt: new Date(),
            },
          });
          console.log(`Connection ${result.toLowerCase()} for ${person.fullName}`);
        } else {
          await prisma.person.update({ where: { id: person.id }, data: { connectionStatus: 'FAILED' } });
          console.warn(`Failed to send connection to ${person.fullName}`);
        }
      } catch (err) {
        console.warn('Error connecting to person', person.profileUrl, err);
      }
    }
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await prisma.$disconnect();
  }
} 