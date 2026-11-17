import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(message) as { error?: string; operationType?: string; path?: string };
      if (parsed && typeof parsed.error === 'string') {
        message = parsed.error;
      }
    } catch {
      // Non-JSON error message; display as-is
    }
    return { hasError: true, message };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('LinkVault ErrorBoundary caught error:', error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090B10] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-slate-800 bg-[#11151E] p-8 text-center space-y-5">
            <div className="mx-auto h-11 w-11 rounded-lg border border-rose-500/30 bg-rose-500/10 flex items-center justify-center text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-lg font-semibold text-white">
                Something went wrong
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed break-words">
                {this.state.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reload LinkVault</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
