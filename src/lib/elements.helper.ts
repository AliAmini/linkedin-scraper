import { Page } from 'playwright';

/**
 * Wait for an element to appear on the page with a timeout
 * @param page - Playwright page object
 * @param selector - CSS selector or locator string
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 * @param options - Additional options for the wait
 * @returns Promise that resolves when element is found or rejects on timeout
 */
export async function waitForElement(
  page: Page, 
  selector: string, 
  timeout: number = 10000,
  options: { visible?: boolean; state?: 'attached' | 'detached' | 'visible' | 'hidden' } = {}
): Promise<void> {
  const { visible = true, state = 'visible' } = options;
  
  try {
    await page.waitForSelector(selector, { 
      timeout, 
      state: visible ? 'visible' : state 
    });
  } catch (error) {
    throw new Error(`Element "${selector}" not found within ${timeout}ms`);
  }
}

/**
 * Wait for an element to be clickable (visible and enabled)
 * @param page - Playwright page object
 * @param selector - CSS selector or locator string
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 * @returns Promise that resolves when element is clickable or rejects on timeout
 */
export async function waitForClickable(
  page: Page, 
  selector: string, 
  timeout: number = 10000
): Promise<void> {
  try {
    await page.waitForSelector(selector, { 
      timeout, 
      state: 'visible' 
    });
    
    // Additional check to ensure element is not disabled
    const isDisabled = await page.locator(selector).isDisabled().catch(() => false);
    if (isDisabled) {
      throw new Error(`Element "${selector}" is disabled`);
    }
  } catch (error) {
    throw new Error(`Element "${selector}" not clickable within ${timeout}ms`);
  }
}