import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import { createRateLimiter } from './src/middleware/rateLimit.ts';
import { RESERVED_SLUGS } from './src/lib/validation.ts';
import { extractClickMetadata, type ParsedClickMetadata } from './src/lib/analytics-parser.ts';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

const firestoreDbId = firebaseConfig.firestoreDatabaseId || '(default)';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firestoreDbId}/documents`;

app.set('trust proxy', true);

const redirectLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 180,
  keyPrefix: 'redirect',
});

interface PublicRouteData {
  slug: string;
  linkId: string;
  originalUrl: string;
  isActive: boolean;
  expiresAt: string | null;
}

async function lookupPublicRoute(slug: string): Promise<PublicRouteData | null> {
  const url = `${FIRESTORE_BASE}/public_routes/${encodeURIComponent(slug)}?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
  const res = await fetch(url, { method: 'GET' });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Firestore lookup failed (${res.status}): ${errText}`);
  }
  const doc = (await res.json()) as {
    fields?: {
      slug?: { stringValue?: string };
      linkId?: { stringValue?: string };
      originalUrl?: { stringValue?: string };
      isActive?: { booleanValue?: boolean };
      expiresAt?: { timestampValue?: string; nullValue?: unknown };
    };
  };
  const fields = doc.fields;
  if (!fields?.linkId?.stringValue || !fields?.originalUrl?.stringValue) {
    return null;
  }

  return {
    slug: fields.slug?.stringValue || slug,
    linkId: fields.linkId.stringValue,
    originalUrl: fields.originalUrl.stringValue,
    isActive: fields.isActive?.booleanValue ?? true,
    expiresAt: fields.expiresAt?.timestampValue || null,
  };
}

async function recordClickToFirestore(
  linkId: string,
  slug: string,
  meta: ParsedClickMetadata
): Promise<void> {
  try {
    const clickId = crypto.randomBytes(12).toString('hex');
    const docName = `projects/${firebaseConfig.projectId}/databases/${firestoreDbId}/documents/links/${linkId}/clicks/${clickId}`;
    const commitUrl = `${FIRESTORE_BASE}:commit?key=${encodeURIComponent(firebaseConfig.apiKey)}`;

    const res = await fetch(commitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: docName,
              fields: {
                slug: { stringValue: slug.slice(0, 48) },
                referrer: { stringValue: (meta.referrer || 'Direct').slice(0, 120) },
                browser: { stringValue: (meta.browser || 'Other').slice(0, 40) },
                os: { stringValue: (meta.os || 'Other').slice(0, 40) },
                deviceCategory: { stringValue: meta.deviceCategory || 'Desktop' },
                country: { stringValue: (meta.country || 'Unknown').slice(0, 16) },
                ipHash: { stringValue: meta.ipHash.slice(0, 32) },
              },
            },
            currentDocument: { exists: false },
            updateTransforms: [
              {
                fieldPath: 'clickedAt',
                setToServerValue: 'REQUEST_TIME',
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Click event Firestore commit failed:', res.status, text);
    }
  } catch (error) {
    console.error('Failed to record click event:', error);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'linkvault', storage: 'firestore' });
});

async function handleShortRedirect(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const slug = String(req.params.slug || '').trim();
  if (
    !slug ||
    slug.includes('.') ||
    slug.startsWith('@') ||
    RESERVED_SLUGS.has(slug.toLowerCase())
  ) {
    return next();
  }

  if (!/^[a-zA-Z0-9_-]{3,48}$/.test(slug)) {
    return next();
  }

  try {
    const route = await lookupPublicRoute(slug);
    if (!route) {
      return next();
    }

    if (!/^https?:\/\/.+/i.test(route.originalUrl)) {
      return next();
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');

    if (!route.isActive) {
      return res.redirect(302, `/disabled?slug=${encodeURIComponent(slug)}`);
    }

    if (route.expiresAt && new Date(route.expiresAt) <= new Date()) {
      return res.redirect(302, `/expired?slug=${encodeURIComponent(slug)}`);
    }

    if (req.method === 'GET') {
      const clickMeta = extractClickMetadata(req);
      if (process.env.VERCEL) {
        await recordClickToFirestore(route.linkId, slug, clickMeta);
        return res.redirect(302, route.originalUrl);
      }
      res.redirect(302, route.originalUrl);
      setImmediate(() => {
        void recordClickToFirestore(route.linkId, slug, clickMeta);
      });
      return;
    }

    return res.redirect(302, route.originalUrl);
  } catch (error) {
    console.error('Redirect handler error:', error);
    return next();
  }
}

app.get('/r/:slug', redirectLimiter, handleShortRedirect);
app.get('/:slug', redirectLimiter, handleShortRedirect);

if (isProduction) {
  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }
}

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LinkVault server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start LinkVault server:', err);
    process.exit(1);
  });
}

export { app };
export default app;
