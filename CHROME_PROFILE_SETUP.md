# Using Chrome Profile for LinkedIn Scraper

This scraper now supports using a dedicated Chrome profile, which means you can save your login session and don't need to log in every time you run the scraper.

## How it works

The scraper uses a separate Chrome profile located at:
- `%APPDATA%\Local\LinkedInScraper\ChromeData`

This profile will:
- Save your login sessions
- Store cookies between runs
- Keep your browser settings
- Be completely separate from your main Chrome profile

## Setup

1. **First run - Log in to LinkedIn**
   - Run the scraper: `yarn scrape:people`
   - The browser will open and you'll need to log in to LinkedIn
   - After logging in, the session will be saved for future runs

2. **Alternative: Use existing cookies**
   - If you have LinkedIn cookies from your main browser, you can export them
   - Set the `COOKIES_JSON` environment variable with your cookies
   - The scraper will use these cookies automatically

3. **Test Chrome configuration**
   ```bash
   yarn test:chrome
   ```
   This will check if Chrome is properly detected and configured.

## Environment Variables

You can control this behavior with environment variables:

- `USE_EXISTING_CHROME_PROFILE=true` (default) - Use dedicated Chrome profile
- `USE_EXISTING_CHROME_PROFILE=false` - Use Playwright's bundled Chromium (requires manual cookie injection)
- `COOKIES_JSON` - JSON string containing LinkedIn cookies (optional)
- `HEADLESS_BROWSER=false` - Set to false to see the browser in action

## Troubleshooting

### Chrome not found
If you get a warning about Chrome not being found, the scraper will fall back to Playwright's bundled Chromium. You can:

1. Make sure Chrome is installed in the default location
2. Check the Chrome path with `yarn test:chrome`
3. If Chrome is installed elsewhere, you can modify the `findChromeExecutable()` function in `src/lib/browser.ts`

### Still getting login prompts
If you're still getting login prompts:
1. Make sure you logged in successfully on the first run
2. Check if the Chrome profile directory exists: `%APPDATA%\Local\LinkedInScraper\ChromeData`
3. Try setting `HEADLESS_BROWSER=false` to see what's happening
4. You can delete the profile directory to start fresh

### Cookie issues
If you want to use cookies from your main browser:
1. Export cookies from your main Chrome browser (using browser extensions or developer tools)
2. Set the `COOKIES_JSON` environment variable
3. The scraper will use these cookies instead of requiring manual login

## Benefits

- No need to log in every time after the first run
- Uses a dedicated profile that won't interfere with your main Chrome
- More reliable and less likely to be detected as automation
- Can use existing cookies if available

## Security Note

The scraper uses a dedicated Chrome profile that is separate from your main browser profile. This ensures that:
- Your main browser data is not affected
- The scraper has its own isolated environment
- You can easily delete the scraper profile if needed 