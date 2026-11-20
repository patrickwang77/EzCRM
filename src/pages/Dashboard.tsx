import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/db';
import type { Company, Organization } from '../services/db';
import { 
  DollarSign, 
  Target, 
  Briefcase, 
  CheckCircle2, 
  TrendingUp, 
  ArrowUpRight,
  Building2,
  FolderTree
} from 'lucide-react';

interface KPIData {
  expectedRevenue: number;
  totalOpportunitiesCount: number;
  winRate: number;
  taskCompletionRate: number;
  funnelConversion: number;
}

interface FunnelData {
  stageName: string;
  originalAmount: number;
  weightedAmount: number;
  count: number;
}

interface SalesPerformance {
  userName: string;
  role: string;
  totalAmount: number;
  expectedAmount: number;
  oppCount: number;
}

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  
  // Slicers State
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Dropdown options
  const [companies, setCompanies] = useState<Company[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  // Analytics States
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [salesPerf, setSalesPerf] = useState<SalesPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [wonAmount, setWonAmount] = useState(0);
  const [lossAmount, setLossAmount] = useState(0);
  const [funnelViewMode, setFunnelViewMode] = useState<'weighted' | 'count'>('weighted');

  // Load Slicer Options
  useEffect(() => {
    const loadOptions = async () => {
      const compRes = await db.getCompanies();
      const orgRes = await db.getOrganizations();
      setCompanies(compRes);
      setOrganizations(orgRes);
    };
    loadOptions();
  }, []);

  // Load Dashboard Data based on Slicers
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        const filters = {
          orgId: selectedOrgId || undefined,
          companyId: selectedCompanyId || undefined
        };

        // Load KPIs with filters
        const kpiRes = await db.getAnalyticsKPI(currentUser.role, currentUser.id, filters);
        setKpis(kpiRes);

        // Load Funnel Data with filters (custom weighted & original calculation)
        const opps = await db.getOpportunities(currentUser.role, currentUser.id, filters);
        const stages = await db.getStages(true);
        const funnelRes = stages.map(stage => {
          const stageOpps = opps.filter(o => o.stageId === stage.id);
          const originalAmount = stageOpps.reduce((sum, o) => sum + o.amount, 0);
          const weightedAmount = stageOpps.reduce((sum, o) => sum + (o.amount * (o.winProbability / 100)), 0);
          return {
            stageName: stage.name,
            originalAmount,
            weightedAmount,
            count: stageOpps.length
          };
        });
        const wonAmt = opps.filter(o => o.stageId === 'stage-5').reduce((sum, o) => sum + o.amount, 0);
        const lossAmt = opps.filter(o => o.stageId === 'stage-6').reduce((sum, o) => sum + o.amount, 0);
        setWonAmount(wonAmt);
        setLossAmount(lossAmt);
        setFunnelData(funnelRes);

        // Load Sales Performance with filters (Only Admin/BU head)
        if (currentUser.role === 'ADMIN' || currentUser.role === 'BU_HEAD') {
          const allOpps = await db.getOpportunities('ADMIN', '', filters);
          const allUsers = await db.getUsers();
          
          const perf = allUsers
            .filter(u => u.role === 'AM')
            .map(u => {
              const userOpps = allOpps.filter(o => o.userId === u.id);
              const totalAmount = userOpps.reduce((sum, o) => sum + o.amount, 0);
              const expectedAmount = userOpps.reduce((sum, o) => sum + (o.amount * (o.winProbability / 100)), 0);
              return {
                userName: u.name,
                role: u.role,
                totalAmount,
                expectedAmount,
                oppCount: userOpps.length
              };
            })
            .sort((a, b) => b.expectedAmount - a.expectedAmount);
          setSalesPerf(perf);
        }
      } catch (err) {
        console.error('Error loading filtered dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [currentUser, selectedOrgId, selectedCompanyId]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Helper to format short currency (TWD Ten Thousand)
  const formatCompactCurrency = (value: number) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(0)} 萬`;
    }
    return `${value}`;
  };

  // Render Indented Org Options for Hierarchy
  const renderOrgOptions = (parentId: string | null, depth = 0) => {
    const list = organizations.filter(o => o.parentId === parentId);
    return list.map(org => (
      <React.Fragment key={org.id}>
        <option value={org.id}>
          {'\u00A0'.repeat(depth * 3)}{org.name}
        </option>
        {renderOrgOptions(org.id, depth + 1)}
      </React.Fragment>
    ));
  };  // --- SVG Funnel Chart Rendering ---
  const renderSVGFunnel = () => {
    if (funnelData.length === 0) return null;

    const maxOriginalAmount = Math.max(...funnelData.map(d => d.originalAmount), 1);
    const maxCount = Math.max(...funnelData.map(d => d.count), 1);
    const totalHeight = 300;
    const stageCount = funnelData.length;
    const rowHeight = totalHeight / stageCount;
    const barHeight = 42;
    const chartWidth = 500;
    const centerX = chartWidth / 2;

    const COLORS = [
      ['#0ea5e9', '#0284c7'], // sky-500 to sky-600
      ['#3b82f6', '#2563eb'], // blue-500 to blue-600
      ['#6366f1', '#4f46e5'], // indigo-500 to indigo-600
      ['#8b5cf6', '#7c3aed'], // violet-500 to violet-600
      ['#10b981', '#059669'], // emerald-500 to emerald-600
      ['#f43f5e', '#e11d48']  // rose-500 to rose-600
    ];

    const funnelBars = funnelData.map((d, i) => {
      // 原始預估金額對稱寬度
      const originalWidth = maxOriginalAmount > 0 
        ? (d.originalAmount / maxOriginalAmount) * (chartWidth * 0.85) 
        : 0;

      // 加權預估金額對稱寬度
      const weightedWidth = maxOriginalAmount > 0 
        ? (d.weightedAmount / maxOriginalAmount) * (chartWidth * 0.85) 
        : 0;

      // 個數對稱寬度
      const countWidth = maxCount > 0
        ? (d.count / maxCount) * (chartWidth * 0.85)
        : 0;

      const y = i * rowHeight + (rowHeight - barHeight) / 2;

      return {
        id: i,
        stageName: d.stageName,
        originalAmount: d.originalAmount,
        weightedAmount: d.weightedAmount,
        count: d.count,
        y,
        originalWidth,
        weightedWidth,
        countWidth,
        color: COLORS[i % COLORS.length]
      };
    });

    return (
      <div className="flex flex-col md:flex-row items-center gap-6 mt-6">
        
        {/* SVG Funnel graphic (Centered Mirrored Bar Chart) */}
        <div className="w-full md:w-1/2 flex justify-center">
          <svg width="100%" height={totalHeight} viewBox={`0 0 ${chartWidth} ${totalHeight}`} className="max-w-[400px] overflow-visible">
            <defs>
              {funnelBars.map((bar, idx) => (
                <linearGradient key={`grad-${idx}`} id={`grad-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={bar.color[0]} />
                  <stop offset="100%" stopColor={bar.color[1]} />
                </linearGradient>
              ))}
            </defs>
            <g className="filter drop-shadow-md">
              {funnelBars.map((bar, idx) => {
                const barWidth = funnelViewMode === 'weighted' ? bar.weightedWidth : bar.countWidth;
                return (
                  <g key={bar.id}>
                    {/* 外框：原始預估金額 (透明虛線外框) - 僅在 weighted 模式下顯示 */}
                    {funnelViewMode === 'weighted' && bar.originalWidth > 0 && (
                      <rect
                        x={centerX - bar.originalWidth / 2}
                        y={bar.y}
                        width={bar.originalWidth}
                        height={barHeight}
                        fill="none"
                        stroke={bar.color[0]}
                        strokeWidth="1.5"
                        strokeDasharray="4,3"
                        rx="5"
                        className="transition-all duration-300"
                      />
                    )}
                    
                    {/* 內填：實心漸層柱 */}
                    {barWidth > 0 && (
                      <rect
                        x={centerX - barWidth / 2}
                        y={bar.y}
                        width={barWidth}
                        height={barHeight}
                        fill={`url(#grad-${idx})`}
                        rx="5"
                        className="transition-all duration-300 hover:opacity-90 hover:scale-[1.01] cursor-pointer origin-center"
                        style={{ transformOrigin: `${centerX}px ${bar.y + barHeight/2}px` }}
                      >
                        <title>{funnelViewMode === 'weighted'
                          ? `${bar.stageName}: 加權額 ${formatCurrency(bar.weightedAmount)} / 原始額 ${formatCurrency(bar.originalAmount)} (${bar.count} 個商機)`
                          : `${bar.stageName}: ${bar.count} 個商機 (原始金額總額 ${formatCurrency(bar.originalAmount)})`
                        }</title>
                      </rect>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Funnel legend & details */}
        <div className="w-full md:w-1/2 space-y-3">
          {funnelBars.map((bar) => (
            <div 
              key={bar.id} 
              className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 hover:border-slate-250 dark:hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div 
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0" 
                  style={{ background: `linear-gradient(135deg, ${bar.color[0]}, ${bar.color[1]})` }}
                />
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 truncate">{bar.stageName}</span>
              </div>
              <div className="text-right flex-shrink-0 flex flex-col">
                {funnelViewMode === 'weighted' ? (
                  <>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                      加權: {formatCurrency(bar.weightedAmount)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      原始: {formatCurrency(bar.originalAmount)} ({bar.count}個)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                      {bar.count} 個商機
                    </span>
                    <span className="text-[10px] text-slate-450 dark:text-slate-400 font-bold">
                      原始總額: {formatCurrency(bar.originalAmount)}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    );
  };

  if (loading || !kpis) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 歡迎與 Slicer 整合橫幅 */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12">
          <TrendingUp className="w-96 h-96" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              業務數據洞察
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              歡迎回來，{currentUser?.name}
            </h1>
            <p className="text-slate-400 text-xs max-w-xl">
              以下數據將即時連動您設定的 Slicers 篩選器，可精準分析特定部門或客戶的商機現況。
            </p>
          </div>

          {/* Slicers 篩選器面板 */}
          <div className="w-full md:w-auto bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row gap-3">
            
            {/* 組織 Slicer (限 ADMIN/BU head) */}
            {currentUser?.role !== 'AM' && (
              <div className="flex-1 sm:flex-initial">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                  <span>組織部門</span>
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full sm:w-44 px-3 py-1.5 bg-slate-900 text-white border border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-sky-500 font-semibold"
                >
                  <option value="">(不限部門 - 全部)</option>
                  {renderOrgOptions(null)}
                </select>
              </div>
            )}

            {/* 客戶 Slicer (所有人可用) */}
            <div className="flex-1 sm:flex-initial">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                <span>客戶公司</span>
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full sm:w-44 px-3 py-1.5 bg-slate-900 text-white border border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-sky-500 font-semibold"
              >
                <option value="">(不限公司 - 全部)</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* 清除篩選 */}
            {(selectedOrgId || selectedCompanyId) && (
              <button
                onClick={() => { setSelectedOrgId(''); setSelectedCompanyId(''); }}
                className="self-end sm:self-center mt-3 sm:mt-0 px-3 py-1.5 text-xs text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 hover:border-transparent rounded-xl font-bold transition-all"
              >
                清除
              </button>
            )}

          </div>
        </div>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: 加權預估業績 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">加權預估業績</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              {formatCurrency(kpis.expectedRevenue)}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-bold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> +12.5%
              </span>
              加權預估(金額 × 贏率)
            </p>
          </div>
        </div>

        {/* KPI 2: BD Case Count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">BD Case Count</span>
            <div className="p-2 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-100 dark:border-sky-900/50 group-hover:scale-110 transition-transform">
              <Briefcase className="w-5 h-5 text-sky-500" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              {kpis.totalOpportunitiesCount} 個
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              篩選後所持商機數
            </p>
          </div>
        </div>

        {/* KPI 3: BD Won AMT & BD Loss AMT (上下分層) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[148px]">
          {/* 上半部：BD Won AMT */}
          <div className="pb-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">BD Won AMT</span>
              <h3 className="text-base font-black text-emerald-600 dark:text-emerald-450 mt-0.5">
                {formatCurrency(wonAmount)}
              </h3>
            </div>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-emerald-500">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          {/* 下半部：BD Loss AMT */}
          <div className="pt-2.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">BD Loss AMT</span>
              <h3 className="text-base font-black text-rose-600 dark:text-rose-455 mt-0.5">
                {formatCurrency(lossAmount)}
              </h3>
            </div>
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/20 rounded-lg text-rose-500">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* KPI 4: BD Won % & 任務完成率 (上下分層) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[148px]">
          {/* 上半部：BD Won % */}
          <div className="pb-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">BD Won %</span>
              <h3 className="text-base font-black text-amber-500 dark:text-amber-400 mt-0.5">
                {kpis.winRate.toFixed(1)}%
              </h3>
            </div>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-amber-500">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          {/* 下半部：任務完成率 */}
          <div className="pt-2.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">任務完成率</span>
              <h3 className="text-base font-black text-indigo-500 dark:text-indigo-400 mt-0.5">
                {kpis.taskCompletionRate.toFixed(1)}%
              </h3>
            </div>
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg text-indigo-500">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* 圖表與排行版區塊 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG 對稱梯形漏斗圖表 (佔 2/3) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">銷售漏斗分析 (Sales Funnel)</h2>
              <p className="text-xs text-slate-400 mt-1">
                {funnelViewMode === 'weighted' 
                  ? '各銷售階段累積的預估總金額（對稱梯形對比，即時連動 Slicer 篩選）'
                  : '各銷售階段所持商機數量（條形代表個數比例，即時連動 Slicer 篩選）'}
              </p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => setFunnelViewMode('weighted')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  funnelViewMode === 'weighted'
                    ? 'bg-white dark:bg-slate-950 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                加權業績金額
              </button>
              <button
                type="button"
                onClick={() => setFunnelViewMode('count')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  funnelViewMode === 'count'
                    ? 'bg-white dark:bg-slate-950 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                商機個數
              </button>
            </div>
          </div>
          
          {/* 自訂 SVG 漏斗圖渲染入口 */}
          {renderSVGFunnel()}
        </div>

        {/* 業績排行榜 / 個人里程碑 (佔 1/3) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          
          {currentUser?.role === 'ADMIN' || currentUser?.role === 'BU_HEAD' ? (
            // 系統管理員 / BU head 視角：顯示業務排行
            <div className="h-full flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">銷售團隊績效排行榜</h2>
                <p className="text-xs text-slate-400 mt-1">依據篩選結果，各業務之預估加權業績排行</p>
              </div>

              <div className="space-y-4 my-6 overflow-y-auto max-h-72 pr-1">
                {salesPerf.length > 0 ? (
                  salesPerf.map((perf, index) => (
                    <div 
                      key={perf.userName}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{perf.userName}</p>
                          <p className="text-[10px] text-slate-400">{perf.oppCount} 個管線商機</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatCurrency(perf.expectedAmount)}</p>
                        <p className="text-[10px] text-slate-400">總額: {formatCompactCurrency(perf.totalAmount)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">目前篩選條件下無業務業績</p>
                )}
              </div>

              <div className="text-[11px] text-slate-400 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 p-3 rounded-2xl leading-relaxed">
                📢 <strong>篩選器提示：</strong> 切換上方組織篩選（如銷售一部），排行榜會即時過濾出該組織下屬的業務績效。
              </div>
            </div>
          ) : (
            // 一般業務代表 (Sales) 視角：顯示業務統計說明
            <div className="h-full flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">業務個人里程碑</h2>
                <p className="text-xs text-slate-400 mt-1">您目前的個人表現與業績統計</p>
              </div>

              <div className="my-6 space-y-4">
                <div className="p-4 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold uppercase">漏斗轉換率</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-sky-600 dark:text-sky-400">{kpis.funnelConversion.toFixed(1)}%</span>
                    <span className="text-xs text-slate-400">成交佔個人總商機比率</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
                    <div className="bg-sky-500 h-full rounded-full" style={{ width: `${Math.min(kpis.funnelConversion, 100)}%` }} />
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl">
                  <span className="text-xs text-slate-400 font-semibold uppercase">任務完成績效</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{kpis.taskCompletionRate.toFixed(1)}%</span>
                    <span className="text-xs text-slate-400">您個人的任務達成比率</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(kpis.taskCompletionRate, 100)}%` }} />
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100/50 dark:border-sky-900/30 p-3 rounded-2xl leading-relaxed">
                💡 <strong>業務心法：</strong> 使用客戶 Slicer 可以單獨篩選某個核心客戶，助您針對單一公司進行業績突圍。
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
