import { Cookie as PlaywrightCookie } from 'playwright';

export interface RawCookie {
  domain: string | null;
  expires: number | null;
  name: string;
  partitioned: boolean;
  path: string;
  sameSite: string;
  secure: boolean;
  value: string;
}

export function parseCookiesJson(jsonString: string): RawCookie[] {
  try {
    // First, try to parse as-is
    return JSON.parse(jsonString);
  } catch (error) {
    // If that fails, try to fix the escaped quotes in value fields
    try {
      // Replace escaped quotes in value fields with proper JSON escaping
      const fixedJson = jsonString.replace(/"value":"\\([^"]*)\\"/g, (match, value) => {
        // Remove the extra escaping and properly escape the value
        const unescapedValue = value.replace(/\\"/g, '"');
        return `"value":"${unescapedValue.replace(/"/g, '\\"')}"`;
      });
      
      return JSON.parse(fixedJson);
    } catch (secondError) {
      // If that still fails, try a more aggressive approach
      try {
        // Remove all escaped quotes and replace with single quotes in value fields
        const fixedJson = jsonString.replace(/"value":"\\([^"]*)\\"/g, (match, value) => {
          const unescapedValue = value.replace(/\\"/g, '"');
          return `"value":"${unescapedValue}"`;
        });
        
        return JSON.parse(fixedJson);
      } catch (thirdError) {
        throw new Error(`Failed to parse cookies JSON: ${thirdError}`);
      }
    }
  }
}

export function validateCookies(cookies: RawCookie[]): RawCookie[] {
  return cookies.filter(cookie => {
    // Basic validation - filter out cookies with null domains
    return cookie.name && 
           typeof cookie.name === 'string' && 
           cookie.value && 
           typeof cookie.value === 'string' &&
           cookie.domain !== null; // Filter out cookies with null domains
  });
}

export function convertToPlaywrightCookies(rawCookies: RawCookie[]): PlaywrightCookie[] {
  return rawCookies
    .filter(cookie => cookie.domain !== null) // Only filter out null domains, allow null expires
    .map(cookie => {
      let expires: number;
      
      if (cookie.expires === null) {
        // Session cookie - use -1
        expires = -1;
      } else {
        // Convert expires to seconds if it's in milliseconds
        const expiresNum = parseInt(`${cookie.expires}`);
        if (expiresNum > 1000000000000) {
          // Likely in milliseconds (timestamp > year 2001 in seconds)
          expires = Math.floor(expiresNum / 1000);
        } else {
          // Already in seconds
          expires = expiresNum;
        }
      }

      return {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain!, // We've filtered out null domains, so this is safe
        path: cookie.path,
        expires: expires,
        httpOnly: true, // Default value since it's not in the raw data
        secure: cookie.secure,
        sameSite: (cookie.sameSite === 'none' ? 'None' : 
                   cookie.sameSite === 'lax' ? 'Lax' : 
                   cookie.sameSite === 'strict' ? 'Strict' : 'Lax') as 'Strict' | 'Lax' | 'None',
      };
    });
} 