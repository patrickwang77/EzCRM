import React, { createContext, useContext, useState, useEffect } from 'react';

export type LayoutVariant = 'A' | 'B' | 'C';
export type QuickCreateTab = 'opp' | 'act' | 'comp';

export interface VariantTheme {
  id: LayoutVariant;
  name: string;
  shortName: string;
  subtitle: string;
  primaryBtn: string;
  activeNav: string;
  activeNavIcon: string;
  accentText: string;
  accentSoftBg: string;
  accentBorder: string;
  badgeBg: string;
  progressBar: string;
}

export const VARIANT_THEMES: Record<LayoutVariant, VariantTheme> = {
  A: {
    id: 'A',
    name: '分支 A · 極致空間工作台',
    shortName: 'A 工作台',
    subtitle: '可折疊側欄 · 冷灰深藍系 · 全寬看板',
    primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20',
    activeNav: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60',
    activeNavIcon: 'text-blue-600 dark:text-blue-400',
    accentText: 'text-blue-600 dark:text-blue-400',
    accentSoftBg: 'bg-blue-50 dark:bg-blue-950/35',
    accentBorder: 'border-blue-200 dark:border-blue-800/60',
    badgeBg: 'bg-blue-600 text-white',
    progressBar: 'bg-gradient-to-r from-blue-500 to-indigo-500',
  },
  B: {
    id: 'B',
    name: '分支 B · 頂部全寬高管視角',
    shortName: 'B 全寬高管',
    subtitle: '零側邊欄 · 翡翠青藍系 · 44px 今日焦點條',
    primaryBtn: 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20',
    activeNav: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/60',
    activeNavIcon: 'text-teal-600 dark:text-teal-400',
    accentText: 'text-teal-600 dark:text-teal-400',
    accentSoftBg: 'bg-teal-50 dark:bg-teal-950/35',
    accentBorder: 'border-teal-200 dark:border-teal-800/60',
    badgeBg: 'bg-teal-600 text-white',
    progressBar: 'bg-gradient-to-r from-teal-500 to-cyan-500',
  },
  C: {
    id: 'C',
    name: '分支 C · AI 副駕雙欄視界',
    shortName: 'C AI副駕',
    subtitle: '極窄 Icon 軌 · 皇家紫靛系 · 常駐右側 AI 情境欄',
    primaryBtn: 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-600/20',
    activeNav: 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/70 dark:border-violet-800/60',
    activeNavIcon: 'text-violet-600 dark:text-violet-400',
    accentText: 'text-violet-600 dark:text-violet-400',
    accentSoftBg: 'bg-violet-50 dark:bg-violet-950/35',
    accentBorder: 'border-violet-200 dark:border-violet-800/60',
    badgeBg: 'bg-violet-600 text-white',
    progressBar: 'bg-gradient-to-r from-violet-500 to-indigo-500',
  },
};

interface LayoutContextValue {
  variant: LayoutVariant;
  setVariant: (v: LayoutVariant) => void;
  theme: VariantTheme;
  isQuickCreateOpen: boolean;
  quickCreateTab: QuickCreateTab;
  openQuickCreate: (tab?: QuickCreateTab) => void;
  closeQuickCreate: () => void;
  dataVersion: number;
  bumpDataVersion: () => void;
  copilotOppId: string | null;
  setCopilotOppId: (id: string | null) => void;
  isCopilotOpen: boolean;
  setIsCopilotOpen: (open: boolean) => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [variant, setVariantState] = useState<LayoutVariant>(() => {
    const saved = localStorage.getItem('crm_layout_variant');
    if (saved === 'A' || saved === 'B' || saved === 'C') return saved;
    return 'A';
  });

  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateTab, setQuickCreateTab] = useState<QuickCreateTab>('opp');
  const [dataVersion, setDataVersion] = useState(0);
  const [copilotOppId, setCopilotOppId] = useState<string | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(true);

  const setVariant = (v: LayoutVariant) => {
    setVariantState(v);
    localStorage.setItem('crm_layout_variant', v);
  };

  const openQuickCreate = (tab: QuickCreateTab = 'opp') => {
    setQuickCreateTab(tab);
    setIsQuickCreateOpen(true);
  };

  const closeQuickCreate = () => setIsQuickCreateOpen(false);
  const bumpDataVersion = () => setDataVersion(v => v + 1);

  // Global keyboard shortcut Ctrl/Cmd + K to open Quick Create
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickCreateOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <LayoutContext.Provider
      value={{
        variant,
        setVariant,
        theme: VARIANT_THEMES[variant],
        isQuickCreateOpen,
        quickCreateTab,
        openQuickCreate,
        closeQuickCreate,
        dataVersion,
        bumpDataVersion,
        copilotOppId,
        setCopilotOppId,
        isCopilotOpen,
        setIsCopilotOpen,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used inside LayoutProvider');
  return ctx;
};
