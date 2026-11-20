import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SidebarLayout } from './components/SidebarLayout';
import { Dashboard } from './pages/Dashboard';
import { Pipeline } from './pages/Pipeline';
import { Activities } from './pages/Activities';
import { Settings } from './pages/Settings';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'pipeline':
        return <Pipeline />;
      case 'activities':
        return <Activities setActiveTab={setActiveTab} />;
      case 'systemSettings':
        return <Settings key="system" mode="system" />;
      case 'salesSettings':
        return <Settings key="sales" mode="sales" />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SidebarLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </SidebarLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
