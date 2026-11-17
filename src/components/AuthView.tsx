import React, { useState } from 'react';
import { ArrowRight, BarChart3, Clock, Link2, QrCode, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

type AuthMode = 'signin' | 'signup' | 'reset';

function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completion.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email address or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in Firebase Console. Use Continue with Google below, or enable Email/Password under Authentication > Sign-in method.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment before trying again.';
    default:
      return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  }
}

export function AuthView() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await loginWithEmail(email.trim(), password);
      } else if (mode === 'signup') {
        await registerWithEmail(name.trim(), email.trim(), password);
      } else {
        await requestPasswordReset(email.trim());
        setNotice('If an account matches that email, a password reset link has been sent.');
      }
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToAuth = () => {
    document.getElementById('auth-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#090B10] text-slate-100 flex flex-col">
      {/* Three-Zone Top Bar Contract */}
      <header className="border-b border-slate-800/80 bg-[#090B10]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="/"
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            LinkVault
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            <a
              href="#capabilities"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#analytics-architecture"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Analytics
            </a>
            <a
              href="#governance"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Governance
            </a>
          </nav>

          <button
            type="button"
            onClick={scrollToAuth}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Open Console
          </button>
        </div>
      </header>

      {/* Main Focal Hero + Auth Split */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-5">
                <p className="text-sm font-medium text-indigo-400 tracking-wide">
                  Link Infrastructure &amp; Click Telemetry
                </p>
                <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1] text-balance max-w-2xl">
                  Shorten, govern, and measure every outbound link.
                </h1>
                <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-xl tracking-[0.01em]">
                  LinkVault turns long destination URLs into resilient short links with custom
                  slugs, expiration schedules, downloadable QR codes, and real-time referral,
                  browser, and device analytics.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 pt-4 border-t border-slate-800/80">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Link2 className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>Custom Slugs &amp; Zero-Latency Redirects</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Server-validated URLs and instant 302 redirects with asynchronous click capture.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <BarChart3 className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>Referrer, Browser &amp; Device Breakdown</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Track traffic sources, operating systems, and unique visitors across custom date
                    ranges.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <QrCode className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>Vector &amp; High-Res QR Codes</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Generate and export crisp SVG and 1024px PNG QR codes for every link.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>Lifecycle &amp; Expiration Controls</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Schedule link expiration timestamps, pause routing instantly, or update targets
                    anytime.
                  </p>
                </div>
              </div>
            </div>

            {/* Auth Panel */}
            <div
              id="auth-panel"
              className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#11151E] p-6 sm:p-8"
            >
              <div className="space-y-1 mb-6">
                <h2 className="font-display text-xl font-semibold text-white">
                  {mode === 'signin'
                    ? 'Sign in to LinkVault'
                    : mode === 'signup'
                      ? 'Create your workspace'
                      : 'Reset your password'}
                </h2>
                <p className="text-sm text-slate-400">
                  {mode === 'signin'
                    ? 'Access your links, QR codes, and click analytics.'
                    : mode === 'signup'
                      ? 'Start shortening and tracking links in seconds.'
                      : 'Enter your email address to receive a recovery link.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting}
                className="w-full h-11 rounded-lg border border-slate-700 bg-[#161B26] hover:bg-[#1C2230] text-slate-100 text-sm font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#11151E] px-3 text-slate-500">or use email</span>
                </div>
              </div>

              {/* Segmented mode switcher */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#090B10] border border-slate-800/80 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                    setNotice(null);
                  }}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    mode === 'signin'
                      ? 'bg-[#192030] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setNotice(null);
                  }}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    mode === 'signup'
                      ? 'bg-[#192030] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setError(null);
                    setNotice(null);
                  }}
                  className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    mode === 'reset'
                      ? 'bg-[#192030] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Recovery
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200 leading-relaxed"
                >
                  {error}
                </div>
              )}

              {notice && (
                <div
                  role="status"
                  className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200 leading-relaxed"
                >
                  {notice}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label htmlFor="auth-name" className="block text-xs font-medium text-slate-300">
                      Full name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full h-10 rounded-lg border border-slate-800 bg-[#090B10] px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="auth-email" className="block text-xs font-medium text-slate-300">
                    Email address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full h-10 rounded-lg border border-slate-800 bg-[#090B10] px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {mode !== 'reset' && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-medium text-slate-300"
                    >
                      Password
                    </label>
                    <input
                      id="auth-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 rounded-lg border border-slate-800 bg-[#090B10] px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <span>
                    {submitting
                      ? 'Working...'
                      : mode === 'signin'
                        ? 'Sign in'
                        : mode === 'signup'
                          ? 'Create account'
                          : 'Send recovery email'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Mechanism-to-Outcome Architecture Section */}
        <section id="capabilities" className="border-t border-slate-800/80 bg-[#0B0E15]">
          <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div id="analytics-architecture" className="space-y-2.5">
              <p className="text-xs font-mono text-indigo-400">01. Ingestion</p>
              <h3 className="font-display text-lg font-semibold text-white">
                Non-blocking click capture
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Redirects dispatch immediately via HTTP 302 with no-store cache directives while
                referrer domains, browser families, and device types record asynchronously.
              </p>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-mono text-indigo-400">02. Diagnostics</p>
              <h3 className="font-display text-lg font-semibold text-white">
                Per-link &amp; account telemetry
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Inspect 24-hour hourly trends or 90-day traffic curves, unique visitor counts,
                referrer shares, and recent click logs in one unified console.
              </p>
            </div>

            <div id="governance" className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>03. Governance</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-white">
                Strict validation &amp; rate limits
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every URL, custom slug, and expiration timestamp is validated on the server with
                per-user ownership isolation and sliding-window rate protection.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>LinkVault — Short Link &amp; Analytics Platform</span>
          <span>Firebase Auth · Cloud Firestore</span>
        </div>
      </footer>
    </div>
  );
}
