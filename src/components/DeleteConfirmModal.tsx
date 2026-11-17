import { Trash2, X } from 'lucide-react';
import type { LinkItem } from '../types/linkvault.ts';

interface DeleteConfirmModalProps {
  link: LinkItem | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  link,
  deleting,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!link) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#11151E] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 id="delete-modal-title" className="font-display text-base font-semibold text-white">
            Delete short link
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close delete dialog"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Permanently delete <span className="font-mono text-white">/{link.slug}</span> and all{' '}
            <span className="font-mono tabular-nums text-white">{link.clickCount}</span> recorded
            click events? Visitors opening this slug will see a 404 page.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="px-4 py-2 rounded-lg border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-sm font-medium text-white inline-flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>{deleting ? 'Deleting...' : 'Delete permanently'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
