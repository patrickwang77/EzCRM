import { Suspense, lazy, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LayoutProvider } from './context/LayoutContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { AppShell } from './components/AppShell';
import { GlobalQuickCreateModal } from './components/GlobalQuickCreateModal';
import { LoginScreen } from './components/LoginScreen';

// Dynamic route-level code-splitting to keep initial bundle lean
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Pipeline = lazy(() => import('./pages/Pipeline').then(m => ({ default: m.Pipeline })));
const Accounts = lazy(() => import('./pages/Accounts').then(m => ({ default: m.Accounts })));
const ManagementMetrics = lazy(() =>
  import('./pages/ManagementMetrics').then(m => ({ default: m.ManagementMetrics }))
);
const Activities = lazy(() => import('./pages/Activities').then(m => ({ default: m.Activities })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

const TAB_TITLES: Record<string, string> = {
  dashboard: '分析儀表板',
  pipeline: 'BD Pipeline',
  accounts: '客戶總覽 360°',
  metrics: '管理指標檢核',
  activities: '任務活動歷程',
  salesSettings: '銷售設定',
  systemSettings: '系統設定',
};

const PageLoader = () => (
  <div
    className="flex items-center justify-center h-80"
    role="progressbar"
    aria-label="載入頁面內容中"
  >
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
  </div>
);

function AppContent() {
  const { authMode, authStatus, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Update SPA document title on view transitions
  useEffect(() => {
    if (authMode === 'firebase' && authStatus !== 'authenticated') {
      document.title = 'EzCRM - 登入';
      return;
    }
    const label = TAB_TITLES[activeTab] || '分析儀表板';
    document.title = `EzCRM - ${label}`;
  }, [activeTab, authMode, authStatus]);

  if (authMode === 'firebase' && (loading || authStatus === 'loading')) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (authMode === 'firebase' && authStatus !== 'authenticated') {
    return <LoginScreen />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'pipeline':
        return <Pipeline />;
      case 'accounts':
        return <Accounts setActiveTab={setActiveTab} />;
      case 'metrics':
        return <ManagementMetrics />;
      case 'activities':
        return <Activities setActiveTab={setActiveTab} />;
      case 'systemSettings':
        return <Settings key="system" mode="system" />;
      case 'salesSettings':
        return <Settings key="sales" mode="sales" />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <AppShell activeTab={activeTab} setActiveTab={setActiveTab}>
      <Suspense fallback={<PageLoader />}>{renderContent()}</Suspense>
      <GlobalQuickCreateModal />
    </AppShell>
  );
}

function App() {
  return (
    <AuthProvider>
      <LayoutProvider>
        <FeedbackProvider>
          <AppContent />
        </FeedbackProvider>
      </LayoutProvider>
    </AuthProvider>
  );
}

export default App;
