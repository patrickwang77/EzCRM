import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { LayoutProvider } from './context/LayoutContext';
import { AppShell } from './components/AppShell';
import { GlobalQuickCreateModal } from './components/GlobalQuickCreateModal';
import { Dashboard } from './pages/Dashboard';
import { Pipeline } from './pages/Pipeline';
import { Accounts } from './pages/Accounts';
import { ManagementMetrics } from './pages/ManagementMetrics';
import { Activities } from './pages/Activities';
import { Settings } from './pages/Settings';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');

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
      {renderContent()}
      <GlobalQuickCreateModal />
    </AppShell>
  );
}

function App() {
  return (
    <AuthProvider>
      <LayoutProvider>
        <AppContent />
      </LayoutProvider>
    </AuthProvider>
  );
}

export default App;
