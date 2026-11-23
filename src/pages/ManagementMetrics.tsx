import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import {
  db,
  getSubOrgIds,
  getVisibleOrgsForUser,
  getEligibleSalesReps,
  getOppCreatedDate,
  getOppClosedDate,
  isActivityInMonthRange,
} from '../services/db';
import type {
  Organization,
  User,
  Company,
  Stage,
  Opportunity,
  Activity,
  ActivityTypeConfig,
  SalesTarget,
} from '../services/db';
import { exportToCsv } from '../utils/exportCsv';
import {
  BarChart3,
  FolderTree,
  User as UserIcon,
  Building2,
  CalendarRange,
  Download,
  Coins,
  TrendingUp,
  Layers,
  Award,
  Activity as ActivityIcon,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export const ManagementMetrics: React.FC = () => {
  const { currentUser } = useAuth();
  const { theme, dataVersion, bumpDataVersion } = useLayout();

  // Slicers
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Section controls
  const [activityDimension, setActivityDimension] = useState<'company' | 'org' | 'rep'>('company');
  const [periodMode, setPeriodMode] = useState<'month' | 'week'>('month');
  const [showUnitCostEditor, setShowUnitCostEditor] = useState(false);

  // Data
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeConfig[]>([]);
  const [salesTargets, setSalesTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBase = async () => {
      const [orgs, usrs, comps, stgs, actTypes, targets] = await Promise.all([
        db.getOrganizations(),
        db.getUsers(),
        db.getCompanies(),
        db.getStages(true),
        db.getActivityTypes(),
        db.getSalesTargets(),
      ]);
      setOrganizations(orgs);
      setUsers(usrs);
      setCompanies(comps);
      setStages(stgs);
      setActivityTypes(actTypes);
      setSalesTargets(targets);
    };
    loadBase();
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

  useEffect(() => {
    if (selectedUserId && !eligibleReps.some(u => u.id === selectedUserId)) {
      setSelectedUserId('');
    }
  }, [eligibleReps, selectedUserId]);

  useEffect(() => {
    if (!currentUser) return;
    const loadFiltered = async () => {
      try {
        setLoading(true);
        const filters = {
          orgId: selectedOrgId || undefined,
          userId: selectedUserId || undefined,
          companyId: selectedCompanyId || undefined,
          startMonth: startMonth || undefined,
          endMonth: endMonth || undefined,
        };
        const [opps, allActs] = await Promise.all([
          db.getOpportunities(currentUser.role, currentUser.id, filters),
          db.getActivities(),
        ]);
        const oppIdSet = new Set(opps.map(o => o.id));
        const filteredActs = allActs.filter(
          a => oppIdSet.has(a.opportunityId) && isActivityInMonthRange(a, filters.startMonth, filters.endMonth)
        );
        setOpportunities(opps);
        setActivities(filteredActs);
      } finally {
        setLoading(false);
      }
    };
    loadFiltered();
  }, [currentUser, selectedOrgId, selectedUserId, selectedCompanyId, startMonth, endMonth, dataVersion]);

  const stageMap = useMemo(() => new Map(stages.map(s => [s.id, s])), [stages]);
  const actTypeCostMap = useMemo(
    () => new Map(activityTypes.map(t => [t.name, t.unitCost || 0])),
    [activityTypes]
  );
  const hasAnyUnitCost = useMemo(
    () => activityTypes.some(t => (t.unitCost || 0) > 0),
    [activityTypes]
  );

  const formatCompact = (val: number) =>
    val >= 10000 ? `NT$ ${(val / 10000).toFixed(0)} 萬` : `NT$ ${Math.round(val).toLocaleString()}`;

  const computeOppStats = (list: Opportunity[]) => {
    const open = list.filter(o => (stageMap.get(o.stageId)?.outcome || 'OPEN') === 'OPEN');
    const won = list.filter(o => stageMap.get(o.stageId)?.outcome === 'WON');
    const lost = list.filter(o => stageMap.get(o.stageId)?.outcome === 'LOST');
    const nonLost = list.filter(o => stageMap.get(o.stageId)?.outcome !== 'LOST');
    const potentialAmt = nonLost.reduce((s, o) => s + o.amount, 0);
    const weightedAmt = nonLost.reduce((s, o) => s + o.amount * (o.winProbability / 100), 0);
    const wonAmt = won.reduce((s, o) => s + o.amount, 0);
    const progressPct = potentialAmt > 0 ? (weightedAmt / potentialAmt) * 100 : 0;
    const wonPct = list.length > 0 ? (won.length / list.length) * 100 : 0;
    return {
      totalCount: list.length,
      openCount: open.length,
      wonCount: won.length,
      lostCount: lost.length,
      potentialAmt,
      weightedAmt,
      wonAmt,
      progressPct,
      wonPct,
    };
  };

  // =========================================================================
  // A) BD Progress % by 部門 & by Sales Rep
  // =========================================================================
  const progressByOrg = useMemo(() => {
    return visibleOrgs
      .map(org => {
        const subIds = new Set(getSubOrgIds(org.id, organizations));
        const orgUserIds = new Set(
          users.filter(u => u.orgId && subIds.has(u.orgId)).map(u => u.id)
        );
        const orgOpps = opportunities.filter(o => orgUserIds.has(o.userId));
        return { org, ...computeOppStats(orgOpps) };
      })
      .sort((a, b) => b.potentialAmt - a.potentialAmt);
  }, [visibleOrgs, organizations, users, opportunities, stageMap]);

  const progressByRep = useMemo(() => {
    const repPool =
      currentUser?.role === 'AM'
        ? users.filter(u => u.id === currentUser.id)
        : eligibleReps.length > 0
          ? eligibleReps
          : users;

    return repPool
      .map(rep => {
        const repOpps = opportunities.filter(o => o.userId === rep.id);
        const orgName = organizations.find(o => o.id === rep.orgId)?.name || '未分配';
        return { rep, orgName, ...computeOppStats(repOpps) };
      })
      .filter(r => r.totalCount > 0 || currentUser?.role === 'AM')
      .sort((a, b) => b.weightedAmt - a.weightedAmt);
  }, [users, eligibleReps, currentUser, opportunities, organizations, stageMap]);

  // =========================================================================
  // B) 活動計數與量化價值統計 (by 客戶 / by 部門 / by Sales Rep)
  // =========================================================================
  const activityBreakdown = useMemo(() => {
    const oppMap = new Map(opportunities.map(o => [o.id, o]));
    const nowTs = Date.now();

    const buildRow = (key: string, name: string, subLabel: string, acts: Activity[]) => {
      const byType: Record<string, number> = {};
      let quantifiedCost = 0;
      let latestDate = '';
      for (const a of acts) {
        byType[a.type] = (byType[a.type] || 0) + 1;
        quantifiedCost += actTypeCostMap.get(a.type) || 0;
        const d = (a.dueDate || '').slice(0, 10);
        if (d > latestDate) latestDate = d;
      }
      const completed = acts.filter(a => a.isCompleted).length;
      const daysSince = latestDate
        ? Math.floor((nowTs - new Date(latestDate).getTime()) / 86400000)
        : null;
      return {
        key,
        name,
        subLabel,
        total: acts.length,
        completed,
        completionPct: acts.length > 0 ? (completed / acts.length) * 100 : 0,
        byType,
        quantifiedCost,
        latestDate,
        daysSince,
      };
    };

    if (activityDimension === 'company') {
      const relevantCompanies = selectedCompanyId
        ? companies.filter(c => c.id === selectedCompanyId)
        : companies;
      return relevantCompanies
        .map(c => {
          const compActs = activities.filter(a => oppMap.get(a.opportunityId)?.companyId === c.id);
          return buildRow(c.id, c.name, c.industry || '客戶', compActs);
        })
        .sort((a, b) => b.total - a.total);
    }

    if (activityDimension === 'org') {
      return visibleOrgs
        .map(org => {
          const subIds = new Set(getSubOrgIds(org.id, organizations));
          const orgUsers = new Set(
            users.filter(u => u.orgId && subIds.has(u.orgId)).map(u => u.id)
          );
          const orgActs = activities.filter(a => {
            const ownerId = oppMap.get(a.opportunityId)?.userId || a.userId;
            return orgUsers.has(ownerId);
          });
          return buildRow(org.id, org.name, `${orgUsers.size} 人`, orgActs);
        })
        .sort((a, b) => b.total - a.total);
    }

    // Rep
    const repPool =
      currentUser?.role === 'AM'
        ? users.filter(u => u.id === currentUser.id)
        : eligibleReps.length > 0
          ? eligibleReps
          : users;
    return repPool
      .map(rep => {
        const repActs = activities.filter(a => {
          const ownerId = oppMap.get(a.opportunityId)?.userId || a.userId;
          return ownerId === rep.id;
        });
        const orgName = organizations.find(o => o.id === rep.orgId)?.name || '未分配';
        return buildRow(rep.id, rep.name, orgName, repActs);
      })
      .sort((a, b) => b.total - a.total);
  }, [
    activityDimension,
    opportunities,
    activities,
    companies,
    selectedCompanyId,
    visibleOrgs,
    organizations,
    users,
    eligibleReps,
    currentUser,
    actTypeCostMap,
  ]);

  // =========================================================================
  // C) 週報 / 月報 期間活動與目標達成檢核
  // =========================================================================
  const getWeekKey = (dateStr: string) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '未知';
    const day = d.getDay() || 7;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 1);
    const oneJan = new Date(monday.getFullYear(), 0, 1);
    const wk = Math.ceil(((monday.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
    return `${monday.getFullYear()}-W${String(wk).padStart(2, '0')}`;
  };

  const periodReportRows = useMemo(() => {
    const targetMap = new Map(salesTargets.map(t => [t.month, t.targetAmount]));
    const keys = new Set<string>();

    const toKey = (dateStr: string) => (periodMode === 'month' ? dateStr.slice(0, 7) : getWeekKey(dateStr));

    // Include current month/week by default so table isn't blank
    const todayStr = new Date().toISOString().slice(0, 10);
    keys.add(toKey(todayStr));

    for (const o of opportunities) {
      const c = getOppCreatedDate(o);
      if (c) keys.add(toKey(c));
      const cl = getOppClosedDate(o, stages);
      if (cl) keys.add(toKey(cl));
    }
    for (const a of activities) {
      const d = (a.dueDate || '').slice(0, 10);
      if (d) keys.add(toKey(d));
    }

    let sortedKeys = Array.from(keys).filter(k => k && k !== '未知').sort().reverse();
    if (periodMode === 'month' && (startMonth || endMonth)) {
      sortedKeys = sortedKeys.filter(
        k => (!startMonth || k >= startMonth) && (!endMonth || k <= endMonth)
      );
    }

    return sortedKeys.slice(0, 12).map(periodKey => {
      const newOpps = opportunities.filter(o => toKey(getOppCreatedDate(o)) === periodKey);
      const wonOpps = opportunities.filter(o => {
        if (stageMap.get(o.stageId)?.outcome !== 'WON') return false;
        const cl = getOppClosedDate(o, stages);
        return cl ? toKey(cl) === periodKey : false;
      });
      const lostOpps = opportunities.filter(o => {
        if (stageMap.get(o.stageId)?.outcome !== 'LOST') return false;
        const cl = getOppClosedDate(o, stages);
        return cl ? toKey(cl) === periodKey : false;
      });
      const periodActs = activities.filter(a => toKey((a.dueDate || '').slice(0, 10)) === periodKey);
      const completedActs = periodActs.filter(a => a.isCompleted).length;

      const wonAmt = wonOpps.reduce((s, o) => s + o.amount, 0);
      const newAmt = newOpps.reduce((s, o) => s + o.amount, 0);
      const targetAmt = periodMode === 'month' ? targetMap.get(periodKey) || 0 : 0;
      const achievePct = targetAmt > 0 ? (wonAmt / targetAmt) * 100 : null;

      return {
        periodKey,
        newCount: newOpps.length,
        newAmt,
        wonCount: wonOpps.length,
        wonAmt,
        lostCount: lostOpps.length,
        actCount: periodActs.length,
        actCompleted: completedActs,
        actCompletionPct: periodActs.length > 0 ? (completedActs / periodActs.length) * 100 : 0,
        targetAmt,
        achievePct,
      };
    });
  }, [opportunities, activities, stages, stageMap, periodMode, startMonth, endMonth, salesTargets]);

  // =========================================================================
  // D) 商機大小分佈 (Deal Size Distribution) & 客戶商機 Top N 排行
  // =========================================================================
  const dealSizeBuckets = useMemo(() => {
    const defs = [
      { id: 'b1', label: '< 50 萬', min: 0, max: 500000 },
      { id: 'b2', label: '50 – 150 萬', min: 500000, max: 1500000 },
      { id: 'b3', label: '150 – 300 萬', min: 1500000, max: 3000000 },
      { id: 'b4', label: '300 – 500 萬', min: 3000000, max: 5000000 },
      { id: 'b5', label: '≥ 500 萬', min: 5000000, max: Infinity },
    ];
    const nonLost = opportunities.filter(o => stageMap.get(o.stageId)?.outcome !== 'LOST');
    const totalCount = nonLost.length;
    return defs.map(b => {
      const matched = nonLost.filter(o => o.amount >= b.min && o.amount < b.max);
      const sumAmt = matched.reduce((s, o) => s + o.amount, 0);
      return {
        ...b,
        count: matched.length,
        sumAmt,
        ratio: totalCount > 0 ? (matched.length / totalCount) * 100 : 0,
      };
    });
  }, [opportunities, stageMap]);

  const topAccounts = useMemo(() => {
    return companies
      .map(c => {
        const compOpps = opportunities.filter(o => o.companyId === c.id);
        return { company: c, ...computeOppStats(compOpps) };
      })
      .filter(r => r.totalCount > 0)
      .sort((a, b) => b.potentialAmt - a.potentialAmt)
      .slice(0, 8);
  }, [companies, opportunities, stageMap]);

  const handleUpdateUnitCost = async (actType: ActivityTypeConfig, rawVal: string) => {
    const val = parseFloat(rawVal);
    await db.saveActivityType({
      ...actType,
      unitCost: !Number.isNaN(val) && val > 0 ? val : undefined,
    });
    bumpDataVersion();
  };

  const handleUpdateTarget = async (month: string, rawVal: string) => {
    const val = parseFloat(rawVal) || 0;
    await db.saveSalesTarget({ month, targetAmount: val });
    bumpDataVersion();
  };

  const renderOrgOptions = (parentId: string | null, depth = 0, visited = new Set<string>()) => {
    const visibleIds = new Set(visibleOrgs.map(o => o.id));
    const list = visibleOrgs.filter(o => {
      if (visited.has(o.id)) return false;
      if (parentId === null) return o.parentId === null || !visibleIds.has(o.parentId);
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

  const handleExportMetrics = () => {
    const headers = [
      '期間',
      '新建商機數',
      '新建商機總額(NTD)',
      '成交案數',
      '成交金額(NTD)',
      '流失案數',
      '活動次數',
      '活動完成率(%)',
      '目標金額(NTD)',
      '達成率(%)',
    ];
    const rows = periodReportRows.map(r => [
      r.periodKey,
      r.newCount,
      r.newAmt,
      r.wonCount,
      r.wonAmt,
      r.lostCount,
      r.actCount,
      r.actCompletionPct.toFixed(1),
      r.targetAmt,
      r.achievePct !== null ? r.achievePct.toFixed(1) : '-',
    ]);
    exportToCsv(`EZB2B_管理指標_${periodMode}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header & Unified Slicer Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className={`w-5 h-5 ${theme.accentText}`} />
            <span>管理指標檢核 (Management Metrics)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            補齊部門／業務 BD Progress %、活動量化計數、週／月報目標達成率與商機大小分佈
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
          {/* Month Range */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs">
            <CalendarRange className={`w-3.5 h-3.5 ${theme.accentText}`} />
            <input
              type="month"
              value={startMonth}
              onChange={e => setStartMonth(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold outline-none w-[108px]"
            />
            <span className="text-slate-400">~</span>
            <input
              type="month"
              value={endMonth}
              onChange={e => setEndMonth(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold outline-none w-[108px]"
            />
            {(startMonth || endMonth) && (
              <button
                onClick={() => {
                  setStartMonth('');
                  setEndMonth('');
                }}
                className="text-[10px] font-bold text-rose-500 px-1"
              >
                ✕
              </button>
            )}
          </div>

          {currentUser?.role !== 'AM' && (
            <div className="flex items-center gap-1.5">
              <FolderTree className={`w-4 h-4 ${theme.accentText}`} />
              <select
                value={selectedOrgId}
                onChange={e => setSelectedOrgId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="" className="bg-white dark:bg-slate-950">全部部門</option>
                {renderOrgOptions(null)}
              </select>
            </div>
          )}

          {currentUser?.role !== 'AM' && eligibleReps.length > 0 && (
            <div className="flex items-center gap-1.5">
              <UserIcon className={`w-4 h-4 ${theme.accentText}`} />
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
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

          <div className="flex items-center gap-1.5">
            <Building2 className={`w-4 h-4 ${theme.accentText}`} />
            <select
              value={selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="" className="bg-white dark:bg-slate-950">全部客戶</option>
              {companies.map(c => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-950">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportMetrics}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出報表</span>
          </button>
        </div>
      </div>

      {/* Section A: BD Progress % by 部門 & by Sales Rep */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By 部門 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <FolderTree className={`w-4 h-4 ${theme.accentText}`} />
                <span>by 部門 · BD Progress %</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">含下層子部門彙總（加權金額 ÷ 潛在總額，不含 BD Lost）</p>
            </div>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {progressByOrg.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 italic">尚無組織部門資料</p>
            ) : (
              progressByOrg.map(row => (
                <div
                  key={row.org.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-extrabold text-slate-800 dark:text-slate-100 truncate">
                      {row.org.name}
                      <span className="ml-2 text-[10px] font-semibold text-slate-400">
                        {row.openCount} 進行 / {row.wonCount} 成交 / {row.lostCount} 流失
                      </span>
                    </div>
                    <span className={`font-black font-mono ${theme.accentText}`}>
                      {row.progressPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${theme.progressBar}`}
                      style={{ width: `${Math.min(100, row.progressPct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>潛在總額：{formatCompact(row.potentialAmt)}</span>
                    <span>加權金額：<strong className="text-slate-700 dark:text-slate-200">{formatCompact(row.weightedAmt)}</strong></span>
                    <span>BD Won %：{row.wonPct.toFixed(1)}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* By Sales Rep */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <UserIcon className={`w-4 h-4 ${theme.accentText}`} />
              <span>by Sales Rep · BD Progress %</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">各業務負責商機推進度與加權貢獻</p>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {progressByRep.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 italic">目前篩選下無業務商機資料</p>
            ) : (
              progressByRep.map(row => (
                <div
                  key={row.rep.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">{row.rep.name}</span>
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {row.orgName}
                      </span>
                    </div>
                    <span className={`font-black font-mono ${theme.accentText}`}>
                      {row.progressPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${theme.progressBar}`}
                      style={{ width: `${Math.min(100, row.progressPct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{row.openCount} 進行 / {row.wonCount} 成交 / {row.lostCount} 流失</span>
                    <span>加權：{formatCompact(row.weightedAmt)} / 潛在：{formatCompact(row.potentialAmt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Section B: 活動計數與量化單價統計 (by 客戶 / by 部門 / by Sales Rep) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <ActivityIcon className={`w-4 h-4 ${theme.accentText}`} />
              <span>活動計數與量化投入統計（by 客戶 / 部門 / Sales Rep）</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              統計各維度拜訪、會議與跟進次數；可為各活動類型設定單價以自動量化總投入
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowUnitCostEditor(!showUnitCostEditor)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              <Coins className={`w-3.5 h-3.5 ${theme.accentText}`} />
              <span>設定活動量化單價</span>
              {showUnitCostEditor ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              {(
                [
                  { id: 'company', label: 'by 客戶' },
                  { id: 'org', label: 'by 部門' },
                  { id: 'rep', label: 'by Sales Rep' },
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActivityDimension(tab.id)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    activityDimension === tab.id
                      ? `bg-white dark:bg-slate-950 ${theme.accentText} shadow-xs`
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inline Activity Unit Cost Editor */}
        {showUnitCostEditor && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
            {activityTypes.map(t => (
              <div key={t.id} className="space-y-1">
                <label className="block font-bold text-slate-600 dark:text-slate-300 truncate">{t.name} (NTD/次)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  defaultValue={t.unitCost || ''}
                  onBlur={e => handleUpdateUnitCost(t, e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-bold">
                  {activityDimension === 'company' ? '客戶公司' : activityDimension === 'org' ? '組織部門' : 'Sales Rep'}
                </th>
                <th className="py-2.5 px-3 font-bold text-center">總計數</th>
                {activityTypes.map(t => (
                  <th key={t.id} className="py-2.5 px-2.5 font-bold text-center whitespace-nowrap">
                    {t.name}
                  </th>
                ))}
                <th className="py-2.5 px-3 font-bold text-center">活動完成率</th>
                <th className="py-2.5 px-3 font-bold text-center">最近互動日</th>
                <th className="py-2.5 px-3 font-bold text-right">
                  量化總額 {hasAnyUnitCost ? '(NTD)' : '(未設單價)'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activityBreakdown.map(row => (
                <tr key={row.key} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-3">
                    <div className="font-extrabold text-slate-800 dark:text-slate-100">{row.name}</div>
                    <div className="text-[10px] text-slate-400">{row.subLabel}</div>
                  </td>
                  <td className={`py-2.5 px-3 text-center font-mono font-black ${theme.accentText}`}>{row.total}</td>
                  {activityTypes.map(t => (
                    <td key={t.id} className="py-2.5 px-2.5 text-center font-mono text-slate-600 dark:text-slate-300">
                      {row.byType[t.name] || 0}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-200">
                    {row.total > 0 ? `${row.completionPct.toFixed(0)}%` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {row.latestDate ? (
                      <span
                        className={
                          row.daysSince !== null && row.daysSince > 14
                            ? 'px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400'
                        }
                      >
                        {row.latestDate}
                        {row.daysSince !== null && row.daysSince > 14 ? ` (${row.daysSince}天前)` : ''}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">無紀錄</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                    {hasAnyUnitCost ? `NT$ ${row.quantifiedCost.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
              {activityBreakdown.length === 0 && (
                <tr>
                  <td colSpan={activityTypes.length + 5} className="py-8 text-center text-slate-400">
                    尚無統計資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section C: 期間活動與目標達成（週報 / 月報） */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className={`w-4 h-4 ${theme.accentText}`} />
              <span>期間活動與業績目標達成（週報 / 月報）</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              追蹤每週／每月新建案、成交案、活動完成數，並可直接在月報模式輸入「月目標金額」即時計算達成率
            </p>
          </div>
          <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setPeriodMode('month')}
              className={`px-3 py-1 rounded-lg font-bold ${
                periodMode === 'month' ? `bg-white dark:bg-slate-950 ${theme.accentText} shadow-xs` : 'text-slate-500'
              }`}
            >
              月報 (Monthly)
            </button>
            <button
              onClick={() => setPeriodMode('week')}
              className={`px-3 py-1 rounded-lg font-bold ${
                periodMode === 'week' ? `bg-white dark:bg-slate-950 ${theme.accentText} shadow-xs` : 'text-slate-500'
              }`}
            >
              週報 (Weekly)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-bold">{periodMode === 'month' ? '月份' : '週次'}</th>
                <th className="py-2.5 px-3 font-bold text-right">新建商機</th>
                <th className="py-2.5 px-3 font-bold text-right">成交 (BD Won)</th>
                <th className="py-2.5 px-3 font-bold text-center">流失案數</th>
                <th className="py-2.5 px-3 font-bold text-center">期間活動 (完成率)</th>
                {periodMode === 'month' && (
                  <>
                    <th className="py-2.5 px-3 font-bold text-right">月成交目標 (可輸入)</th>
                    <th className="py-2.5 px-3 font-bold text-right">目標達成率</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {periodReportRows.map(row => (
                <tr key={row.periodKey} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-mono font-extrabold text-slate-800 dark:text-slate-100">
                    {row.periodKey}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{row.newCount} 案</span>
                    <span className="text-[11px] text-slate-400 ml-1.5">({formatCompact(row.newAmt)})</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.wonCount} 案</span>
                    <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 ml-1.5">
                      ({formatCompact(row.wonAmt)})
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-500">
                    {row.lostCount}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                    {row.actCount} 次 ({row.actCount > 0 ? `${row.actCompletionPct.toFixed(0)}%` : '—'})
                  </td>
                  {periodMode === 'month' && (
                    <>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="100000"
                          placeholder="設定目標..."
                          defaultValue={row.targetAmt || ''}
                          onBlur={e => handleUpdateTarget(row.periodKey, e.target.value)}
                          className="w-28 text-right px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-800 dark:text-slate-100"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black">
                        {row.achievePct !== null ? (
                          <span
                            className={
                              row.achievePct >= 100
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : row.achievePct >= 60
                                  ? theme.accentText
                                  : 'text-amber-500'
                            }
                          >
                            {row.achievePct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">未設目標</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section D: 商機大小分佈 (Deal Size Distribution) & 客戶商機 Top N 排行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Deal Size Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className={`w-4 h-4 ${theme.accentText}`} />
              <span>商機大小分佈 (Deal Size Distribution)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">依 Monthly Deal Revenue 區間檢視大單與中小型案件結構（不含 BD Lost）</p>
          </div>
          <div className="space-y-3">
            {dealSizeBuckets.map(b => (
              <div key={b.id} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{b.label}</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    <strong className="text-slate-800 dark:text-slate-100">{b.count} 案</strong> ({b.ratio.toFixed(0)}%) · {formatCompact(b.sumAmt)}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${theme.progressBar} transition-all duration-300`}
                    style={{ width: `${Math.max(b.count > 0 ? 6 : 0, b.ratio)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customer Accounts Ranking */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Award className={`w-4 h-4 ${theme.accentText}`} />
              <span>by Customer Account 商機排行 (Top {topAccounts.length})</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">依潛在商機總額（不含 BD Lost）降冪排行</p>
          </div>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {topAccounts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 italic">目前無客戶商機排行資料</p>
            ) : (
              topAccounts.map((row, idx) => (
                <div
                  key={row.company.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] flex-shrink-0 ${
                        idx === 0
                          ? 'bg-amber-500 text-white'
                          : idx === 1
                            ? 'bg-slate-400 text-white'
                            : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-800 dark:text-slate-100 truncate">
                        {row.company.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {row.company.industry} · {row.openCount} 進行 / {row.wonCount} 成交 · Progress {row.progressPct.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-extrabold text-slate-800 dark:text-slate-100">
                      {formatCompact(row.potentialAmt)}
                    </div>
                    <div className={`text-[10px] font-mono font-bold ${theme.accentText}`}>
                      加權 {formatCompact(row.weightedAmt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
