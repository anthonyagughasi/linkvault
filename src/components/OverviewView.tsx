import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, BarChart2, Copy, Link2, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { createShortLink, fetchOverviewAnalytics } from '../lib/firestore-service.ts';
import {
  buildShortUrl,
  getLinkStatus,
  type AccountOverviewResponse,
  type LinkItem,
} from '../types/linkvault.ts';
import { BreakdownBarChart, BreakdownList, TrafficAreaChart } from './AnalyticsCharts.tsx';

interface OverviewViewProps {
  refreshSignal: number;
  onOpenCreateModal: () => void;
  onSelectLinkAnalytics: (linkId: string) => void;
  onCopyUrl: (url: string) => void;
  onToast: (type: 'success' | 'error', message: string) => void;
  onLinkCreated: (link: LinkItem) => void;
}

const RANGE_OPTIONS = [
  { days: 1, label: '24h' },
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
];

export function OverviewView({
  refreshSignal,
  onOpenCreateModal,
  onSelectLinkAnalytics,
  onCopyUrl,
  onToast,
  onLinkCreated,
}: OverviewViewProps) {
  const { user } = useAuth();
  const [rangeDays, setRangeDays] = useState(30);
  const [data, setData] = useState<AccountOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick shorten bar state
  const [quickUrl, setQuickUrl] = useState('');
  const [quickSlug, setQuickSlug] = useState('');
  const [creatingQuick, setCreatingQuick] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOverviewAnalytics(user.uid, rangeDays);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load overview analytics.');
    } finally {
      setLoading(false);
    }
  }, [user, rangeDays]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview, refreshSignal]);

  const handleQuickShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !quickUrl.trim()) return;
    setCreatingQuick(true);
    try {
      const { link } = await createShortLink(user.uid, {
        originalUrl: quickUrl.trim(),
        customSlug: quickSlug.trim() || null,
      });
      setQuickUrl('');
      setQuickSlug('');
      onLinkCreated(link);
      onCopyUrl(buildShortUrl(link.slug));
      onToast('success', `Created /${link.slug} and copied URL to clipboard.`);
      await loadOverview();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to shorten URL.');
    } finally {
      setCreatingQuick(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Shorten Inline Bar */}
      <form
        onSubmit={handleQuickShorten}
        className="rounded-xl border border-slate-800 bg-[#11151E] p-4 sm:p-5"
      >
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="quick-url" className="sr-only">
              Destination URL
            </label>
            <input
              id="quick-url"
              type="url"
              required
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              placeholder="Paste a long URL to shorten immediately (https://...)"
              className="w-full h-10 rounded-lg border border-slate-800 bg-[#090B10] px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="w-full lg:w-52">
            <label htmlFor="quick-slug" className="sr-only">
              Custom slug (optional)
            </label>
            <input
              id="quick-slug"
              type="text"
              value={quickSlug}
              onChange={(e) => setQuickSlug(e.target.value)}
              placeholder="Custom slug (optional)"
              className="w-full h-10 rounded-lg border border-slate-800 bg-[#090B10] px-3.5 font-mono text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={creatingQuick}
            className="h-10 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>{creatingQuick ? 'Shortening...' : 'Shorten Link'}</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-xs font-medium hover:bg-rose-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-400">Total Clicks</p>
          <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-white">
            {loading ? '—' : (data?.summary.totalClicks ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {loading ? 'Loading...' : `${data?.summary.periodClicks ?? 0} in last ${rangeDays}d`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-400">Active Links</p>
          <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-white">
            {loading ? '—' : (data?.summary.activeLinks ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {loading
              ? 'Loading...'
              : `${data?.summary.totalLinks ?? 0} total · ${data?.summary.expiredLinks ?? 0} expired`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-400">Clicks (24h)</p>
          <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-white">
            {loading ? '—' : (data?.summary.clicksLast24h ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">Rolling 24-hour window</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-400">Unique Visitors</p>
          <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-white">
            {loading ? '—' : (data?.summary.uniqueVisitorsPeriod ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            Last {rangeDays === 1 ? '24 hours' : `${rangeDays} days`}
          </p>
        </div>
      </div>

      {/* Main Clicks Time-Series Card */}
      <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Account Click Activity
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Total clicks and unique visitors across all short links
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#090B10] border border-slate-800 self-start sm:self-auto">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => setRangeDays(opt.days)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  rangeDays === opt.days
                    ? 'bg-[#192030] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-64 rounded-lg bg-slate-800/30 animate-pulse" />
        ) : (
          <TrafficAreaChart data={data?.timeSeries ?? []} />
        )}
      </div>

      {/* Referrer, Browser & Device Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-4">
          <div>
            <h3 className="font-display text-sm font-semibold text-white">Top Referrers</h3>
            <p className="text-xs text-slate-400 mt-0.5">Origin domains driving traffic</p>
          </div>
          {loading ? (
            <div className="h-52 rounded-lg bg-slate-800/30 animate-pulse" />
          ) : (
            <BreakdownBarChart
              data={data?.referrers ?? []}
              emptyLabel="No referrer data in this timeframe."
            />
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-4">
          <div>
            <h3 className="font-display text-sm font-semibold text-white">Browsers</h3>
            <p className="text-xs text-slate-400 mt-0.5">Client browser distribution</p>
          </div>
          {loading ? (
            <div className="h-52 rounded-lg bg-slate-800/30 animate-pulse" />
          ) : (
            <BreakdownList
              data={data?.browsers ?? []}
              emptyLabel="No browser telemetry recorded yet."
            />
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-4">
          <div>
            <h3 className="font-display text-sm font-semibold text-white">Device Categories</h3>
            <p className="text-xs text-slate-400 mt-0.5">Desktop, mobile, tablet, and bot traffic</p>
          </div>
          {loading ? (
            <div className="h-52 rounded-lg bg-slate-800/30 animate-pulse" />
          ) : (
            <BreakdownList
              data={data?.devices ?? []}
              emptyLabel="No device telemetry recorded yet."
            />
          )}
        </div>
      </div>

      {/* Top Performing Links Table */}
      <div className="rounded-xl border border-slate-800 bg-[#11151E] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="font-display text-sm font-semibold text-white">Top Performing Links</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Highest-traffic links sorted by lifetime clicks
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap"
          >
            Create link
          </button>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((row) => (
              <div key={row} className="h-10 rounded bg-slate-800/30 animate-pulse" />
            ))}
          </div>
        ) : !data || data.topLinks.length === 0 ? (
          <div className="py-12 px-6 text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-lg border border-slate-800 bg-[#090B10] flex items-center justify-center text-slate-400">
              <Link2 className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-200">No links created yet</p>
              <p className="text-xs text-slate-500">
                Shorten your first URL above to start collecting click telemetry.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-xs text-slate-400 font-medium">
                  <th className="py-3 px-5">Short Link</th>
                  <th className="py-3 px-5">Destination</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Clicks</th>
                  <th className="py-3 px-5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {data.topLinks.map((link) => {
                  const status = getLinkStatus(link);
                  const shortUrl = buildShortUrl(link.slug);
                  return (
                    <tr key={link.id} className="hover:bg-slate-800/25 transition-colors">
                      <td className="py-3 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-indigo-400 font-medium">
                            /{link.slug}
                          </span>
                          <button
                            type="button"
                            onClick={() => onCopyUrl(shortUrl)}
                            title="Copy short URL"
                            aria-label={`Copy ${shortUrl}`}
                            className="text-slate-500 hover:text-slate-200 p-1 rounded"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-5 max-w-xs">
                        <a
                          href={link.originalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-300 hover:text-white inline-flex items-center gap-1 max-w-full truncate"
                        >
                          <span className="truncate">{link.title || link.originalUrl}</span>
                          <ArrowUpRight className="h-3 w-3 shrink-0 text-slate-500" />
                        </a>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap text-xs">
                        <span
                          className={
                            status === 'active'
                              ? 'text-emerald-400'
                              : status === 'disabled'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                          }
                        >
                          {status === 'active'
                            ? 'Active'
                            : status === 'disabled'
                              ? 'Disabled'
                              : 'Expired'}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums text-xs text-slate-200">
                        {link.clickCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelectLinkAnalytics(link.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white px-2.5 py-1 rounded-md hover:bg-slate-800/60 transition-colors"
                        >
                          <BarChart2 className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Analytics</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
