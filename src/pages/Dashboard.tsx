import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import {
  db,
  getEligibleSalesReps,
  getVisibleOrgsForUser,
  isActivityInMonthRange,
} from '../services/db';
import type { Company, Organization, User, StageOutcome } from '../services/db';
import { exportToCsv } from '../utils/exportCsv';
import { inferPreviewTags } from '../utils/aiTagPreview';
import { getStageColor } from '../utils/stageColors';
import {
  Building2,
  FolderTree,
  Download,
  Sparkles,
  X,
  User as UserIcon,
  CalendarRange,
} from 'lucide-react';
import {
  KpiFunnelIcon,
  KpiBriefcaseIcon,
  KpiWonIcon,
  KpiLostIcon,
  KpiTargetIcon,
} from '../components/KpiIcons';

interface KPIData {
  totalPotentialAmount: number;
  expectedRevenue: number;
  bdProgressRate: number;
  openCount: number;
  wonCount: number;
  lostCount: number;
  totalOpportunitiesCount: number;
  wonAmount: number;
  lostAmount: number;
  wonRate: number;
  lostRate: number;
  closedWinRate: number;
  activityCompletionRate: number;
  completedActivitiesCount: number;
  totalActivitiesCount: number;
  taskCompletionRate: number;
  funnelConversion: number;
}

interface FunnelData {
  stageName: string;
  outcome: StageOutcome;
  originalAmount: number;
  weightedAmount: number;
  count: number;
}

interface SalesPerformance {
  userId: string;
  userName: string;
  role: string;
  totalAmount: number;
  expectedAmount: number;
  progressRate: number;
  openCount: number;
  wonCount: number;
}

interface DashboardProps {
  setActiveTab?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { currentUser } = useAuth();
  const { variant, theme, dataVersion, isCopilotOpen } = useLayout();

  // Slicers State
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');

