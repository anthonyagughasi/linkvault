import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Plus,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AuthView } from './components/AuthView.tsx';
import { StatusPage } from './components/StatusPage.tsx';
import { OverviewView } from './components/OverviewView.tsx';
import { LinksView } from './components/LinksView.tsx';
import { LinkAnalyticsView } from './components/LinkAnalyticsView.tsx';
import { LinkFormModal } from './components/LinkFormModal.tsx';
import { QrCodeModal } from './components/QrCodeModal.tsx';
import { ToastContainer, type ToastItem } from './components/Toast.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import type { LinkItem } from './types/linkvault.ts';

type WorkspaceTab = 'overview' | 'links' | 'link-detail';

function getInitialRoute(): {
  publicStatus: 'expired' | 'disabled' | 'not-found' | null;
  slugParam: string | null;
  tab: WorkspaceTab;
  linkId: string | null;
} {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const slugParam = params.get('slug');

  if (path === '/expired') {
    return { publicStatus: 'expired', slugParam, tab: 'overview', linkId: null };
  }
  if (path === '/disabled') {
    return { publicStatus: 'disabled', slugParam, tab: 'overview', linkId: null };
  }
  if (path === '/not-found') {
    return { publicStatus: 'not-found', slugParam, tab: 'overview', linkId: null };
  }
  if (path === '/links') {
    return { publicStatus: null, slugParam: null, tab: 'links', linkId: null };
  }
  const analyticsMatch = path.match(/^\/analytics\/([a-zA-Z0-9_-]+)$/);
  if (analyticsMatch) {
    return {
      publicStatus: null,
      slugParam: null,
      tab: 'link-detail',
      linkId: analyticsMatch[1],
    };
  }
  // Any unknown non-app path that fell through Express redirect handler is a 404
  if (
    path !== '/' &&
    path !== '/dashboard' &&
    path !== '/login' &&
    path !== '/register' &&
    path !== '/forgot-password' &&
    path !== '/auth'
  ) {
    return {
      publicStatus: 'not-found',
      slugParam: path.replace(/^\//, ''),
      tab: 'overview',
      linkId: null,
    };
  }
  return { publicStatus: null, slugParam: null, tab: 'overview', linkId: null };
}

function LinkVaultShell() {
  const { user, dbUser, loading, logout } = useAuth();
  const initial = getInitialRoute();

  const [publicStatus, setPublicStatus] = useState<'expired' | 'disabled' | 'not-found' | null>(
    initial.publicStatus
  );
  const [slugParam, setSlugParam] = useState<string | null>(initial.slugParam);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initial.tab);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(initial.linkId);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [qrLink, setQrLink] = useState<LinkItem | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (!user) {
      setSelectedLinkId(null);
      if (activeTab === 'link-detail') {
        setActiveTab('overview');
      }
    }
  }, [user, activeTab]);

  const pushToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const navigate = useCallback((nextPath: string, tab: WorkspaceTab, linkId: string | null = null) => {
    window.history.pushState({}, '', nextPath);
    setPublicStatus(null);
    setSlugParam(null);
    setActiveTab(tab);
    setSelectedLinkId(linkId);
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const next = getInitialRoute();
      setPublicStatus(next.publicStatus);
      setSlugParam(next.slugParam);
      setActiveTab(next.tab);
      setSelectedLinkId(next.linkId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleCopyUrl = useCallback(
    async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        pushToast('success', 'Short URL copied to clipboard.');
      } catch {
        pushToast('error', 'Clipboard access denied. Copy the URL manually.');
      }
    },
    [pushToast]
  );

  if (publicStatus) {
    return (
      <StatusPage
        variant={publicStatus}
        slug={slugParam}
        onGoHome={() => navigate('/', 'overview', null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090B10] flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="h-8 w-8 mx-auto rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400">Loading LinkVault...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const displayName = dbUser?.displayName || user.displayName || user.email || 'Account';
  const email = dbUser?.email || user.email || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  const breadcrumbLabel =
    activeTab === 'overview'
      ? 'Overview'
      : activeTab === 'links'
        ? 'Links'
        : `Analytics / #${selectedLinkId}`;

  return (
    <div className="min-h-screen bg-[#090B10] text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-800/80 bg-[#0C0F17]">
        <div className="h-16 px-6 flex items-center border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => navigate('/dashboard', 'overview', null)}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap"
          >
            LinkVault
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Workspace navigation">
          <button
            type="button"
            onClick={() => navigate('/dashboard', 'overview', null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#171E2E] text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/links', 'links', null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'links' || activeTab === 'link-detail'
                ? 'bg-[#171E2E] text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Link2 className="h-4 w-4 shrink-0" />
            <span>Links</span>
          </button>

          {selectedLinkId && (
            <button
              type="button"
              onClick={() => navigate(`/analytics/${selectedLinkId}`, 'link-detail', selectedLinkId)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'link-detail'
                  ? 'text-indigo-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="truncate">Link #{selectedLinkId}</span>
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-3 min-w-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full object-cover border border-slate-700 shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-semibold text-indigo-300 shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-slate-500 truncate">{email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-[#0C0F17] border-r border-slate-800 flex flex-col z-50">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
              <span className="font-display text-lg font-bold text-white">LinkVault</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              <button
                type="button"
                onClick={() => navigate('/dashboard', 'overview', null)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'overview' ? 'bg-[#171E2E] text-white' : 'text-slate-400'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Overview</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/links', 'links', null)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'links' ? 'bg-[#171E2E] text-white' : 'text-slate-400'
                }`}
              >
                <Link2 className="h-4 w-4" />
                <span>Links</span>
              </button>
            </nav>
            <div className="p-4 border-t border-slate-800 space-y-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{displayName}</p>
                <p className="text-xs text-slate-500 truncate">{email}</p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-800 text-xs font-medium text-slate-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800/80 bg-[#090B10]/95 backdrop-blur-sm sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline">LinkVault</span>
              <span className="text-slate-600 hidden sm:inline">/</span>
              <span className="font-display font-semibold text-white truncate">
                {breadcrumbLabel}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingLink(null);
              setFormOpen(true);
            }}
            className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>New Short Link</span>
          </button>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {activeTab === 'overview' && (
            <OverviewView
              refreshSignal={refreshSignal}
              onOpenCreateModal={() => {
                setEditingLink(null);
                setFormOpen(true);
              }}
              onSelectLinkAnalytics={(id) => navigate(`/analytics/${id}`, 'link-detail', id)}
              onCopyUrl={(url) => void handleCopyUrl(url)}
              onToast={pushToast}
              onLinkCreated={() => setRefreshSignal((s) => s + 1)}
            />
          )}

          {activeTab === 'links' && (
            <LinksView
              refreshSignal={refreshSignal}
              onOpenCreate={() => {
                setEditingLink(null);
                setFormOpen(true);
              }}
              onOpenEdit={(link) => {
                setEditingLink(link);
                setFormOpen(true);
              }}
              onOpenQr={(link) => setQrLink(link)}
              onOpenAnalytics={(id) => navigate(`/analytics/${id}`, 'link-detail', id)}
              onCopyUrl={(url) => void handleCopyUrl(url)}
              onToast={pushToast}
              onChanged={() => setRefreshSignal((s) => s + 1)}
            />
          )}

          {activeTab === 'link-detail' && selectedLinkId && (
            <LinkAnalyticsView
              linkId={selectedLinkId}
              refreshSignal={refreshSignal}
              onBack={() => navigate('/links', 'links', null)}
              onEdit={(link) => {
                setEditingLink(link);
                setFormOpen(true);
              }}
              onOpenQr={(link) => setQrLink(link)}
              onCopyUrl={(url) => void handleCopyUrl(url)}
            />
          )}
        </main>
      </div>

      <LinkFormModal
        open={formOpen}
        editingLink={editingLink}
        onClose={() => {
          setFormOpen(false);
          setEditingLink(null);
        }}
        onSaved={(link, isEdit) => {
          setFormOpen(false);
          setEditingLink(null);
          setRefreshSignal((s) => s + 1);
          pushToast(
            'success',
            isEdit ? `Updated /${link.slug}` : `Created short link /${link.slug}`
          );
        }}
      />

      <QrCodeModal
        link={qrLink}
        onClose={() => setQrLink(null)}
        onCopy={(url) => void handleCopyUrl(url)}
        onDownloaded={(format) => pushToast('success', `Downloaded QR code (${format}).`)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LinkVaultShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
