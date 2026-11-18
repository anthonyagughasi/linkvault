// src/server/app.ts
import "dotenv/config";
import crypto2 from "node:crypto";
import express from "express";
import fs from "node:fs";
import path from "node:path";

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "spatial-campaign-nlvvl",
  appId: "1:585554483367:web:2b5a162a7499456fb1a382",
  apiKey: "AIzaSyALoDE5th1p03l9RBimh-rX-TTmm0SLhVs",
  authDomain: "spatial-campaign-nlvvl.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-linkvault-902940b3-a492-4934-b1dc-44cf1107581e",
  storageBucket: "spatial-campaign-nlvvl.firebasestorage.app",
  messagingSenderId: "585554483367",
  measurementId: "",
  oAuthClientId: "585554483367-mjnf856ig9lcpkki3avttcbcf0ni7f7d.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// src/middleware/rateLimit.ts
var buckets = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 6e4).unref();
function createRateLimiter(options) {
  const { windowMs, maxRequests, keyPrefix } = options;
  return (req, res, next) => {
    const forwarded = req.get("x-forwarded-for");
    const ip = (forwarded ? forwarded.split(",")[0].trim() : req.ip) || "unknown";
    const actor = req.user?.uid ? `uid:${req.user.uid}` : `ip:${ip}`;
    const key = `${keyPrefix}:${actor}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = {
        count: 0,
        resetAt: now + windowMs
      };
    }
    bucket.count += 1;
    buckets.set(key, bucket);
    const remaining = Math.max(0, maxRequests - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1e3);
    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1e3)));
    if (bucket.count > maxRequests) {
      res.setHeader("Retry-After", String(Math.max(1, resetSeconds)));
      return res.status(429).json({
        error: "Too many requests. Please slow down and try again shortly.",
        retryAfterSeconds: Math.max(1, resetSeconds)
      });
    }
    next();
  };
}

// src/lib/validation.ts
var RESERVED_SLUGS = /* @__PURE__ */ new Set([
  "api",
  "auth",
  "login",
  "register",
  "signup",
  "logout",
  "forgot-password",
  "reset-password",
  "dashboard",
  "links",
  "analytics",
  "settings",
  "profile",
  "expired",
  "disabled",
  "not-found",
  "unavailable",
  "r",
  "s",
  "src",
  "assets",
  "public",
  "static",
  "node_modules",
  "health",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico"
]);

// src/lib/analytics-parser.ts
import crypto from "node:crypto";
import { UAParser } from "ua-parser-js";
var REFERRER_ALIASES = {
  "t.co": "x.com",
  "twitter.com": "x.com",
  "l.instagram.com": "instagram.com",
  "lm.facebook.com": "facebook.com",
  "l.facebook.com": "facebook.com",
  "m.facebook.com": "facebook.com",
  "lnkd.in": "linkedin.com",
  "youtu.be": "youtube.com",
  "m.youtube.com": "youtube.com"
};
function normalizeReferrer(rawReferer) {
  if (!rawReferer || !rawReferer.trim()) {
    return "Direct";
  }
  try {
    const parsed = new URL(rawReferer);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    return REFERRER_ALIASES[host] || host || "Direct";
  } catch {
    return "Direct";
  }
}
function normalizeBrowserName(rawName, isBot) {
  if (isBot) return "Bot";
  if (!rawName) return "Other";
  const lower = rawName.toLowerCase();
  if (lower.includes("edge") || lower.includes("edg")) return "Edge";
  if (lower.includes("opr") || lower.includes("opera")) return "Opera";
  if (lower.includes("firefox") || lower.includes("fxios")) return "Firefox";
  if (lower.includes("samsung")) return "Samsung Internet";
  if (lower.includes("chrome") || lower.includes("crios") || lower.includes("chromium")) {
    return "Chrome";
  }
  if (lower.includes("safari")) return "Safari";
  return rawName;
}
function normalizeOsName(rawOs) {
  if (!rawOs) return "Other";
  const lower = rawOs.toLowerCase();
  if (lower.includes("mac")) return "macOS";
  if (lower.includes("windows")) return "Windows";
  if (lower.includes("ios")) return "iOS";
  if (lower.includes("android")) return "Android";
  if (lower.includes("chromium") || lower.includes("chrome os")) return "ChromeOS";
  if (lower.includes("linux") || lower.includes("ubuntu") || lower.includes("debian")) {
    return "Linux";
  }
  return rawOs;
}
function extractClickMetadata(req) {
  const userAgent = req.get("user-agent") || "";
  const rawReferer = req.get("referer") || req.get("referrer");
  const isBot = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|slackbot|discordbot|curl|wget|headless/i.test(
    userAgent
  );
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  let deviceCategory = "Desktop";
  if (isBot) {
    deviceCategory = "Bot";
  } else if (result.device.type === "mobile") {
    deviceCategory = "Mobile";
  } else if (result.device.type === "tablet") {
    deviceCategory = "Tablet";
  } else if (/mobile|iphone|android.*mobile/i.test(userAgent)) {
    deviceCategory = "Mobile";
  } else if (/ipad|tablet/i.test(userAgent)) {
    deviceCategory = "Tablet";
  }
  const countryHeader = req.get("cf-ipcountry") || req.get("x-vercel-ip-country") || req.get("x-appengine-country") || "";
  const country = countryHeader && countryHeader !== "XX" ? countryHeader.toUpperCase() : "Unknown";
  const forwarded = req.get("x-forwarded-for");
  const clientIp = (forwarded ? forwarded.split(",")[0].trim() : req.ip) || "0.0.0.0";
  const salt = process.env.IP_HASH_SALT || "linkvault-analytics-salt";
  const ipHash = crypto.createHash("sha256").update(`${clientIp}:${salt}`).digest("hex").slice(0, 16);
  return {
    referrer: normalizeReferrer(rawReferer),
    browser: normalizeBrowserName(result.browser.name, isBot),
    os: normalizeOsName(result.os.name),
    deviceCategory,
    country,
    ipHash
  };
}

// src/server/app.ts
var isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
var firestoreDbId = firebase_applet_config_default.firestoreDatabaseId || "(default)";
var FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${firebase_applet_config_default.projectId}/databases/${firestoreDbId}/documents`;
var app = express();
app.set("trust proxy", true);
var redirectLimiter = createRateLimiter({
  windowMs: 6e4,
  maxRequests: 180,
  keyPrefix: "redirect"
});
async function lookupPublicRoute(slug) {
  const url = `${FIRESTORE_BASE}/public_routes/${encodeURIComponent(slug)}?key=${encodeURIComponent(firebase_applet_config_default.apiKey)}`;
  const res = await fetch(url, { method: "GET" });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Firestore lookup failed (${res.status}): ${errText}`);
  }
  const doc = await res.json();
  const fields = doc.fields;
  if (!fields?.linkId?.stringValue || !fields?.originalUrl?.stringValue) {
    return null;
  }
  return {
    slug: fields.slug?.stringValue || slug,
    linkId: fields.linkId.stringValue,
    originalUrl: fields.originalUrl.stringValue,
    isActive: fields.isActive?.booleanValue ?? true,
    expiresAt: fields.expiresAt?.timestampValue || null
  };
}
async function recordClickToFirestore(linkId, slug, meta) {
  try {
    const clickId = crypto2.randomBytes(12).toString("hex");
    const docName = `projects/${firebase_applet_config_default.projectId}/databases/${firestoreDbId}/documents/links/${linkId}/clicks/${clickId}`;
    const commitUrl = `${FIRESTORE_BASE}:commit?key=${encodeURIComponent(firebase_applet_config_default.apiKey)}`;
    const res = await fetch(commitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: docName,
              fields: {
                slug: { stringValue: slug.slice(0, 48) },
                referrer: { stringValue: (meta.referrer || "Direct").slice(0, 120) },
                browser: { stringValue: (meta.browser || "Other").slice(0, 40) },
                os: { stringValue: (meta.os || "Other").slice(0, 40) },
                deviceCategory: { stringValue: meta.deviceCategory || "Desktop" },
                country: { stringValue: (meta.country || "Unknown").slice(0, 16) },
                ipHash: { stringValue: meta.ipHash.slice(0, 32) }
              }
            },
            currentDocument: { exists: false },
            updateTransforms: [
              {
                fieldPath: "clickedAt",
                setToServerValue: "REQUEST_TIME"
              }
            ]
          }
        ]
      })
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Click event Firestore commit failed:", res.status, text);
    }
  } catch (error) {
    console.error("Failed to record click event:", error);
  }
}
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "linkvault", storage: "firestore" });
});
async function handleShortRedirect(req, res, next) {
  const slug = String(req.params.slug || "").trim();
  if (!slug || slug.includes(".") || slug.startsWith("@") || RESERVED_SLUGS.has(slug.toLowerCase())) {
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
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (!route.isActive) {
      return res.redirect(302, `/disabled?slug=${encodeURIComponent(slug)}`);
    }
    if (route.expiresAt && new Date(route.expiresAt) <= /* @__PURE__ */ new Date()) {
      return res.redirect(302, `/expired?slug=${encodeURIComponent(slug)}`);
    }
    if (req.method === "GET") {
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
    console.error("Redirect handler error:", error);
    return next();
  }
}
app.get("/r/:slug", redirectLimiter, handleShortRedirect);
app.get("/:slug", redirectLimiter, handleShortRedirect);
if (isProduction) {
  const cwdDist = path.resolve(process.cwd(), "dist");
  const relativeDist = path.resolve(import.meta.dirname, "..", "dist");
  const distDir = fs.existsSync(cwdDist) ? cwdDist : relativeDist;
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        return next();
      }
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "API endpoint not found." });
      }
      return res.sendFile(path.join(distDir, "index.html"));
    });
  }
}
var app_default = app;
export {
  app,
  app_default as default,
  isProduction
};
