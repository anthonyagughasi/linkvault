import type { User } from 'firebase/auth';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from './firebase.ts';
import {
  generateRandomSlug,
  parseExpirationDate,
  validateCustomSlug,
  validateDestinationUrl,
} from './validation.ts';
import type {
  AccountOverviewResponse,
  BreakdownItem,
  DbUser,
  LinkDetailAnalyticsResponse,
  LinkItem,
  PaginatedLinksResponse,
  RecentClickEvent,
  TimeSeriesPoint,
} from '../types/linkvault.ts';

interface RawClickDoc {
  id: string;
  slug: string;
  clickedAt: Date;
  referrer: string;
  browser: string;
  os: string;
  deviceCategory: string;
  country: string;
  ipHash: string | null;
}

function isPermissionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string };
  return (
    err.code === 'permission-denied' ||
    (typeof err.message === 'string' && err.message.includes('Missing or insufficient permissions'))
  );
}

function toIso(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return val;
  return null;
}

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const parsed = new Date(val);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export async function syncUserProfile(firebaseUser: User): Promise<DbUser> {
  const userPath = `users/${firebaseUser.uid}`;
  const userRef = doc(db, 'users', firebaseUser.uid);

  try {
    const snap = await getDoc(userRef);
    const email = (firebaseUser.email || `${firebaseUser.uid}@users.linkvault.local`).slice(0, 254);
    const displayName = firebaseUser.displayName ? firebaseUser.displayName.slice(0, 120) : null;
    const photoUrl = firebaseUser.photoURL ? firebaseUser.photoURL.slice(0, 512) : null;

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        email,
        displayName,
        photoUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        email,
        displayName,
        photoUrl,
        updatedAt: serverTimestamp(),
      });
    }

    const updatedSnap = await getDoc(userRef);
    const data = updatedSnap.data() || {};
    return {
      uid: firebaseUser.uid,
      email: (data.email as string) || email,
      displayName: (data.displayName as string | null) ?? displayName,
      photoUrl: (data.photoUrl as string | null) ?? photoUrl,
      createdAt: toIso(data.createdAt) || new Date().toISOString(),
      updatedAt: toIso(data.updatedAt) || new Date().toISOString(),
    };
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
    throw error;
  }
}

export async function checkSlugAvailability(
  slug: string,
  excludeLinkId?: string
): Promise<{ available: boolean; reason: string | null }> {
  const validation = validateCustomSlug(slug);
  if (!validation.valid) {
    return { available: false, reason: validation.error };
  }

  const routePath = `public_routes/${validation.slug}`;
  try {
    const snap = await getDoc(doc(db, 'public_routes', validation.slug));
    if (!snap.exists()) {
      return { available: true, reason: null };
    }
    const data = snap.data();
    if (excludeLinkId && data.linkId === excludeLinkId) {
      return { available: true, reason: null };
    }
    return {
      available: false,
      reason: `The slug "${validation.slug}" is already taken.`,
    };
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, routePath);
    }
    throw error;
  }
}

