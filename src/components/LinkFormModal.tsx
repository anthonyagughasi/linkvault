import React, { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  checkSlugAvailability,
  createShortLink,
  updateShortLink,
} from '../lib/firestore-service.ts';
import type { LinkItem } from '../types/linkvault.ts';

interface LinkFormModalProps {
  open: boolean;
  editingLink: LinkItem | null;
  onClose: () => void;
  onSaved: (link: LinkItem, isEdit: boolean) => void;
}

type ExpiryPreset = 'never' | '24h' | '7d' | '30d' | 'custom';

function toLocalDatetimeInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function LinkFormModal({ open, editingLink, onClose, onSaved }: LinkFormModalProps) {
  const { user } = useAuth();
  const [originalUrl, setOriginalUrl] = useState('');
  const [title, setTitle] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>('never');
  const [customExpiry, setCustomExpiry] = useState('');
  const [expiryTouched, setExpiryTouched] = useState(false);

  const [slugStatus, setSlugStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    reason: string | null;
  }>({ checking: false, available: null, reason: null });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setExpiryTouched(false);
    if (editingLink) {
      setOriginalUrl(editingLink.originalUrl);
      setTitle(editingLink.title || '');
      setCustomSlug(editingLink.slug);
      setIsActive(editingLink.isActive);
      if (editingLink.expiresAt) {
        setExpiryPreset('custom');
        setCustomExpiry(toLocalDatetimeInput(editingLink.expiresAt));
      } else {
        setExpiryPreset('never');
        setCustomExpiry('');
      }
    } else {
      setOriginalUrl('');
      setTitle('');
      setCustomSlug('');
      setIsActive(true);
      setExpiryPreset('never');
      setCustomExpiry('');
    }
    setSlugStatus({ checking: false, available: null, reason: null });
  }, [open, editingLink]);

  // Debounced live slug check
  useEffect(() => {
    if (!open) return;
    const trimmed = customSlug.trim();
    if (!trimmed) {
      setSlugStatus({ checking: false, available: null, reason: null });
      return;
    }
    if (editingLink && trimmed === editingLink.slug) {
      setSlugStatus({ checking: false, available: true, reason: null });
      return;
    }

    setSlugStatus({ checking: true, available: null, reason: null });
    const timer = setTimeout(async () => {
      try {
        const res = await checkSlugAvailability(trimmed, editingLink?.id);
        setSlugStatus({
          checking: false,
          available: res.available,
          reason: res.reason,
        });
      } catch {
        setSlugStatus({ checking: false, available: null, reason: null });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customSlug, open, editingLink]);

  if (!open) return null;

  const resolveExpiresAt = (): string | null => {
    const now = Date.now();
    if (expiryPreset === 'never') return null;
    if (expiryPreset === '24h') return new Date(now + 86_400_000).toISOString();
    if (expiryPreset === '7d') return new Date(now + 7 * 86_400_000).toISOString();
    if (expiryPreset === '30d') return new Date(now + 30 * 86_400_000).toISOString();
    if (!customExpiry) return null;
    const parsed = new Date(customExpiry);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const expiresAt = resolveExpiresAt();
      if (editingLink) {
        const patch: Parameters<typeof updateShortLink>[2] = {
          originalUrl: originalUrl.trim(),
          title: title.trim() || null,
          slug: customSlug.trim() || editingLink.slug,
          isActive,
        };
        if (expiryTouched) {
          patch.expiresAt = expiresAt;
        }
        const { link } = await updateShortLink(user.uid, editingLink, patch);
        onSaved(link, true);
      } else {
        const { link } = await createShortLink(user.uid, {
          originalUrl: originalUrl.trim(),
          title: title.trim() || null,
          customSlug: customSlug.trim() || null,
          expiresAt,
        });
        onSaved(link, false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#11151E] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 id="link-modal-title" className="font-display text-lg font-semibold text-white">
            {editingLink ? 'Edit short link' : 'Create short link'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200"
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="dest-url" className="block text-xs font-medium text-slate-300">
              Destination URL
            </label>
            <input
              id="dest-url"
              type="url"
              required
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              placeholder="https://example.com/launch/announcement"
              className="w-full h-10 rounded-lg border border-slate-800 bg-[#090B10] px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="link-title" className="block text-xs font-medium text-slate-300">
                Label <span className="text-slate-500">(optional)</span>
              </label>
              <input
                id="link-title"
                type="text"
                maxLength={140}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Q4 Product Launch"
                className="w-full h-10 rounded-lg border border-slate-800 bg-[#090B10] px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="custom-slug" className="block text-xs font-medium text-slate-300">
                Custom slug <span className="text-slate-500">{editingLink ? '' : '(optional)'}</span>
              </label>
              <div className="relative">
                <input
                  id="custom-slug"
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="launch-26"
                  className="w-full h-10 rounded-lg border border-slate-800 bg-[#090B10] pl-3 pr-8 font-mono text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {slugStatus.checking && (
                    <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin" />
                  )}
                  {!slugStatus.checking && slugStatus.available === true && (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                </div>
              </div>
              {slugStatus.reason && (
                <p className="text-xs text-rose-400">{slugStatus.reason}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-300">Link expiration</span>
            <div className="grid grid-cols-5 gap-1 p-1 rounded-lg bg-[#090B10] border border-slate-800">
              {(
                [
                  ['never', 'Never'],
                  ['24h', '24h'],
                  ['7d', '7 days'],
                  ['30d', '30 days'],
                  ['custom', 'Custom'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setExpiryPreset(key);
                    setExpiryTouched(true);
                  }}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    expiryPreset === key
                      ? 'bg-[#192030] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {expiryPreset === 'custom' && (
              <input
                type="datetime-local"
                value={customExpiry}
                onChange={(e) => {
                  setCustomExpiry(e.target.value);
                  setExpiryTouched(true);
                }}
                className="w-full h-10 rounded-lg border border-slate-800 bg-[#090B10] px-3 font-mono text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>

          {editingLink && (
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-medium text-slate-200">Active routing</p>
                <p className="text-xs text-slate-500">
                  Disable to pause redirects without deleting analytics.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors ${
                  isActive ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || slugStatus.available === false}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingLink ? 'Save changes' : 'Create short link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
