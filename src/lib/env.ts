import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: requireEnv('DATABASE_URL'),
  linkedinEmail: process.env.LINKEDIN_EMAIL || '',
  linkedinPassword: process.env.LINKEDIN_PASSWORD || '',
  cookiesJson: process.env.COOKIES_JSON || '',
  searchCountry: process.env.SEARCH_COUNTRY || 'United States',
  searchRole: process.env.SEARCH_ROLE || 'Software Engineer',
  maxPagesToScrape: parseInt(process.env.MAX_PAGES_TO_SCRAPE || '100', 10),
  scrapeConcurrency: parseInt(process.env.SCRAPE_CONCURRENCY || '3', 10),
  headless: process.env.HEADLESS_BROWSER === 'true',
  useExistingChromeProfile: process.env.USE_EXISTING_CHROME_PROFILE !== 'false' // Default to true
}; 