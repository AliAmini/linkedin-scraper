# Cookie Parser Usage Example

The LinkedIn scraper now includes a robust cookie parser that can handle JSON with escaped quotes in cookie values.

## Problem

Your JSON had escaped quotes in the `value` fields like this:
```json
{
  "name": "bcookie",
  "value": "\"v=2&04a354c2-20bd-4a23-8aaf-7b97bd6618e0\""
}
```

This makes the JSON invalid because the quotes are double-escaped.

## Solution

The new cookie parser automatically fixes this issue by:

1. **First attempt**: Try to parse the JSON as-is
2. **Second attempt**: Fix escaped quotes in value fields
3. **Third attempt**: More aggressive quote fixing
4. **Validation**: Filter out invalid cookies (null domains, missing values)
5. **Conversion**: Convert to Playwright's Cookie format

## Usage

The cookie parser is automatically used when you set the `COOKIES_JSON` environment variable. Your existing setup will work without any changes:

```bash
# In your .env file
COOKIES_JSON='[{"domain":"linkedin.com","expires":1786544388438.41,"name":"bcookie","partitioned":false,"path":"/","sameSite":"none","secure":true,"value":"\\"v=2&04a354c2-20bd-4a23-8aaf-7b97bd6618e0\\""},...]'
```

## Manual Usage

If you need to parse cookies manually:

```typescript
import { parseCookiesJson, validateCookies, convertToPlaywrightCookies } from './lib/cookie-parser';

const jsonString = 'your-cookie-json-string';
const rawCookies = parseCookiesJson(jsonString);
const validCookies = validateCookies(rawCookies);
const playwrightCookies = convertToPlaywrightCookies(validCookies);

// Use with Playwright
await context.addCookies(playwrightCookies);
```

## What the Parser Does

1. **Parses** the JSON with escaped quotes
2. **Validates** cookies (removes null domains, missing values)
3. **Filters** LinkedIn cookies (only keeps cookies with 'linkedin.com' in domain)
4. **Converts** to Playwright format with proper types
5. **Logs** how many cookies were added

The parser will automatically handle your problematic JSON format and convert it to a format that Playwright can use. 