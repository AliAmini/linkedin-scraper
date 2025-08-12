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
  searchCountries: (process.env.SEARCH_COUNTRIES || 'Malaysia,Poland,Thailand,Ireland,Netherlands')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  searchRoles: (process.env.SEARCH_ROLES || 'CTO,Founder,Tech Lead')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  scrapeConcurrency: parseInt(process.env.SCRAPE_CONCURRENCY || '3', 10),
}; 