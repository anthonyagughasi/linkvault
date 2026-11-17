import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error';
  message: string;
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#131823] px-4 py-3 text-sm text-slate-100 shadow-lg shadow-black/40"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-slate-200 transition-colors p-1 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
