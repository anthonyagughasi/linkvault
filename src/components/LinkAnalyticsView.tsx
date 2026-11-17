import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Copy,
  Edit3,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { fetchLinkDetailAnalytics } from '../lib/firestore-service.ts';
import {
  buildShortUrl,
  getLinkStatus,
  type LinkDetailAnalyticsResponse,
  type LinkItem,
} from '../types/linkvault.ts';
import { BreakdownBarChart, BreakdownList, TrafficAreaChart } from './AnalyticsCharts.tsx';

interface LinkAnalyticsViewProps {
  linkId: string;
  refreshSignal: number;
  onBack: () => void;
  onEdit: (link: LinkItem) => void;
  onOpenQr: (link: LinkItem) => void;
  onCopyUrl: (url: string) => void;
}

const RANGE_OPTIONS = [
  { days: 1, label: '24h' },
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
];

export function LinkAnalyticsView({
  linkId,
  refreshSignal,
  onBack,
  onEdit,
  onOpenQr,
  onCopyUrl,
}: LinkAnalyticsViewProps) {
  const { user } = useAuth();
  const [rangeDays, setRangeDays] = useState(30);
  const [data, setData] = useState<LinkDetailAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLinkDetailAnalytics(user.uid, linkId, rangeDays);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load link analytics.');
    } finally {
      setLoading(false);
    }
  }, [user, linkId, rangeDays]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail, refreshSignal]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-24 rounded-xl border border-slate-800 bg-[#11151E] animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-slate-800 bg-[#11151E] animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-xl border border-slate-800 bg-[#11151E] animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 space-y-4">
        <p className="text-sm text-rose-200">{error || 'Link analytics could not be loaded.'}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            Back to Links
          </button>
          <button
            type="button"
            onClick={() => void loadDetail()}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { link, summary } = data;
  const status = getLinkStatus(link);
  const shortUrl = buildShortUrl(link.slug);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Links</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-xl font-semibold text-white">
                {link.title || `/${link.slug}`}
              </h2>
              <span className="text-slate-600">·</span>
              <span className="font-mono text-sm text-indigo-400">{shortUrl}</span>
              <span className="text-slate-600">·</span>
              <span
                className={`text-xs font-medium ${
                  status === 'active'
                    ? 'text-emerald-400'
                    : status === 'disabled'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                }`}
              >
                {status === 'active' ? 'Active' : status === 'disabled' ? 'Disabled' : 'Expired'}
              </span>
            </div>

            <a
              href={link.originalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 max-w-2xl truncate"
            >
              <span className="truncate">{link.originalUrl}</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onCopyUrl(shortUrl)}
              className="h-9 px-3 rounded-lg border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800/70 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenQr(link)}
              className="h-9 px-3 rounded-lg border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800/70 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>QR Code</span>
            </button>
            <button
              type="button"
              onClick={() => onEdit(link)}
              className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Link</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Column Link KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-1">
          <p className="text-xs text-slate-400">Lifetime Clicks</p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-white">
            {summary.totalClicks.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {summary.periodClicks.toLocaleString()} in selected range
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-1">
          <p className="text-xs text-slate-400">Unique Visitors</p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-white">
            {summary.uniqueVisitorsPeriod.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">Privacy-hashed IP count</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-1">
          <p className="text-xs text-slate-400">Top Referrer</p>
          <p className="font-display text-xl font-semibold text-white truncate">
            {summary.topReferrer}
          </p>
          <p className="text-xs text-slate-500">Primary traffic origin</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-1">
          <p className="text-xs text-slate-400">Primary Device / Browser</p>
          <p className="font-display text-xl font-semibold text-white truncate">
            {summary.topDevice} · {summary.topBrowser}
          </p>
          <p className="text-xs text-slate-500">Most common visitor client</p>
        </div>
      </div>

      {/* Time-Series Chart */}
      <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold text-white">Click Velocity</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clicks and unique visitors over time
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

        <TrafficAreaChart data={data.timeSeries} />
      </div>

      {/* Referrer, Browser, Device, OS Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-4">
          <h3 className="font-display text-sm font-semibold text-white">Referral Sources</h3>
          <BreakdownBarChart
            data={data.referrers}
            emptyLabel="No referrer traffic recorded yet."
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-4">
          <h3 className="font-display text-sm font-semibold text-white">Browsers</h3>
          <BreakdownList
            data={data.browsers}
            emptyLabel="No browser telemetry recorded yet."
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-4">
          <h3 className="font-display text-sm font-semibold text-white">Device Categories</h3>
          <BreakdownList
            data={data.devices}
            emptyLabel="No device telemetry recorded yet."
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#11151E] p-5 space-y-4">
          <h3 className="font-display text-sm font-semibold text-white">Operating Systems</h3>
          <BreakdownList
            data={data.operatingSystems}
            emptyLabel="No OS telemetry recorded yet."
          />
        </div>
      </div>

      {/* Recent Click Events Log */}
      <div className="rounded-xl border border-slate-800 bg-[#11151E] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="font-display text-sm font-semibold text-white">Recent Click Events</h3>
          <p className="text-xs text-slate-400 mt-0.5">Last 25 recorded visits to /{link.slug}</p>
        </div>

        {data.recentClicks.length === 0 ? (
          <div className="py-10 px-6 text-center text-xs text-slate-500">
            No visits recorded yet. Open or share <span className="font-mono text-indigo-400">{shortUrl}</span> to test click tracking.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-xs font-medium text-slate-400">
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-5">Referrer</th>
                  <th className="py-3 px-5">Browser</th>
                  <th className="py-3 px-5">OS</th>
                  <th className="py-3 px-5">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {data.recentClicks.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-5 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                      {new Date(evt.clickedAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-5 text-slate-200">{evt.referrer}</td>
                    <td className="py-2.5 px-5 text-slate-300">{evt.browser}</td>
                    <td className="py-2.5 px-5 text-slate-300">{evt.os}</td>
                    <td className="py-2.5 px-5 text-slate-300">{evt.deviceCategory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
