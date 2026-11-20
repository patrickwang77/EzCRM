import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  KanbanSquare, 
  CheckSquare, 
  Settings, 
  Shield, 
  User as UserIcon,
  ChevronDown,
  Building2,
  Lock,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';

interface SidebarLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab 
}) => {
  const { currentUser, availableUsers, switchUser } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const menuItems = [
    { id: 'dashboard', name: '分析儀表板', icon: LayoutDashboard, requiresAdmin: false },
    { id: 'pipeline', name: 'BD Pipeline', icon: KanbanSquare, requiresAdmin: false },
    { id: 'activities', name: '任務活動歷程', icon: CheckSquare, requiresAdmin: false },
    { id: 'salesSettings', name: '銷售設定', icon: Building2, requiresAdmin: false },
    { id: 'systemSettings', name: '系統設定', icon: Settings, requiresAdmin: true },
  ];

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
      case 'BU_HEAD':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'AM':
      default:
        return 'bg-sky-500/10 text-sky-500 border border-sky-500/20';
    }
  };

  const handleTabClick = (tabId: string, requiresAdmin: boolean) => {
    if (requiresAdmin && currentUser?.role !== 'ADMIN') {
      alert('⚠️ 權限不足：只有 ADMIN (林經理) 能夠進入系統設定！');
      return;
    }
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-outfit">
      
      {/* 行動裝置頂部導覽 */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-sky-400" />
          <span className="font-bold text-lg tracking-wide bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">B2B CRM</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1 hover:bg-slate-800 rounded"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* 側邊欄 - 電腦版 & 行動裝置選單 */}
      <aside className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 
        fixed md:static inset-y-0 left-0 z-40 
        w-64 bg-slate-900 text-slate-100 flex flex-col justify-between 
        transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
      `}>
        <div>
          {/* Logo */}
          <div className="p-6 hidden md:flex items-center gap-3 border-b border-slate-800">
            <div className="bg-sky-500/15 p-2 rounded-lg border border-sky-500/30">
              <Building2 className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">Antigravity</h1>
              <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase">B2B CRM System</p>
            </div>
          </div>

          {/* 導覽選單 */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isLocked = item.requiresAdmin && currentUser?.role !== 'ADMIN';
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id, item.requiresAdmin)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                    ${isActive 
                      ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/15' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'}
                    ${isLocked ? 'cursor-not-allowed opacity-60' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {isLocked && <Lock className="w-4 h-4 text-slate-600 group-hover:text-rose-400" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 底部使用者資訊與角色說明 */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <UserIcon className="w-5 h-5 text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{currentUser?.name}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-500" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">權限:</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${getRoleBadgeColor(currentUser?.role)}`}>
              {currentUser?.role}
            </span>
          </div>
        </div>
      </aside>

      {/* 主內容區 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 頂部導覽列 (電腦版) */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm z-20">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white hidden md:block">
              {menuItems.find(i => i.id === activeTab)?.name || 'B2B CRM'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* 深淺色主題切換 */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-705 border border-slate-200 dark:border-slate-700 rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-350 shadow-sm"
              title={isDark ? "切換至淺色模式" : "切換至深色模式"}
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </button>

            {/* 角色模擬器 (Role Switcher) */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2.5 px-4 py-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition-all duration-200 text-sm font-semibold shadow-sm"
              >
                <Shield className="w-4 h-4 text-indigo-500" />
                <span className="text-slate-600 dark:text-slate-300">模擬角色：</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getRoleBadgeColor(currentUser?.role)}`}>
                  {currentUser?.name} ({currentUser?.role})
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-40 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">切換登入身分 (測試 RBAC)</p>
                    </div>
                    {availableUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          switchUser(user.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all ${currentUser?.id === user.id ? 'bg-sky-50/40 dark:bg-sky-950/20' : ''}`}
                      >
                        <div>
                          <p className={`text-sm font-semibold ${currentUser?.id === user.id ? 'text-sky-600 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300'}`}>{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </button>
                    ))}
                    <div className="px-4 py-2 mt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 leading-normal">
                      💡 <strong>權限說明：</strong><br />
                      - <strong>ADMIN</strong>：可看全公司商機與報表，管理所有系統與銷售設定項目。<br />
                      - <strong>BU head</strong>：可看全公司商機與報表，不可進入系統設定，但可進入銷售設定。<br />
                      - <strong>AM</strong>：只能看並編輯自己負責的商機與任務，可進入銷售設定維護客戶與聯絡人。
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* 頁面內容區 */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