  // Dropdown options
  const [companies, setCompanies] = useState<Company[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Analytics States
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [salesPerf, setSalesPerf] = useState<SalesPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [highProbCount, setHighProbCount] = useState(0);
  const [riskSignals, setRiskSignals] = useState<string[]>([]);
  const [funnelViewMode, setFunnelViewMode] = useState<'weighted' | 'count'>('weighted');
  const [showFocusStrip, setShowFocusStrip] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      const [compRes, orgRes, usrRes] = await Promise.all([
        db.getCompanies(),
        db.getOrganizations(),
        db.getUsers(),
      ]);
      setCompanies(compRes);
      setOrganizations(orgRes);
      setUsers(usrRes);
    };
    loadOptions();
  }, [dataVersion]);

  const visibleOrgs = useMemo(() => {
    if (!currentUser) return [];
    return getVisibleOrgsForUser(organizations, users, currentUser.role, currentUser.id);
  }, [organizations, users, currentUser]);

  const eligibleReps = useMemo(() => {
    if (!currentUser) return [];
    return getEligibleSalesReps(
      organizations,
      users,
      currentUser.role,
      currentUser.id,
      selectedOrgId || undefined
    );
  }, [organizations, users, currentUser, selectedOrgId]);

  // 若切換部門導致已選業務不在該部門下階，自動清空
  useEffect(() => {
    if (selectedUserId && !eligibleReps.some(u => u.id === selectedUserId)) {
      setSelectedUserId('');
    }
  }, [eligibleReps, selectedUserId]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        const filters = {
          orgId: selectedOrgId || undefined,
          userId: selectedUserId || undefined,
          companyId: selectedCompanyId || undefined,
          startMonth: startMonth || undefined,
          endMonth: endMonth || undefined,
        };

        const [kpiRes, opps, stages, allActs, allUsers] = await Promise.all([
          db.getAnalyticsKPI(currentUser.role, currentUser.id, filters),
          db.getOpportunities(currentUser.role, currentUser.id, filters),
          db.getStages(true),
          db.getActivities(),
          db.getUsers(),
        ]);

        setKpis(kpiRes);

        const sortedStages = [...stages].sort((a, b) => a.displayOrder - b.displayOrder);
        const stageMap = new Map(sortedStages.map(s => [s.id, s]));

        const funnelRes: FunnelData[] = sortedStages.map(stage => {
          const stageOpps = opps.filter(o => o.stageId === stage.id);
          const originalAmount = stageOpps.reduce((sum, o) => sum + o.amount, 0);
          const weightedAmount = stageOpps.reduce(
            (sum, o) => sum + o.amount * (o.winProbability / 100),
            0
          );
          return {
            stageName: stage.name,
            outcome: stage.outcome,
            originalAmount,
            weightedAmount,
            count: stageOpps.length,
          };
        });
        setFunnelData(funnelRes);

        // Live focus & AI preview signals
        const oppIds = new Set(opps.map(o => o.id));
        const relevantActs = allActs.filter(
          a => oppIds.has(a.opportunityId) && isActivityInMonthRange(a, filters.startMonth, filters.endMonth)
        );
        setPendingTasksCount(relevantActs.filter(a => !a.isCompleted).length);
        setHighProbCount(
          opps.filter(o => stageMap.get(o.stageId)?.outcome === 'OPEN' && o.winProbability >= 50).length
        );

        const detected: string[] = [];
        for (const opp of opps) {
          if (stageMap.get(opp.stageId)?.outcome === 'LOST') continue;
          const oActs = relevantActs.filter(a => a.opportunityId === opp.id).map(a => a.description);
          const tags = inferPreviewTags([opp.title, ...oActs], opp.tags);
          const riskTag = tags.find(t => t.tone === 'risk' || t.tone === 'warn');
          if (riskTag) {
            detected.push(`${opp.title} (#${riskTag.label})`);
          }
          if (detected.length >= 2) break;
        }
        setRiskSignals(detected);

        if (currentUser.role === 'ADMIN' || currentUser.role === 'BU_HEAD') {
          const perfUsers = allUsers.filter(u =>
            eligibleReps.length > 0 ? eligibleReps.some(e => e.id === u.id) : u.role === 'AM'
          );
          const perf: SalesPerformance[] = perfUsers
            .map(u => {
              const userOpps = opps.filter(
                o => o.userId === u.id && stageMap.get(o.stageId)?.outcome !== 'LOST'
              );
              const totalAmount = userOpps.reduce((sum, o) => sum + o.amount, 0);
              const expectedAmount = userOpps.reduce(
                (sum, o) => sum + o.amount * (o.winProbability / 100),
                0
              );
              const openCount = userOpps.filter(o => stageMap.get(o.stageId)?.outcome === 'OPEN').length;
              const wonCount = userOpps.filter(o => stageMap.get(o.stageId)?.outcome === 'WON').length;
              return {
                userId: u.id,
                userName: u.name,
                role: u.role,
                totalAmount,
                expectedAmount,
                progressRate: totalAmount > 0 ? (expectedAmount / totalAmount) * 100 : 0,
                openCount,
                wonCount,
              };
            })
            .filter(p => p.openCount + p.wonCount > 0)
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
  }, [currentUser, selectedOrgId, selectedUserId, selectedCompanyId, startMonth, endMonth, dataVersion, eligibleReps]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      maximumFractionDigits: 0,
    }).format(value);

  const formatCompactCurrency = (value: number) =>
    value >= 10000 ? `${(value / 10000).toFixed(0)} 萬` : `${value}`;

  const renderOrgOptions = (parentId: string | null, depth = 0, visited = new Set<string>()) => {
    const visibleIds = new Set(visibleOrgs.map(o => o.id));
    const list = visibleOrgs.filter(o => {
      if (visited.has(o.id)) return false;
      if (parentId === null) {
        return o.parentId === null || !visibleIds.has(o.parentId);
      }
      return o.parentId === parentId;
    });
    return list.map(org => {
      const nextVisited = new Set(visited);
      nextVisited.add(org.id);
      return (
        <React.Fragment key={org.id}>
          <option value={org.id} className="bg-white dark:bg-slate-950">
            {'\u00A0'.repeat(depth * 3)}
            {org.name}
          </option>
          {renderOrgOptions(org.id, depth + 1, nextVisited)}
        </React.Fragment>
      );
    });
  };

  const applyMonthPreset = (preset: 'all' | 'thisMonth' | 'thisQuarter') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    if (preset === 'all') {
      setStartMonth('');
      setEndMonth('');
    } else if (preset === 'thisMonth') {
      const ym = `${y}-${String(m).padStart(2, '0')}`;
      setStartMonth(ym);
      setEndMonth(ym);
    } else {
      const qStartM = Math.floor((m - 1) / 3) * 3 + 1;
      const qEndM = qStartM + 2;
      setStartMonth(`${y}-${String(qStartM).padStart(2, '0')}`);
      setEndMonth(`${y}-${String(qEndM).padStart(2, '0')}`);
    }
  };

  const handleExportReport = () => {
    const headers = ['銷售階段', '階段類型', '商機個數', '原始預估金額(NTD)', '加權預估金額(NTD)'];
    const rows = funnelData.map(d => [
      d.stageName,
      d.outcome,
      d.count,
      d.originalAmount,
      Math.round(d.weightedAmount),
    ]);
    exportToCsv(`EZB2B_銷售漏斗分析_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const renderSVGFunnel = () => {
    if (funnelData.length === 0) return null;

    const maxOriginalAmount = Math.max(...funnelData.map(d => d.originalAmount), 1);
    const maxCount = Math.max(...funnelData.map(d => d.count), 1);
    const totalHeight = 300;
    const stageCount = funnelData.length;
    const rowHeight = totalHeight / stageCount;
    const barHeight = 40;
    const chartWidth = 500;
    const centerX = chartWidth / 2;

    const funnelBars = funnelData.map((d, i) => {
      const originalWidth =
        maxOriginalAmount > 0 ? (d.originalAmount / maxOriginalAmount) * (chartWidth * 0.85) : 0;
      const weightedWidth =
        maxOriginalAmount > 0 ? (d.weightedAmount / maxOriginalAmount) * (chartWidth * 0.85) : 0;
      const countWidth = maxCount > 0 ? (d.count / maxCount) * (chartWidth * 0.85) : 0;
      const y = i * rowHeight + (rowHeight - barHeight) / 2;
      const token = getStageColor(i, stageCount, variant, d.outcome);

      return {
        id: i,
        stageName: d.stageName,
        outcome: d.outcome,
        originalAmount: d.originalAmount,
        weightedAmount: d.weightedAmount,
        count: d.count,
        y,
        originalWidth,
        weightedWidth,
        countWidth,
        color: token.hex,
      };
    });

    return (
      <div className="flex flex-col md:flex-row items-center gap-6 mt-5">
        <div className="w-full md:w-1/2 flex justify-center">
          <svg
            width="100%"
            height={totalHeight}
            viewBox={`0 0 ${chartWidth} ${totalHeight}`}
            className="max-w-[400px] overflow-visible"
          >
            <defs>
              {funnelBars.map((bar, idx) => (
                <linearGradient
                  key={`grad-${variant}-${idx}`}
                  id={`grad-${variant}-${idx}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={bar.color[0]} />
                  <stop offset="100%" stopColor={bar.color[1]} />
                </linearGradient>
              ))}
            </defs>
            <g className="filter drop-shadow-sm">
              {funnelBars.map((bar, idx) => {
                const barWidth = funnelViewMode === 'weighted' ? bar.weightedWidth : bar.countWidth;
                return (
                  <g key={bar.id}>
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
                        rx="6"
                        className="transition-all duration-300"
                      />
                    )}
                    {barWidth > 0 && (
                      <rect
                        x={centerX - barWidth / 2}
                        y={bar.y}
                        width={barWidth}
                        height={barHeight}
                        fill={`url(#grad-${variant}-${idx})`}
                        rx="6"
                        className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                      >
                        <title>
                          {funnelViewMode === 'weighted'
                            ? bar.outcome === 'LOST'
                              ? `${bar.stageName}: 流失金額 ${formatCurrency(bar.weightedAmount)} (${bar.count} 個商機，不計入潛在業績與 BD Progress %)`
                              : `${bar.stageName}: 加權額 ${formatCurrency(bar.weightedAmount)} / 原始額 ${formatCurrency(bar.originalAmount)} (${bar.count} 個商機)`
                            : `${bar.stageName}: ${bar.count} 個商機 (原始金額總額 ${formatCurrency(bar.originalAmount)})`}
                        </title>
                      </rect>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <div className="w-full md:w-1/2 space-y-2.5">
          {funnelBars.map(bar => (
            <div
              key={bar.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${bar.color[0]}, ${bar.color[1]})` }}
                />
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 truncate">
                  {bar.stageName}
                </span>
              </div>
              <div className="text-right flex-shrink-0 flex flex-col">
                {funnelViewMode === 'weighted' ? (
                  <>
                    <span className={`text-xs font-black ${bar.outcome === 'LOST' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {bar.outcome === 'LOST' ? '流失' : '加權'}: {formatCurrency(bar.weightedAmount)}
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
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
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
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  const hasAnyFilter = Boolean(selectedOrgId || selectedUserId || selectedCompanyId || startMonth || endMonth);

  return (
    <div className="space-y-5">
      {/* Variant A & B: 44px Dismissible Daily Focus Strip (需求 #8：將 B 的每日焦點加入 A!) */}
      {(variant === 'A' || variant === 'B') && showFocusStrip && (
        <div className={`rounded-xl px-4 py-2.5 border flex flex-wrap items-center justify-between gap-2 text-xs ${theme.accentSoftBg} ${theme.accentBorder}`}>
          <div className="flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-200">
            <span className={`font-extrabold inline-flex items-center gap-1 ${theme.accentText}`}>
              <Sparkles className="w-3.5 h-3.5" /> 今日焦點
            </span>
            <span>
              {currentUser?.name?.split(' ')[0]}，目前有 <strong>{pendingTasksCount} 項待辦活動</strong> 與{' '}
              <strong>{highProbCount} 筆高贏率商機 (≥50%)</strong> 持續推進中。
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab?.('activities')}
              className={`px-2.5 py-1 rounded-lg font-bold ${theme.primaryBtn}`}
            >
              檢視待辦
            </button>
            <button
              onClick={() => setShowFocusStrip(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="關閉焦點條"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Variant C: Live AI Activity Signal Strip */}
      {variant === 'C' && (
        <div className={`rounded-xl px-4 py-2.5 border flex flex-wrap items-center justify-between gap-2 text-xs ${theme.accentSoftBg} ${theme.accentBorder}`}>
          <div className="flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-200">
            <span className={`font-extrabold inline-flex items-center gap-1 ${theme.accentText}`}>
              <Sparkles className="w-3.5 h-3.5" /> AI 商機脈絡掃描 (預覽)
            </span>
            <span>
              {riskSignals.length > 0
                ? `偵測到需關注訊號：${riskSignals.join('、')}`
                : '目前所有活躍商機活動訊號平穩，點擊右側「AI 副駕」可查看各案詳情。'}
            </span>
          </div>
          <button
            onClick={() => setActiveTab?.('accounts')}
            className={`px-2.5 py-1 rounded-lg font-bold ${theme.primaryBtn}`}
          >
            前往客戶 360° 分析 →
          </button>
        </div>
      )}

      {/* Compact Utility Slicer Bar: Month Range + Org + Conditional Sales Rep + Company + Export */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Range Picker (#2) */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs">
            <CalendarRange className={`w-3.5 h-3.5 flex-shrink-0 ${theme.accentText}`} />
            <input
              type="month"
              value={startMonth}
              onChange={e => setStartMonth(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold outline-none w-[112px]"
              title="開始月份（含區間新建、區間結案與尚未結案舊案）"
            />
            <span className="text-slate-400">~</span>
            <input
              type="month"
              value={endMonth}
              onChange={e => setEndMonth(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold outline-none w-[112px]"
              title="結束月份"
            />
            <div className="hidden sm:flex items-center gap-1 ml-1 pl-1.5 border-l border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => applyMonthPreset('thisMonth')}
                className="px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400"
              >
                本月
              </button>
              <button
                type="button"
                onClick={() => applyMonthPreset('thisQuarter')}
                className="px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400"
              >
                本季
              </button>
              {(startMonth || endMonth) && (
                <button
                  type="button"
                  onClick={() => applyMonthPreset('all')}
                  className="px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-[10px] font-bold text-rose-500"
                >
                  全部
                </button>
              )}
            </div>
          </div>

          {/* Org Slicer */}
          {currentUser?.role !== 'AM' && (
            <div className="flex items-center gap-1.5">
              <FolderTree className={`w-4 h-4 ${theme.accentText}`} />
              <select
                value={selectedOrgId}
                onChange={e => setSelectedOrgId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                <option value="" className="bg-white dark:bg-slate-950">全部組織部門</option>
                {renderOrgOptions(null)}
              </select>
            </div>
          )}

          {/* Conditional Sales Rep Slicer (#6: 僅在組織下階有人員時生效) */}
          {currentUser?.role !== 'AM' && eligibleReps.length > 0 && (
            <div className="flex items-center gap-1.5">
              <UserIcon className={`w-4 h-4 ${theme.accentText}`} />
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                <option value="" className="bg-white dark:bg-slate-950">全部 Sales Rep ({eligibleReps.length})</option>
                {eligibleReps.map(rep => (
                  <option key={rep.id} value={rep.id} className="bg-white dark:bg-slate-950">
                    {rep.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Company Slicer */}
          <div className="flex items-center gap-1.5">
            <Building2 className={`w-4 h-4 ${theme.accentText}`} />
            <select
              value={selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
            >
              <option value="" className="bg-white dark:bg-slate-950">全部客戶公司</option>
              {companies.map(c => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-950">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {hasAnyFilter && (
            <button
              onClick={() => {
                setSelectedOrgId('');
                setSelectedUserId('');
                setSelectedCompanyId('');
                setStartMonth('');
                setEndMonth('');
              }}
              className="px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl"
            >
              清除篩選
            </button>
          )}
        </div>

        <button
          onClick={handleExportReport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
        >
          <Download className="w-3.5 h-3.5" />
          <span>匯出漏斗報表 (CSV)</span>
        </button>
      </div>

      {/* 5 Executive KPI Cards (解耦活動完成率與 BD Lost，保留既有文字與 A/B/C 主題配色) */}
      {(() => {
        const refAmountBase = kpis.totalPotentialAmount > 0
          ? kpis.totalPotentialAmount
          : kpis.wonAmount + kpis.lostAmount;
        const wonAmountShare = refAmountBase > 0 ? (kpis.wonAmount / refAmountBase) * 100 : 0;
        const lostAmountShare = refAmountBase > 0 ? (kpis.lostAmount / refAmountBase) * 100 : 0;

        const openBarBg =
          variant === 'B' ? 'bg-teal-500' : variant === 'C' ? 'bg-violet-500' : 'bg-blue-500';
        const openDotBg =
          variant === 'B' ? 'bg-teal-500' : variant === 'C' ? 'bg-violet-500' : 'bg-blue-500';

        const activityStatus =
          kpis.totalActivitiesCount === 0
            ? { label: '尚無任務', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700' }
            : kpis.activityCompletionRate >= 80
            ? { label: '優良', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' }
            : kpis.activityCompletionRate >= 60
            ? { label: '良好', cls: `${theme.accentSoftBg} ${theme.accentText} ${theme.accentBorder}` }
            : { label: '待加強', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' };

        const gridCols =
          variant === 'C' && isCopilotOpen
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';

        return (
          <div className={`grid ${gridCols} gap-3.5`}>
            {/* KPI 1: 全部潛在商機 + BD Progress % */}
            <div className="bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between min-h-[158px]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                    全部潛在商機
                  </span>
                  <h3
                    className="text-[19px] 2xl:text-[22px] font-black text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5 truncate"
                    title={formatCurrency(kpis.totalPotentialAmount)}
                  >
                    {formatCurrency(kpis.totalPotentialAmount)}
                  </h3>
                </div>
                <KpiFunnelIcon variant={variant} className="w-10 h-10 flex-shrink-0 -mt-0.5" />
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400">BD Progress %</span>
                  <span className={`font-black font-mono tabular-nums ${theme.accentText}`}>
                    {kpis.bdProgressRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${theme.progressBar}`}
                    style={{ width: `${Math.min(100, Math.max(0, kpis.bdProgressRate))}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 pt-0.5 truncate" title={`加權金額 ${formatCurrency(kpis.expectedRevenue)} ÷ 潛在總額 (不含 BD Lost)`}>
                  加權金額 {formatCompactCurrency(kpis.expectedRevenue)} ÷ 潛在總額 (不含流失)
                </p>
              </div>
            </div>

            {/* KPI 2: BD Case Count (進行中 / 已成交 / 已流失) */}
            <div className="bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between min-h-[158px]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                    BD Case Count
                  </span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <h3 className="text-[22px] 2xl:text-[24px] font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                      {kpis.totalOpportunitiesCount}
                    </h3>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">案</span>
                  </div>
                </div>
                <KpiBriefcaseIcon
                  variant={variant}
                  lostCount={kpis.lostCount}
                  className="w-10 h-10 flex-shrink-0 -mt-0.5"
                />
              </div>

              <div className="mt-3 space-y-2">
                {/* 3-Segment Horizontal Ratio Bar */}
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex gap-0.5">
                  {kpis.totalOpportunitiesCount > 0 ? (
                    <>
                      {kpis.openCount > 0 && (
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${openBarBg}`}
                          style={{ flexGrow: kpis.openCount }}
                          title={`進行中 ${kpis.openCount} 案`}
                        />
                      )}
                      {kpis.wonCount > 0 && (
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ flexGrow: kpis.wonCount }}
                          title={`已成交 ${kpis.wonCount} 案`}
                        />
                      )}
                      {kpis.lostCount > 0 && (
                        <div
                          className="h-full rounded-full bg-rose-500 transition-all duration-500"
                          style={{ flexGrow: kpis.lostCount }}
                          title={`已流失 ${kpis.lostCount} 案`}
                        />
                      )}
                    </>
                  ) : null}
                </div>

                {/* Colored Dot Legend */}
                <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span className={`w-1.5 h-1.5 rounded-full ${openDotBg}`} />
                    進行中 {kpis.openCount}
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    已成交 {kpis.wonCount}
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    已流失 {kpis.lostCount}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 3: BD WON AMT + BD WON % (固定同色系 Emerald 綠色強調) */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-emerald-950/75 dark:via-emerald-950/35 dark:to-slate-900/95 border border-emerald-200/80 dark:border-emerald-800/60 border-l-4 border-l-emerald-500 dark:border-l-emerald-400 rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between min-h-[158px]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300/90 block">
                    BD WON AMT
                  </span>
                  <h3
                    className="text-[19px] 2xl:text-[22px] font-black text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5 truncate"
                    title={formatCurrency(kpis.wonAmount)}
                  >
                    {formatCurrency(kpis.wonAmount)}
                  </h3>
                </div>
                <KpiWonIcon className="w-10 h-10 flex-shrink-0 -mt-0.5" />
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs gap-1">
                  <span className="font-bold text-slate-600 dark:text-slate-300 truncate">
                    BD WON % ({kpis.wonCount}/{kpis.totalOpportunitiesCount})
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[11px] font-black font-mono tabular-nums bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                    {kpis.wonRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-emerald-100/80 dark:bg-emerald-950/80 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, kpis.wonRate))}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 truncate">
                  已成交 {kpis.wonCount} 案 · 佔潛在總額 {wonAmountShare.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* KPI 4: BD LOST AMT + BD LOST % (固定同色系 Rose 紅色強調) */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-rose-950/75 dark:via-rose-950/35 dark:to-slate-900/95 border border-rose-200/80 dark:border-rose-800/60 border-l-4 border-l-rose-500 dark:border-l-rose-400 rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between min-h-[158px]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300/90 block">
                    BD LOST AMT
                  </span>
                  <h3
                    className="text-[19px] 2xl:text-[22px] font-black text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5 truncate"
                    title={formatCurrency(kpis.lostAmount)}
                  >
                    {formatCurrency(kpis.lostAmount)}
                  </h3>
                </div>
                <KpiLostIcon className="w-10 h-10 flex-shrink-0 -mt-0.5" />
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs gap-1">
                  <span className="font-bold text-slate-600 dark:text-slate-300 truncate">
                    BD LOST % ({kpis.lostCount}/{kpis.totalOpportunitiesCount})
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[11px] font-black font-mono tabular-nums bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex-shrink-0">
                    {kpis.lostRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-rose-100/80 dark:bg-rose-950/80 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, kpis.lostRate))}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 truncate">
                  已流失 {kpis.lostCount} 案 · 佔潛在總額 {lostAmountShare.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* KPI 5: 活動完成率 (獨立營運效率指標，與金額解耦) */}
            <div className="bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between min-h-[158px]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                    活動完成率
                  </span>
                  <h3 className="text-[22px] 2xl:text-[24px] font-black text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5">
                    {kpis.activityCompletionRate.toFixed(1)}%
                  </h3>
                </div>
                <KpiTargetIcon variant={variant} className="w-10 h-10 flex-shrink-0 -mt-0.5" />
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs gap-1">
                  <span className="font-bold text-slate-500 dark:text-slate-400">執行進度</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black border ${activityStatus.cls}`}>
                    {activityStatus.label}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${theme.progressBar}`}
                    style={{ width: `${Math.min(100, Math.max(0, kpis.activityCompletionRate))}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 pt-0.5 truncate">
                  已完成 {kpis.completedActivitiesCount}/{kpis.totalActivitiesCount} 項 · 獨立營運效率指標
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 圖表與排行榜區塊 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-white">銷售漏斗分析 (Sales Funnel)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {funnelViewMode === 'weighted'
                  ? '實心為加權金額、虛線外框為原始總額（即時連動時間區間與 Slicer）'
                  : '各銷售階段所持商機個數分佈（即時連動時間區間與 Slicer）'}
              </p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setFunnelViewMode('weighted')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  funnelViewMode === 'weighted'
                    ? `bg-white dark:bg-slate-950 ${theme.accentText} shadow-xs`
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                加權業績金額
              </button>
              <button
                type="button"
                onClick={() => setFunnelViewMode('count')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  funnelViewMode === 'count'
                    ? `bg-white dark:bg-slate-950 ${theme.accentText} shadow-xs`
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                商機個數
              </button>
            </div>
          </div>

          {renderSVGFunnel()}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          {currentUser?.role === 'ADMIN' || currentUser?.role === 'BU_HEAD' ? (
            <div className="h-full flex flex-col justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-800 dark:text-white">銷售團隊績效排行榜</h2>
                <p className="text-xs text-slate-400 mt-0.5">各業務加權業績與 BD Progress %（不含 BD Lost）</p>
              </div>

              <div className="space-y-3 my-5 overflow-y-auto max-h-72 pr-1">
                {salesPerf.length > 0 ? (
                  salesPerf.map((perf, index) => (
                    <div
                      key={perf.userId}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            index === 0
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{perf.userName}</p>
                          <p className="text-[10px] text-slate-400">
                            進行中 {perf.openCount} · 成交 {perf.wonCount} · Progress {perf.progressRate.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                          {formatCurrency(perf.expectedAmount)}
                        </p>
                        <p className="text-[10px] text-slate-400">潛在: {formatCompactCurrency(perf.totalAmount)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">目前篩選條件下無業務業績</p>
                )}
              </div>

              <button
                onClick={() => setActiveTab?.('metrics')}
                className={`w-full py-2 rounded-xl text-xs font-bold border ${theme.accentSoftBg} ${theme.accentText} ${theme.accentBorder} hover:opacity-90 transition`}
              >
                前往「管理指標檢核」看部門/業務完整報表 →
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-800 dark:text-white">業務個人里程碑</h2>
                <p className="text-xs text-slate-400 mt-0.5">您目前的個人表現與活動統計</p>
              </div>

              <div className="my-5 space-y-4">
                <div className={`p-4 rounded-xl border ${theme.accentSoftBg} ${theme.accentBorder}`}>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">BD Progress %</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-extrabold ${theme.accentText}`}>
                      {kpis.bdProgressRate.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400">加權金額 ÷ 潛在總額</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${theme.progressBar}`}
                      style={{ width: `${Math.min(kpis.bdProgressRate, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/50 rounded-xl">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">活動完成績效</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {kpis.activityCompletionRate.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400">個人活動達成比率</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${Math.min(kpis.activityCompletionRate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className={`text-[11px] text-slate-500 dark:text-slate-400 p-3 rounded-xl border ${theme.accentSoftBg} ${theme.accentBorder}`}>
                💡 可切換上方月區間與客戶 Slicer，或前往「管理指標檢核」查看週/月報與活動統計。
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
