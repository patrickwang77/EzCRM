import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLayout, VARIANT_THEMES } from '../context/LayoutContext';
import type { LayoutVariant } from '../context/LayoutContext';
import { CopilotPanel } from './CopilotPanel';
import {
  LayoutDashboard,
  KanbanSquare,
  CheckSquare,
  Settings,
  Shield,
  ChevronDown,
  Building2,
  Lock,
  Menu,
  X,
  Sun,
  Moon,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  PanelRightClose,
  BriefcaseBusiness,
  Sliders,
  Sparkles,
  BarChart3,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, activeTab, setActiveTab }) => {
  const { currentUser, availableUsers, switchUser } = useAuth();
  const {
    variant,
    setVariant,
    theme,
    openQuickCreate,
    isCopilotOpen,
    setIsCopilotOpen,
  } = useLayout();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('crm_sidebar_collapsed') === 'true';
  });

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

  const toggleSidebar = () => {
    const next = !isSidebarCollapsed;
    setIsSidebarCollapsed(next);
    localStorage.setItem('crm_sidebar_collapsed', String(next));
  };

  const menuItems = [
    { id: 'dashboard', name: '分析儀表板', icon: LayoutDashboard, requiresAdmin: false },
    { id: 'pipeline', name: 'BD Pipeline', icon: KanbanSquare, requiresAdmin: false },
    { id: 'accounts', name: '客戶總覽 360°', icon: BriefcaseBusiness, requiresAdmin: false },
    { id: 'metrics', name: '管理指標檢核', icon: BarChart3, requiresAdmin: false, isNew: true },
    { id: 'activities', name: '任務活動歷程', icon: CheckSquare, requiresAdmin: false },
    { id: 'salesSettings', name: '銷售設定', icon: Sliders, requiresAdmin: false },
    { id: 'systemSettings', name: '系統設定', icon: Settings, requiresAdmin: true },
  ];

  // 非 ADMIN 直接隱藏系統設定選單 (修復 B-2)
  const visibleMenuItems = menuItems.filter(item => !item.requiresAdmin || currentUser?.role === 'ADMIN');

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      case 'BU_HEAD':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'AM':
      default:
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20';
    }
  };

  const handleTabClick = (tabId: string, requiresAdmin: boolean) => {
    if (requiresAdmin && currentUser?.role !== 'ADMIN') {
      const adminNames = availableUsers.filter(u => u.role === 'ADMIN').map(u => u.name).join('、') || '系統管理員';
      alert(`⚠️ 權限不足：只有系統管理員（${adminNames}）能夠進入系統設定！`);
      return;
    }
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  const handleCopilotGoToPipeline = (companyId: string) => {
    sessionStorage.setItem('autofocus_company_id', companyId);
    setActiveTab('pipeline');
  };

  // Shared Variant Switcher Control (A / B / C live switcher!)
  const renderVariantSwitcher = () => (
    <div
      className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
      title="即時切換 A / B / C 三種佈局分支進行比對（共用相同 LocalStorage 資料）"
    >
      {(['A', 'B', 'C'] as LayoutVariant[]).map(v => {
        const active = variant === v;
        return (
          <button
            key={v}
            onClick={() => setVariant(v)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all whitespace-nowrap ${
              active
                ? `${VARIANT_THEMES[v].badgeBg} shadow-sm`
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {VARIANT_THEMES[v].shortName}
          </button>
        );
      })}
    </div>
  );

  // Shared Role Switcher + Theme + Quick Create controls
  const renderRightUtilities = () => (
    <div className="flex items-center gap-2">
      {renderVariantSwitcher()}

      {/* Global Quick Create */}
      <button
        onClick={() => openQuickCreate('opp')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${theme.primaryBtn}`}
        title="快速建立商機、活動或客戶 (Ctrl/⌘+K)"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">快速建立</span>
      </button>

      {/* Variant C Copilot Toggle */}
      {variant === 'C' && (
        <button
          onClick={() => setIsCopilotOpen(!isCopilotOpen)}
          className={`hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
            isCopilotOpen
              ? `${theme.accentSoftBg} ${theme.accentText} ${theme.accentBorder}`
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
          title={isCopilotOpen ? '收合右側 AI 副駕面板' : '展開右側 AI 副駕面板'}
        >
          {isCopilotOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          <span className="hidden 2xl:inline">AI 副駕</span>
        </button>
      )}

      {/* Dark/Light Mode */}
      <button
        onClick={() => setIsDark(!isDark)}
        className="p-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all text-slate-600 dark:text-slate-300"
        title={isDark ? '切換至淺色模式' : '切換至深色模式'}
      >
        {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
      </button>

      {/* Role Switcher */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all text-xs font-semibold"
        >
          <Shield className={`w-3.5 h-3.5 ${theme.accentText}`} />
          <span className="hidden lg:inline text-slate-600 dark:text-slate-300">
            {currentUser?.name?.split(' ')[0]}
          </span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${getRoleBadgeColor(currentUser?.role)}`}>
            {currentUser?.role}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {isDropdownOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-40">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">切換登入身分 (測試 RBAC)</p>
              </div>
              {availableUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => {
                    switchUser(user.id);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all ${
                    currentUser?.id === user.id ? theme.accentSoftBg : ''
                  }`}
                >
                  <div>
                    <p className={`text-xs font-semibold ${currentUser?.id === user.id ? theme.accentText : 'text-slate-700 dark:text-slate-300'}`}>
                      {user.name}
                    </p>
                    <p className="text-[11px] text-slate-400">{user.email}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </button>
              ))}
              <div className="px-4 py-2 mt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 leading-normal">
                💡 <strong>權限說明：</strong><br />
                - <strong>ADMIN</strong>：全公司視角 + 系統/銷售設定。<br />
                - <strong>BU_HEAD</strong>：所屬組織與子部門視角 + 銷售設定。<br />
                - <strong>AM</strong>：僅個人負責商機與活動 + 客戶維護。
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // =========================================================================
  // VARIANT B: Executive Flow (Zero Sidebar, Dual-Layer Full-Width Top Nav)
  // =========================================================================
  if (variant === 'B') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-outfit">
        <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
            {/* Brand + Horizontal Nav */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`p-1.5 rounded-lg ${theme.badgeBg}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-white hidden sm:inline">
                  EZB2B CRM
                </span>
              </div>

              <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
                {visibleMenuItems.map(item => {
                  const Icon = item.icon;
                  const isLocked = item.requiresAdmin && currentUser?.role !== 'ADMIN';
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id, item.requiresAdmin)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        isActive
                          ? theme.activeNav
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                      } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? theme.activeNavIcon : ''}`} />
                      <span>{item.name}</span>
                      {item.isNew && (
                        <span className={`text-[9px] px-1 py-0.2 rounded font-extrabold ${theme.badgeBg}`}>新</span>
                      )}
                      {isLocked && <Lock className="w-3 h-3 text-slate-400" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              {renderRightUtilities()}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown nav for Variant B */}
          {isMobileMenuOpen && (
            <div className="md:hidden px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
              {visibleMenuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id, item.requiresAdmin)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold ${
                      isActive ? theme.activeNav : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {/* Full-bleed viewport width main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="w-full space-y-5">{children}</div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // VARIANT A (Collapsible Sidebar) & VARIANT C (Slim Icon Rail + Right Copilot)
  // =========================================================================
  const effectiveCollapsed = variant === 'C' ? true : isSidebarCollapsed;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-outfit">
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${theme.badgeBg}`}>
            <Building2 className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm text-slate-800 dark:text-white">EZB2B CRM</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Left Sidebar (Unified Light/Dark Theme!) */}
      <aside
        className={`
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 fixed md:sticky top-0 inset-y-0 left-0 z-40 h-screen
          ${effectiveCollapsed ? 'w-16' : 'w-56'}
          bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
          flex flex-col justify-between transition-all duration-200 flex-shrink-0 shadow-xl md:shadow-none
        `}
      >
        <div>
          {/* Brand + Collapse Toggle */}
          <div className={`h-14 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center ${effectiveCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!effectiveCollapsed ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${theme.badgeBg}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-white truncate">EZB2B CRM</h1>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Sales Pipeline</p>
                </div>
              </div>
            ) : (
              <div className={`p-1.5 rounded-lg ${theme.badgeBg}`} title="EZB2B CRM">
                {variant === 'C' ? <Sparkles className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
              </div>
            )}

            {variant === 'A' && !effectiveCollapsed && (
              <button
                onClick={toggleSidebar}
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                title="折疊側邊功能表"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Expand button when collapsed in Variant A */}
          {variant === 'A' && effectiveCollapsed && (
            <div className="hidden md:flex justify-center pt-2">
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                title="展開側邊功能表"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="p-2.5 space-y-1">
            {visibleMenuItems.map(item => {
              const Icon = item.icon;
              const isLocked = item.requiresAdmin && currentUser?.role !== 'ADMIN';
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id, item.requiresAdmin)}
                  title={item.name}
                  className={`
                    w-full flex items-center ${effectiveCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-xl text-xs font-bold transition-all
                    ${isActive
                      ? theme.activeNav
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'}
                    ${isLocked ? 'cursor-not-allowed opacity-55' : ''}
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? theme.activeNavIcon : ''}`} />
                    {!effectiveCollapsed && <span className="truncate">{item.name}</span>}
                  </div>
                  {!effectiveCollapsed && item.isNew && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${theme.badgeBg}`}>新</span>
                  )}
                  {!effectiveCollapsed && isLocked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Chip */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
          {effectiveCollapsed ? (
            <div
              className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center font-extrabold text-xs ${theme.badgeBg}`}
              title={`${currentUser?.name} (${currentUser?.role})`}
            >
              {currentUser?.name?.[0] || 'U'}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0 ${theme.badgeBg}`}>
                {currentUser?.name?.[0] || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{currentUser?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser?.role}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Center + Optional Right Copilot Pane */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Compact Global Utility Header */}
        <header className="h-14 flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 flex items-center justify-between gap-3 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="text-base font-extrabold text-slate-800 dark:text-white truncate">
              {menuItems.find(i => i.id === activeTab)?.name || 'B2B CRM'}
            </h2>
            <span className="hidden xl:inline-block text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
              {theme.subtitle}
            </span>
          </div>

          {renderRightUtilities()}
        </header>

        {/* Workspace Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50 dark:bg-slate-950">
            <div className="w-full space-y-5">{children}</div>
          </main>

          {/* Variant C Docked Right Copilot Panel */}
          {variant === 'C' && isCopilotOpen && (
            <CopilotPanel onGoToPipeline={handleCopilotGoToPipeline} />
          )}
        </div>
      </div>
    </div>
  );
};
