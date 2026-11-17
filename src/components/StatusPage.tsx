import { AlertTriangle, Clock, Ban, ArrowLeft } from 'lucide-react';

interface StatusPageProps {
  variant: 'expired' | 'disabled' | 'not-found';
  slug?: string | null;
  onGoHome: () => void;
}

export function StatusPage({ variant, slug, onGoHome }: StatusPageProps) {
  const config = {
    expired: {
      icon: Clock,
      code: '410',
      title: 'This short link has expired',
      description:
        'The owner scheduled an expiration timestamp for this link, and it is no longer accepting redirects.',
    },
    disabled: {
      icon: Ban,
      code: '403',
      title: 'This short link is paused',
      description:
        'The owner has temporarily deactivated this short link. Contact the link owner if you need updated access.',
    },
    'not-found': {
      icon: AlertTriangle,
      code: '404',
      title: 'Short link not found',
      description:
        'We could not find an active destination matching this address. Double-check the URL for typos.',
    },
  }[variant];

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-[#090B10] text-slate-100 flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full rounded-xl border border-slate-800 bg-[#11151E] p-8 text-center space-y-5">
        <div className="mx-auto h-11 w-11 rounded-lg border border-slate-800 bg-[#090B10] flex items-center justify-center text-slate-300">
          <Icon className="h-5 w-5" />
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs text-slate-500 tabular-nums">HTTP {config.code}</p>
          <h1 className="font-display text-xl font-semibold text-white">{config.title}</h1>
          {slug && (
            <p className="font-mono text-xs text-indigo-400 break-all">/{slug}</p>
          )}
          <p className="text-sm text-slate-400 leading-relaxed pt-1">{config.description}</p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to LinkVault</span>
          </button>
        </div>
      </div>
    </div>
  );
}
