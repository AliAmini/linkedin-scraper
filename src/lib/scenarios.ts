import { env } from './env';
import { Page } from 'playwright';
import { delay } from './functions.helper';

export async function ensureLoggedIn(page: Page): Promise<void> {
  try {
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
    await delay(2000); // Give time for the page to fully load
    
    const showingLoginForm = await page.locator('input[name=session_key]').first().isVisible().catch(() => false);
    console.log('ensureLoggedIn, showingLoginForm', showingLoginForm);
    
    if (showingLoginForm) {
      if (!env.linkedinEmail || !env.linkedinPassword) {
        throw new Error('Not logged in and LINKEDIN_EMAIL/PASSWORD not provided. Provide COOKIES_JSON or credentials.');
      }
      await page.fill('input[name=session_key]', env.linkedinEmail);
      await page.fill('input[name=session_password]', env.linkedinPassword);
      await page.click('button[type="submit"]:has-text("Sign in")');
      await page.waitForLoadState('domcontentloaded');
      await delay(3000); // Wait for login to complete
    } else {
      console.log('Already logged in to LinkedIn');
    }
  } catch (error) {
    console.error('Error in ensureLoggedIn:', error);
    throw error;
  }
}