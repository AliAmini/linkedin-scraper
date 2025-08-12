# LinkedIn Scraper

Stack: Node.js, TypeScript, Prisma, MySQL, Playwright.

## Setup

1. Copy `env.example` to `.env` and fill values.
2. Start MySQL (Docker):
   ```bash
   docker compose up -d
   ```
3. Install dependencies and tools:
   ```bash
   npm install
   npm run prisma:generate
   npm run playwright:install
   ```
4. Create DB schema:
   ```bash
   npm run prisma:migrate
   ```

## Jobs

- Search people by roles and countries, and store latest experience:
  ```bash
  npm run scrape:people
  ```
- Fetch missing company details and sizes:
  ```bash
  npm run fetch:companies
  ```
- Send connection requests to people at 1-10 or 11-50 companies:
  ```bash
  npm run connect
  ```

Configure `SEARCH_COUNTRIES`, `SEARCH_ROLES`, and either `COOKIES_JSON` or `LINKEDIN_EMAIL`/`LINKEDIN_PASSWORD` in `.env`. 