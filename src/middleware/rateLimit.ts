import type { NextFunction, Request, Response } from 'express';

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

// Periodically prune expired buckets to keep memory bounded
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 60_000).unref();

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix } = options;

  return (req: Request & { user?: { uid?: string } }, res: Response, next: NextFunction) => {
    const forwarded = req.get('x-forwarded-for');
    const ip = (forwarded ? forwarded.split(',')[0].trim() : req.ip) || 'unknown';
    const actor = req.user?.uid ? `uid:${req.user.uid}` : `ip:${ip}`;
    const key = `${keyPrefix}:${actor}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = {
        count: 0,
        resetAt: now + windowMs,
      };
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, maxRequests - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > maxRequests) {
      res.setHeader('Retry-After', String(Math.max(1, resetSeconds)));
      return res.status(429).json({
        error: 'Too many requests. Please slow down and try again shortly.',
        retryAfterSeconds: Math.max(1, resetSeconds),
      });
    }

    next();
  };
}
