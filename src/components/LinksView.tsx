import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  Link2,
  PauseCircle,
  PlayCircle,
  Plus,
  QrCode,
  Search,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { deleteShortLink, fetchLinks, updateShortLink } from '../lib/firestore-service.ts';
import {
  buildShortUrl,
  getLinkStatus,
  type LinkItem,
  type PaginatedLinksResponse,
} from '../types/linkvault.ts';
import { DeleteConfirmModal } from './DeleteConfirmModal.tsx';

interface LinksViewProps {
  refreshSignal: number;
  onOpenCreate: () => void;
  onOpenEdit: (link: LinkItem) => void;
  onOpenQr: (link: LinkItem) => void;
  onOpenAnalytics: (linkId: string) => void;
  onCopyUrl: (url: string) => void;
  onToast: (type: 'success' | 'error', message: string) => void;
  onChanged: () => void;
}

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'disabled', label: 'Disabled' },
  { key: 'expired', label: 'Expired' },
] as const;

export function LinksView({
  refreshSignal,
  onOpenCreate,
  onOpenEdit,
  onOpenQr,
  onOpenAnalytics,
  onCopyUrl,
  onToast,
  onChanged,
}: LinksViewProps) {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'clicks' | 'recent'>('newest');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PaginatedLinksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deletingLink, setDeletingLink] = useState<LinkItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadLinks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLinks(user.uid, {
        search: debouncedSearch,
        status: statusFilter,
        sort: sortBy,
        page,
        limit: 10,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load links.');
    } finally {
      setLoading(false);
    }
  }, [user, debouncedSearch, statusFilter, sortBy, page]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks, refreshSignal]);

  const handleToggleActive = async (link: LinkItem) => {
    if (!user) return;
    try {
      await updateShortLink(user.uid, link, { isActive: !link.isActive });
      onToast('success', link.isActive ? `Paused /${link.slug}` : `Activated /${link.slug}`);
      await loadLinks();
      onChanged();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to update link status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingLink) return;
    setIsDeleting(true);
    try {
      await deleteShortLink(deletingLink);
      onToast('success', `Deleted /${deletingLink.slug}`);
      setDeletingLink(null);
      await loadLinks();
      onChanged();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to delete link.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never';
    const d = new Date(expiresAt);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-5">
      {/* Toolbar: Search, Status Segmented Control, Sort */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by slug, URL, or label..."
            aria-label="Search links"
            className="w-full h-10 rounded-lg border border-slate-800 bg-[#11151E] pl-10 pr-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#11151E] border border-slate-800">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === tab.key
                    ? 'bg-[#1D2434] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as 'newest' | 'clicks' | 'recent');
              setPage(1);
            }}
            aria-label="Sort links"
            className="h-10 rounded-lg border border-slate-800 bg-[#11151E] px-3 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="newest">Newest first</option>
            <option value="clicks">Most clicks</option>
            <option value="recent">Recently clicked</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadLinks()}
            className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-xs font-medium hover:bg-rose-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Links Container */}
      <div className="rounded-xl border border-slate-800 bg-[#11151E] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-800/60">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-36 rounded bg-slate-800/60 animate-pulse" />
                  <div className="h-3 w-64 rounded bg-slate-800/40 animate-pulse" />
                </div>
                <div className="h-4 w-16 rounded bg-slate-800/50 animate-pulse" />
              </div>
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-4">
            <div className="mx-auto h-11 w-11 rounded-lg border border-slate-800 bg-[#090B10] flex items-center justify-center text-slate-400">
              <Link2 className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <p className="font-display text-base font-semibold text-white">
                {debouncedSearch || statusFilter !== 'all'
                  ? 'No matching links found'
                  : 'Create your first short link'}
              </p>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                {debouncedSearch || statusFilter !== 'all'
                  ? 'Adjust your search query or status filter to view other links.'
                  : 'Shorten a URL, choose an optional custom slug, configure an expiration date, and generate downloadable QR codes.'}
              </p>
            </div>
            {!debouncedSearch && statusFilter === 'all' && (
              <button
                type="button"
                onClick={onOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create short link</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop High-Density Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-medium text-slate-400">
                    <th className="py-3 px-5">Short Link</th>
                    <th className="py-3 px-5">Destination</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Clicks</th>
                    <th className="py-3 px-5">Expires</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {data.items.map((link) => {
                    const status = getLinkStatus(link);
                    const shortUrl = buildShortUrl(link.slug);
                    return (
                      <tr key={link.id} className="hover:bg-slate-800/25 transition-colors">
                        <td className="py-3 px-5 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenAnalytics(link.id)}
                                className="font-mono text-xs font-medium text-indigo-400 hover:text-indigo-300"
                              >
                                /{link.slug}
                              </button>
                              <button
                                type="button"
                                onClick={() => onCopyUrl(shortUrl)}
                                title="Copy short URL"
                                aria-label={`Copy ${shortUrl}`}
                                className="text-slate-500 hover:text-slate-200 p-1 rounded"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <a
                                href={shortUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Test redirect"
                                aria-label={`Open ${shortUrl}`}
                                className="text-slate-500 hover:text-slate-200 p-1 rounded"
                              >
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </a>
                            </div>
                            {link.title && (
                              <p className="text-xs text-slate-400 truncate max-w-[180px]">
                                {link.title}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-5 max-w-xs">
                          <p
                            className="text-xs text-slate-300 truncate"
                            title={link.originalUrl}
                          >
                            {link.originalUrl}
                          </p>
                        </td>

                        <td className="py-3 px-5 whitespace-nowrap text-xs font-medium">
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

                        <td className="py-3 px-5 whitespace-nowrap font-mono tabular-nums text-xs text-slate-400">
                          {formatExpiry(link.expiresAt)}
                        </td>

                        <td className="py-3 px-5 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenAnalytics(link.id)}
                              title="View analytics"
                              aria-label={`Analytics for /${link.slug}`}
                              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
                            >
                              <BarChart2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenQr(link)}
                              title="QR code"
                              aria-label={`QR code for /${link.slug}`}
                              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenEdit(link)}
                              title="Edit link"
                              aria-label={`Edit /${link.slug}`}
                              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleToggleActive(link)}
                              title={link.isActive ? 'Pause link' : 'Activate link'}
                              aria-label={
                                link.isActive ? `Pause /${link.slug}` : `Activate /${link.slug}`
                              }
                              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
                            >
                              {link.isActive ? (
                                <PauseCircle className="h-4 w-4" />
                              ) : (
                                <PlayCircle className="h-4 w-4 text-emerald-400" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingLink(link)}
                              title="Delete link"
                              aria-label={`Delete /${link.slug}`}
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800/70 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-800/70">
              {data.items.map((link) => {
                const status = getLinkStatus(link);
                const shortUrl = buildShortUrl(link.slug);
                return (
                  <div key={link.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenAnalytics(link.id)}
                            className="font-mono text-sm font-medium text-indigo-400"
                          >
                            /{link.slug}
                          </button>
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
                            {status === 'active'
                              ? 'Active'
                              : status === 'disabled'
                                ? 'Disabled'
                                : 'Expired'}
                          </span>
                        </div>
                        {link.title && (
                          <p className="text-xs font-medium text-slate-200 truncate">{link.title}</p>
                        )}
                        <p className="text-xs text-slate-400 truncate">{link.originalUrl}</p>
                      </div>
                      <span className="font-mono tabular-nums text-xs text-slate-300 shrink-0">
                        {link.clickCount.toLocaleString()} clicks
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-xs text-slate-500">
                        Expires: {formatExpiry(link.expiresAt)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onCopyUrl(shortUrl)}
                          aria-label="Copy short URL"
                          className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenAnalytics(link.id)}
                          aria-label="View analytics"
                          className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <BarChart2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenQr(link)}
                          aria-label="QR code"
                          className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEdit(link)}
                          aria-label="Edit link"
                          className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingLink(link)}
                          aria-label="Delete link"
                          className="p-2 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-800 text-xs text-slate-400">
              <span className="tabular-nums">
                Showing {(data.page - 1) * data.limit + 1}–
                {Math.min(data.page * data.limit, data.total)} of {data.total.toLocaleString()} links
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 rounded-md border border-slate-800 text-slate-300 hover:bg-slate-800/60 disabled:opacity-40 inline-flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
                <span className="font-mono tabular-nums px-2 text-slate-300">
                  {data.page} / {data.totalPages}
                </span>
                <button
                  type="button"
                  disabled={data.page >= data.totalPages}
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  className="h-8 px-2.5 rounded-md border border-slate-800 text-slate-300 hover:bg-slate-800/60 disabled:opacity-40 inline-flex items-center gap-1 transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <DeleteConfirmModal
        link={deletingLink}
        deleting={isDeleting}
        onCancel={() => setDeletingLink(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
