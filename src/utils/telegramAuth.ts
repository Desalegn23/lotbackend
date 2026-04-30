import crypto from 'crypto';

/**
 * Validates the data received from the Telegram Web App.
 * @param initData The raw initData string from the Telegram Web App.
 * @param botToken The Telegram Bot API token.
 * @returns boolean indicating if the data is valid.
 */
export function validateWebAppData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      return false;
    }
    
    urlParams.delete('hash');
    
    // Sort keys alphabetically and format as "key=value\nkey=value..."
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
      
    // Create HMAC SHA-256 of botToken using "WebAppData" as key
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    
    // Create HMAC SHA-256 of dataCheckString using the secretKey
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    return calculatedHash === hash;
  } catch (error) {
    console.error('Error validating Telegram Web App data:', error);
    return false;
  }
}

/**
 * Parses the user object from the initData string.
 * @param initData The raw initData string from the Telegram Web App.
 * @returns The parsed user object or null.
 */
export function parseInitDataUser(initData: string): any {
  try {
    const urlParams = new URLSearchParams(initData);
    const userString = urlParams.get('user');
    if (userString) {
      return JSON.parse(userString);
    }
    return null;
  } catch (error) {
    console.error('Error parsing user from initData:', error);
    return null;
  }
}