export async function createShortLink(
  userId: string,
  input: {
    originalUrl: string;
    title?: string | null;
    customSlug?: string | null;
    expiresAt?: string | null;
  }
): Promise<{ link: LinkItem }> {
  const appHost = typeof window !== 'undefined' ? window.location.host : undefined;
  const urlCheck = validateDestinationUrl(input.originalUrl, appHost);
  if (!urlCheck.valid) {
    throw new Error(urlCheck.error);
  }

  const expiryCheck = parseExpirationDate(input.expiresAt);
  if (!expiryCheck.valid) {
    throw new Error(expiryCheck.error);
  }

  const cleanTitle = input.title?.trim() ? input.title.trim().slice(0, 140) : null;
  const expiresTimestamp = expiryCheck.date ? Timestamp.fromDate(expiryCheck.date) : null;

  let chosenSlug = '';
  if (input.customSlug && input.customSlug.trim()) {
    const slugCheck = validateCustomSlug(input.customSlug);
    if (!slugCheck.valid) {
      throw new Error(slugCheck.error);
    }
    const avail = await checkSlugAvailability(slugCheck.slug);
    if (!avail.available) {
      throw new Error(avail.reason || `The slug "${slugCheck.slug}" is already taken.`);
    }
    chosenSlug = slugCheck.slug;
  } else {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateRandomSlug(7);
      const avail = await checkSlugAvailability(candidate);
      if (avail.available) {
        chosenSlug = candidate;
        break;
      }
    }
    if (!chosenSlug) {
      throw new Error('Could not generate a unique short slug. Please try again.');
    }
  }

  const linkRef = doc(collection(db, 'links'));
  const routeRef = doc(db, 'public_routes', chosenSlug);

  try {
    const batch = writeBatch(db);
    batch.set(linkRef, {
      id: linkRef.id,
      userId,
      slug: chosenSlug,
      originalUrl: urlCheck.normalizedUrl,
      title: cleanTitle,
      isActive: true,
      expiresAt: expiresTimestamp,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(routeRef, {
      slug: chosenSlug,
      linkId: linkRef.id,
      originalUrl: urlCheck.normalizedUrl,
      isActive: true,
      expiresAt: expiresTimestamp,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    const createdSnap = await getDoc(linkRef);
    const createdData = createdSnap.data() || {};
    return {
      link: {
        id: linkRef.id,
        userId,
        slug: chosenSlug,
        originalUrl: urlCheck.normalizedUrl,
        title: cleanTitle,
        isActive: true,
        expiresAt: expiryCheck.date ? expiryCheck.date.toISOString() : null,
        clickCount: 0,
        lastClickedAt: null,
        createdAt: toIso(createdData.createdAt) || new Date().toISOString(),
        updatedAt: toIso(createdData.updatedAt) || new Date().toISOString(),
      },
    };
  } catch (error) {
    if (isPermissionError(error)) {
      // Distinguish slug collision on concurrent create
      const recheck = await getDoc(routeRef).catch(() => null);
      if (recheck && recheck.exists()) {
        throw new Error(`The slug "${chosenSlug}" is already taken.`);
      }
      handleFirestoreError(error, OperationType.CREATE, `links/${linkRef.id}`);
    }
    throw error;
  }
}

export async function updateShortLink(
  userId: string,
  existingLink: LinkItem,
  patch: {
    originalUrl?: string;
    title?: string | null;
    slug?: string;
    isActive?: boolean;
    expiresAt?: string | null;
  }
): Promise<{ link: LinkItem }> {
  const appHost = typeof window !== 'undefined' ? window.location.host : undefined;
  let nextUrl = existingLink.originalUrl;
  if (patch.originalUrl !== undefined) {
    const urlCheck = validateDestinationUrl(patch.originalUrl, appHost);
    if (!urlCheck.valid) throw new Error(urlCheck.error);
    nextUrl = urlCheck.normalizedUrl;
  }

  let nextSlug = existingLink.slug;
  if (patch.slug !== undefined) {
    const slugCheck = validateCustomSlug(patch.slug);
    if (!slugCheck.valid) throw new Error(slugCheck.error);
    if (slugCheck.slug !== existingLink.slug) {
      const avail = await checkSlugAvailability(slugCheck.slug, existingLink.id);
      if (!avail.available) {
        throw new Error(avail.reason || `The slug "${slugCheck.slug}" is already taken.`);
      }
    }
    nextSlug = slugCheck.slug;
  }

  let nextExpiresAtDate: Date | null = existingLink.expiresAt
    ? new Date(existingLink.expiresAt)
    : null;
  if (patch.expiresAt !== undefined) {
    const expiryCheck = parseExpirationDate(patch.expiresAt);
    if (!expiryCheck.valid) throw new Error(expiryCheck.error);
    nextExpiresAtDate = expiryCheck.date;
  }

  const nextTitle =
    patch.title !== undefined
      ? patch.title?.trim()
        ? patch.title.trim().slice(0, 140)
        : null
      : existingLink.title;
  const nextActive = patch.isActive !== undefined ? patch.isActive : existingLink.isActive;
  const expiresTimestamp = nextExpiresAtDate ? Timestamp.fromDate(nextExpiresAtDate) : null;

  const linkRef = doc(db, 'links', existingLink.id);
  const slugChanged = nextSlug !== existingLink.slug;

  try {
    const batch = writeBatch(db);
    batch.update(linkRef, {
      slug: nextSlug,
      originalUrl: nextUrl,
      title: nextTitle,
      isActive: nextActive,
      expiresAt: expiresTimestamp,
      updatedAt: serverTimestamp(),
    });

    if (slugChanged) {
      batch.set(doc(db, 'public_routes', nextSlug), {
        slug: nextSlug,
        linkId: existingLink.id,
        originalUrl: nextUrl,
        isActive: nextActive,
        expiresAt: expiresTimestamp,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.delete(doc(db, 'public_routes', existingLink.slug));
    } else {
      batch.update(doc(db, 'public_routes', existingLink.slug), {
        originalUrl: nextUrl,
        isActive: nextActive,
        expiresAt: expiresTimestamp,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();

    return {
      link: {
        ...existingLink,
        userId,
        slug: nextSlug,
        originalUrl: nextUrl,
        title: nextTitle,
        isActive: nextActive,
        expiresAt: nextExpiresAtDate ? nextExpiresAtDate.toISOString() : null,
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    if (isPermissionError(error)) {
      if (slugChanged) {
        const recheck = await getDoc(doc(db, 'public_routes', nextSlug)).catch(() => null);
        if (recheck && recheck.exists()) {
          throw new Error(`The slug "${nextSlug}" is already taken.`);
        }
      }
      handleFirestoreError(error, OperationType.UPDATE, `links/${existingLink.id}`);
    }
    throw error;
  }
}

export async function deleteShortLink(link: LinkItem): Promise<void> {
  const linkPath = `links/${link.id}`;
  try {
    const clicksSnap = await getDocs(collection(db, 'links', link.id, 'clicks'));
    const clickDocs = clicksSnap.docs;

    // Delete click subcollection in chunks of 400 to stay under Firestore 500-op batch limit
    for (let i = 0; i < clickDocs.length; i += 400) {
      const chunk = clickDocs.slice(i, i + 400);
      const chunkBatch = writeBatch(db);
      for (const d of chunk) {
        chunkBatch.delete(d.ref);
      }
      await chunkBatch.commit();
    }

    const finalBatch = writeBatch(db);
    finalBatch.delete(doc(db, 'links', link.id));
    finalBatch.delete(doc(db, 'public_routes', link.slug));
    await finalBatch.commit();
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.DELETE, linkPath);
    }
    throw error;
  }
}

async function fetchLinkClicks(linkId: string): Promise<RawClickDoc[]> {
  const clicksPath = `links/${linkId}/clicks`;
  try {
    const snap = await getDocs(collection(db, 'links', linkId, 'clicks'));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        slug: (data.slug as string) || '',
        clickedAt: toDate(data.clickedAt),
        referrer: (data.referrer as string) || 'Direct',
        browser: (data.browser as string) || 'Unknown',
        os: (data.os as string) || 'Unknown',
        deviceCategory: (data.deviceCategory as string) || 'Desktop',
        country: (data.country as string) || 'Unknown',
        ipHash: (data.ipHash as string | null) ?? null,
      };
    });
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.LIST, clicksPath);
    }
    throw error;
  }
}

async function fetchUserLinksWithClickStats(userId: string): Promise<{
  links: LinkItem[];
  clicksByLink: Map<string, RawClickDoc[]>;
}> {
  const linksQuery = query(collection(db, 'links'), where('userId', '==', userId));
  let snap;
  try {
    snap = await getDocs(linksQuery);
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.LIST, 'links');
    }
    throw error;
  }

  const clicksByLink = new Map<string, RawClickDoc[]>();
  const linkItems = await Promise.all(
    snap.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const clicks = await fetchLinkClicks(docSnap.id);
      clicksByLink.set(docSnap.id, clicks);

      let latestClick: Date | null = null;
      for (const c of clicks) {
        if (!latestClick || c.clickedAt > latestClick) {
          latestClick = c.clickedAt;
        }
      }

      return {
        id: docSnap.id,
        userId: (data.userId as string) || userId,
        slug: (data.slug as string) || '',
        originalUrl: (data.originalUrl as string) || '',
        title: (data.title as string | null) ?? null,
        isActive: Boolean(data.isActive),
        expiresAt: toIso(data.expiresAt),
        clickCount: clicks.length,
        lastClickedAt: latestClick ? latestClick.toISOString() : null,
        createdAt: toIso(data.createdAt) || new Date().toISOString(),
        updatedAt: toIso(data.updatedAt) || new Date().toISOString(),
      } satisfies LinkItem;
    })
  );

  return { links: linkItems, clicksByLink };
}

