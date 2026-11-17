import crypto from 'node:crypto';
import type { Request } from 'express';
import { UAParser } from 'ua-parser-js';

export interface ParsedClickMetadata {
  referrer: string;
  browser: string;
  os: string;
  deviceCategory: string;
  country: string;
  ipHash: string;
}

const REFERRER_ALIASES: Record<string, string> = {
  't.co': 'x.com',
  'twitter.com': 'x.com',
  'l.instagram.com': 'instagram.com',
  'lm.facebook.com': 'facebook.com',
  'l.facebook.com': 'facebook.com',
  'm.facebook.com': 'facebook.com',
  'lnkd.in': 'linkedin.com',
  'youtu.be': 'youtube.com',
  'm.youtube.com': 'youtube.com',
};

export function normalizeReferrer(rawReferer: string | undefined): string {
  if (!rawReferer || !rawReferer.trim()) {
    return 'Direct';
  }
  try {
    const parsed = new URL(rawReferer);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }
    return REFERRER_ALIASES[host] || host || 'Direct';
  } catch {
    return 'Direct';
  }
}

function normalizeBrowserName(rawName: string | undefined, isBot: boolean): string {
  if (isBot) return 'Bot';
  if (!rawName) return 'Other';
  const lower = rawName.toLowerCase();
  if (lower.includes('edge') || lower.includes('edg')) return 'Edge';
  if (lower.includes('opr') || lower.includes('opera')) return 'Opera';
  if (lower.includes('firefox') || lower.includes('fxios')) return 'Firefox';
  if (lower.includes('samsung')) return 'Samsung Internet';
  if (lower.includes('chrome') || lower.includes('crios') || lower.includes('chromium')) {
    return 'Chrome';
  }
  if (lower.includes('safari')) return 'Safari';
  return rawName;
}

function normalizeOsName(rawOs: string | undefined): string {
  if (!rawOs) return 'Other';
  const lower = rawOs.toLowerCase();
  if (lower.includes('mac')) return 'macOS';
  if (lower.includes('windows')) return 'Windows';
  if (lower.includes('ios')) return 'iOS';
  if (lower.includes('android')) return 'Android';
  if (lower.includes('chromium') || lower.includes('chrome os')) return 'ChromeOS';
  if (lower.includes('linux') || lower.includes('ubuntu') || lower.includes('debian')) {
    return 'Linux';
  }
  return rawOs;
}

export function extractClickMetadata(req: Request): ParsedClickMetadata {
  const userAgent = req.get('user-agent') || '';
  const rawReferer = req.get('referer') || req.get('referrer');

  const isBot = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|slackbot|discordbot|curl|wget|headless/i.test(
    userAgent
  );

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  let deviceCategory = 'Desktop';
  if (isBot) {
    deviceCategory = 'Bot';
  } else if (result.device.type === 'mobile') {
    deviceCategory = 'Mobile';
  } else if (result.device.type === 'tablet') {
    deviceCategory = 'Tablet';
  } else if (/mobile|iphone|android.*mobile/i.test(userAgent)) {
    deviceCategory = 'Mobile';
  } else if (/ipad|tablet/i.test(userAgent)) {
    deviceCategory = 'Tablet';
  }

  const countryHeader =
    req.get('cf-ipcountry') ||
    req.get('x-vercel-ip-country') ||
    req.get('x-appengine-country') ||
    '';
  const country = countryHeader && countryHeader !== 'XX' ? countryHeader.toUpperCase() : 'Unknown';

  const forwarded = req.get('x-forwarded-for');
  const clientIp = (forwarded ? forwarded.split(',')[0].trim() : req.ip) || '0.0.0.0';
  const salt = process.env.IP_HASH_SALT || 'linkvault-analytics-salt';
  const ipHash = crypto.createHash('sha256').update(`${clientIp}:${salt}`).digest('hex').slice(0, 16);

  return {
    referrer: normalizeReferrer(rawReferer),
    browser: normalizeBrowserName(result.browser.name, isBot),
    os: normalizeOsName(result.os.name),
    deviceCategory,
    country,
    ipHash,
  };
}
