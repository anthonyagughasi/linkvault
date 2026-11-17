const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const RESERVED_SLUGS = new Set([
  'api',
  'auth',
  'login',
  'register',
  'signup',
  'logout',
  'forgot-password',
  'reset-password',
  'dashboard',
  'links',
  'analytics',
  'settings',
  'profile',
  'expired',
  'disabled',
  'not-found',
  'unavailable',
  'r',
  's',
  'src',
  'assets',
  'public',
  'static',
  'node_modules',
  'health',
  'robots.txt',
  'sitemap.xml',
  'favicon.ico',
]);

export function generateRandomSlug(length = 7): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BASE62_ALPHABET[bytes[i] % BASE62_ALPHABET.length];
  }
  return result;
}

export function validateDestinationUrl(
  rawUrl: string,
  appHost?: string
): { valid: true; normalizedUrl: string } | { valid: false; error: string } {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Destination URL is required.' };
  }
  if (trimmed.length > 2048) {
    return { valid: false, error: 'Destination URL must be 2048 characters or fewer.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Please enter a valid URL including http:// or https://.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only http:// and https:// URLs are supported.' };
  }

  if (!parsed.hostname || (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')) {
    return { valid: false, error: 'Destination URL must contain a valid domain name.' };
  }

  if (appHost && parsed.host.toLowerCase() === appHost.toLowerCase()) {
    return { valid: false, error: 'Destination URL cannot point back to this LinkVault domain.' };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}

export function validateCustomSlug(
  rawSlug: string
): { valid: true; slug: string } | { valid: false; error: string } {
  const slug = (rawSlug || '').trim();
  if (slug.length < 3 || slug.length > 48) {
    return { valid: false, error: 'Custom slug must be between 3 and 48 characters.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return {
      valid: false,
      error: 'Custom slug may only contain letters, numbers, hyphens, and underscores.',
    };
  }
  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    return { valid: false, error: `"${slug}" is a reserved system path and cannot be used.` };
  }
  return { valid: true, slug };
}

export function parseExpirationDate(
  rawExpiresAt: unknown
): { valid: true; date: Date | null } | { valid: false; error: string } {
  if (rawExpiresAt === null || rawExpiresAt === undefined || rawExpiresAt === '') {
    return { valid: true, date: null };
  }
  if (typeof rawExpiresAt !== 'string') {
    return { valid: false, error: 'Invalid expiration timestamp format.' };
  }
  const parsed = new Date(rawExpiresAt);
  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, error: 'Invalid expiration date.' };
  }
  if (parsed.getTime() <= Date.now()) {
    return { valid: false, error: 'Expiration time must be in the future.' };
  }
  return { valid: true, date: parsed };
}