export async function fetchLinks(
  userId: string,
  params: {
    search?: string;
    status?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }
): Promise<PaginatedLinksResponse> {
  const { links } = await fetchUserLinksWithClickStats(userId);
  const nowMs = Date.now();
  const search = (params.search || '').trim().toLowerCase();

  let filtered = links.filter((link) => {
    if (search) {
      const haystack = `${link.slug} ${link.originalUrl} ${link.title || ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    const isExpired = link.expiresAt !== null && new Date(link.expiresAt).getTime() <= nowMs;
    if (params.status === 'active') return link.isActive && !isExpired;
    if (params.status === 'disabled') return !link.isActive;
    if (params.status === 'expired') return isExpired;
    return true;
  });

  filtered = filtered.sort((a, b) => {
    if (params.sort === 'clicks') {
      if (b.clickCount !== a.clickCount) return b.clickCount - a.clickCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (params.sort === 'recent') {
      const aTime = a.lastClickedAt ? new Date(a.lastClickedAt).getTime() : 0;
      const bTime = b.lastClickedAt ? new Date(b.lastClickedAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const limit = Math.min(50, Math.max(1, params.limit ?? 10));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, params.page ?? 1), totalPages);
  const start = (safePage - 1) * limit;

  return {
    items: filtered.slice(start, start + limit),
    total,
    page: safePage,
    limit,
    totalPages,
  };
}

function formatDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatHourKey(date: Date): string {
  return date.toISOString().slice(0, 13);
}

function formatHourLabel(date: Date): string {
  return `${String(date.getUTCHours()).padStart(2, '0')}:00`;
}

function buildTimeSeries(rows: RawClickDoc[], rangeDays: number): TimeSeriesPoint[] {
  const now = new Date();
  const useHourly = rangeDays <= 1;
  const buckets = new Map<string, { label: string; clicks: number; ips: Set<string> }>();

  if (useHourly) {
    const start = new Date(now);
    start.setUTCMinutes(0, 0, 0);
    start.setUTCHours(start.getUTCHours() - 23);
    for (let i = 0; i < 24; i++) {
      const cursor = new Date(start.getTime() + i * 3_600_000);
      buckets.set(formatHourKey(cursor), {
        label: formatHourLabel(cursor),
        clicks: 0,
        ips: new Set(),
      });
    }
    for (const row of rows) {
      const bucket = buckets.get(formatHourKey(row.clickedAt));
      if (bucket) {
        bucket.clicks += 1;
        if (row.ipHash) bucket.ips.add(row.ipHash);
      }
    }
  } else {
    const days = Math.min(90, Math.max(2, rangeDays));
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    for (let i = 0; i < days; i++) {
      const cursor = new Date(start.getTime() + i * 86_400_000);
      buckets.set(formatDayKey(cursor), {
        label: formatDayLabel(cursor),
        clicks: 0,
        ips: new Set(),
      });
    }
    for (const row of rows) {
      const bucket = buckets.get(formatDayKey(row.clickedAt));
      if (bucket) {
        bucket.clicks += 1;
        if (row.ipHash) bucket.ips.add(row.ipHash);
      }
    }
  }

  return Array.from(buckets.entries()).map(([bucket, data]) => ({
    bucket,
    label: data.label,
    clicks: data.clicks,
    uniqueVisitors: data.ips.size,
  }));
}

function buildBreakdown(values: string[], limit = 6): BreakdownItem[] {
  const total = values.length;
  if (total === 0) return [];

  const counts = new Map<string, number>();
  for (const val of values) {
    const key = val || 'Unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, clicks]) => ({
      name,
      clicks,
      percentage: Math.round((clicks / total) * 1000) / 10,
    }));
}

export async function fetchOverviewAnalytics(
  userId: string,
  rangeDays: number
): Promise<AccountOverviewResponse> {
  const clampedDays = [1, 7, 30, 90].includes(rangeDays) ? rangeDays : 30;
  const nowMs = Date.now();
  const periodStartMs = nowMs - clampedDays * 86_400_000;
  const last24hStartMs = nowMs - 86_400_000;

  const { links, clicksByLink } = await fetchUserLinksWithClickStats(userId);

  let activeLinks = 0;
  let disabledLinks = 0;
  let expiredLinks = 0;
  let totalClicks = 0;

  for (const link of links) {
    totalClicks += link.clickCount;
    const isExpired = link.expiresAt !== null && new Date(link.expiresAt).getTime() <= nowMs;
    if (isExpired) expiredLinks += 1;
    else if (!link.isActive) disabledLinks += 1;
    else activeLinks += 1;
  }

  const allClicks: RawClickDoc[] = [];
  for (const list of clicksByLink.values()) {
    allClicks.push(...list);
  }

  const periodClicks = allClicks.filter((c) => c.clickedAt.getTime() >= periodStartMs);
  const uniqueIps = new Set<string>();
  let clicksLast24h = 0;
  for (const c of allClicks) {
    if (c.clickedAt.getTime() >= last24hStartMs) clicksLast24h += 1;
  }
  for (const c of periodClicks) {
    if (c.ipHash) uniqueIps.add(c.ipHash);
  }

  const topLinks = [...links].sort((a, b) => b.clickCount - a.clickCount).slice(0, 5);

  return {
    summary: {
      totalLinks: links.length,
      activeLinks,
      disabledLinks,
      expiredLinks,
      totalClicks,
      periodClicks: periodClicks.length,
      clicksLast24h,
      uniqueVisitorsPeriod: uniqueIps.size,
    },
    topLinks,
    timeSeries: buildTimeSeries(periodClicks, clampedDays),
    referrers: buildBreakdown(periodClicks.map((r) => r.referrer), 6),
    browsers: buildBreakdown(periodClicks.map((r) => r.browser), 6),
    devices: buildBreakdown(periodClicks.map((r) => r.deviceCategory), 4),
    operatingSystems: buildBreakdown(periodClicks.map((r) => r.os), 6),
  };
}

export async function fetchLinkDetailAnalytics(
  userId: string,
  linkId: string,
  rangeDays: number
): Promise<LinkDetailAnalyticsResponse> {
  const clampedDays = [1, 7, 30, 90].includes(rangeDays) ? rangeDays : 30;
  const linkPath = `links/${linkId}`;

  let snap;
  try {
    snap = await getDoc(doc(db, 'links', linkId));
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, linkPath);
    }
    throw error;
  }

  if (!snap.exists()) {
    throw new Error('Link not found.');
  }

  const data = snap.data();
  if (data.userId !== userId) {
    throw new Error('You do not have permission to view this link.');
  }

  const clicks = await fetchLinkClicks(linkId);
  const sortedClicks = [...clicks].sort(
    (a, b) => b.clickedAt.getTime() - a.clickedAt.getTime()
  );

  const link: LinkItem = {
    id: snap.id,
    userId: (data.userId as string) || userId,
    slug: (data.slug as string) || '',
    originalUrl: (data.originalUrl as string) || '',
    title: (data.title as string | null) ?? null,
    isActive: Boolean(data.isActive),
    expiresAt: toIso(data.expiresAt),
    clickCount: clicks.length,
    lastClickedAt: sortedClicks[0] ? sortedClicks[0].clickedAt.toISOString() : null,
    createdAt: toIso(data.createdAt) || new Date().toISOString(),
    updatedAt: toIso(data.updatedAt) || new Date().toISOString(),
  };

  const periodStartMs = Date.now() - clampedDays * 86_400_000;
  const periodClicks = sortedClicks.filter((c) => c.clickedAt.getTime() >= periodStartMs);

  const uniqueIps = new Set<string>();
  for (const c of periodClicks) {
    if (c.ipHash) uniqueIps.add(c.ipHash);
  }

  const referrers = buildBreakdown(periodClicks.map((r) => r.referrer), 6);
  const browsers = buildBreakdown(periodClicks.map((r) => r.browser), 6);
  const devices = buildBreakdown(periodClicks.map((r) => r.deviceCategory), 4);
  const operatingSystems = buildBreakdown(periodClicks.map((r) => r.os), 6);

  const recentClicks: RecentClickEvent[] = sortedClicks.slice(0, 25).map((row) => ({
    id: row.id,
    clickedAt: row.clickedAt.toISOString(),
    referrer: row.referrer,
    browser: row.browser,
    os: row.os,
    deviceCategory: row.deviceCategory,
    country: row.country,
  }));

  return {
    link,
    summary: {
      totalClicks: clicks.length,
      periodClicks: periodClicks.length,
      uniqueVisitorsPeriod: uniqueIps.size,
      topReferrer: referrers[0]?.name ?? '—',
      topDevice: devices[0]?.name ?? '—',
      topBrowser: browsers[0]?.name ?? '—',
    },
    timeSeries: buildTimeSeries(periodClicks, clampedDays),
    referrers,
    browsers,
    devices,
    operatingSystems,
    recentClicks,
  };
}
