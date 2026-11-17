export interface DbUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkItem {
  id: string;
  userId: string;
  slug: string;
  originalUrl: string;
  title: string | null;
  isActive: boolean;
  expiresAt: string | null;
  clickCount: number;
  lastClickedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLinksResponse {
  items: LinkItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TimeSeriesPoint {
  bucket: string;
  label: string;
  clicks: number;
  uniqueVisitors: number;
}

export interface BreakdownItem {
  name: string;
  clicks: number;
  percentage: number;
}

export interface RecentClickEvent {
  id: string;
  clickedAt: string;
  referrer: string;
  browser: string;
  os: string;
  deviceCategory: string;
  country: string;
}

export interface AccountOverviewResponse {
  summary: {
    totalLinks: number;
    activeLinks: number;
    disabledLinks: number;
    expiredLinks: number;
    totalClicks: number;
    periodClicks: number;
    clicksLast24h: number;
    uniqueVisitorsPeriod: number;
  };
  topLinks: LinkItem[];
  timeSeries: TimeSeriesPoint[];
  referrers: BreakdownItem[];
  browsers: BreakdownItem[];
  devices: BreakdownItem[];
  operatingSystems: BreakdownItem[];
}

export interface LinkDetailAnalyticsResponse {
  link: LinkItem;
  summary: {
    totalClicks: number;
    periodClicks: number;
    uniqueVisitorsPeriod: number;
    topReferrer: string;
    topDevice: string;
    topBrowser: string;
  };
  timeSeries: TimeSeriesPoint[];
  referrers: BreakdownItem[];
  browsers: BreakdownItem[];
  devices: BreakdownItem[];
  operatingSystems: BreakdownItem[];
  recentClicks: RecentClickEvent[];
}

export type LinkStatus = 'active' | 'disabled' | 'expired';

export function getLinkStatus(link: LinkItem): LinkStatus {
  if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) {
    return 'expired';
  }
  if (!link.isActive) {
    return 'disabled';
  }
  return 'active';
}

export function buildShortUrl(slug: string): string {
  if (typeof window === 'undefined') return `/${slug}`;
  return `${window.location.origin}/${slug}`;
}
