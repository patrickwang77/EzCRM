import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { db } from '../services/db';
import type {
  Stage,
  Opportunity,
  User,
  Company,
  Organization,
  ProductLine,
  BudgetItemConfig,
  ActivityTypeConfig,
  Activity,
} from '../services/db';
import { exportToCsv } from '../utils/exportCsv';
import { inferPreviewTags, getTagToneClass } from '../utils/aiTagPreview';
import {
  Plus,
  Trash2,
  User as UserIcon,
  Building2,
  X,
  FolderTree,
  Edit3,
  Calendar,
  Coins,
  ChevronLeft,
  ChevronRight,
  Download,
  KanbanSquare,
  Table2,
  GanttChartSquare,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

type PipelineViewMode = 'pipeline' | 'table' | 'schedule';
type GanttZoom = 'week' | 'month' | 'quarter';

export const Pipeline: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    variant,
    theme,
    dataVersion,
    bumpDataVersion,
    copilotOppId,
    setCopilotOppId,
    setIsCopilotOpen,
  } = useLayout();

  // Slicers State
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [aiTagFilter, setAiTagFilter] = useState<string>('');

  // Sub-view mode: Kanban / Table / Gantt
  const [subTab, setSubTab] = useState<PipelineViewMode>('pipeline');
  const [cardDensity, setCardDensity] = useState<'normal' | 'compact'>('normal');
  const [hideLossStage, setHideLossStage] = useState<boolean>(false);
  const [ganttZoom, setGanttZoom] = useState<GanttZoom>('month');

  // Kanban horizontal scroll ref
  const kanbanScrollRef = useRef<HTMLDivElement | null>(null);

  // DB States
  const [stages, setStages] = useState<Stage[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItemConfig[]>([]);

  // Drag state
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Modal states (2-tab Edit / Create Opportunity)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [modalTab, setModalTab] = useState<'info' | 'schedule_budget'>('info');

  // Form fields
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [inlineNewCompany, setInlineNewCompany] = useState(false);
  const [inlineCompName, setInlineCompName] = useState('');
  const [inlineCompIndustry, setInlineCompIndustry] = useState('');
  const [userId, setUserId] = useState('');
  const [stageId, setStageId] = useState('');
  const [winProbability, setWinProbability] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');

  const [productLineId, setProductLineId] = useState('');
  const [monthlyQuantity, setMonthlyQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [oppSchedules, setOppSchedules] = useState<{ [stageId: string]: string }>({});
  const [oppBudgets, setOppBudgets] = useState<{ budgetItemId: string; amount: number }[]>([]);
  const [showStagesOnGantt, setShowStagesOnGantt] = useState(true);

  // Drawer & AM Mini-Modal states
  const [selectedOppForDrawer, setSelectedOppForDrawer] = useState<Opportunity | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerActivities, setDrawerActivities] = useState<Activity[]>([]);
  const [selectedUserForPerf, setSelectedUserForPerf] = useState<User | null>(null);
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
  const [amOpps, setAmOpps] = useState<Opportunity[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeConfig[]>([]);

  // Drawer quick activity form
  const [quickActDesc, setQuickActDesc] = useState('');
  const [quickActType, setQuickActType] = useState('');
  const [quickActDueDate, setQuickActDueDate] = useState('');

  const loadDrawerActivities = async (oppId: string) => {
    try {
      const allActs = await db.getActivities();
      setAllActivities(allActs);
      const filtered = allActs
        .filter(a => a.opportunityId === oppId)
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
      setDrawerActivities(filtered);
    } catch (err) {
      console.error('Failed to load drawer activities', err);
    }
  };

  useEffect(() => {
    if (selectedOppForDrawer) {
      loadDrawerActivities(selectedOppForDrawer.id);
    }
  }, [selectedOppForDrawer, dataVersion]);

  const loadAmOpps = async (amId: string) => {
    try {
      const allOpps = await db.getOpportunities('ADMIN', '', {});
      setAmOpps(allOpps.filter(o => o.userId === amId));
    } catch (err) {
      console.error('Failed to load AM opportunities', err);
    }
  };

  useEffect(() => {
    if (selectedUserForPerf) {
      loadAmOpps(selectedUserForPerf.id);
    }
  }, [selectedUserForPerf]);

  const handleSaveQuickActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppForDrawer || !quickActDesc || !quickActDueDate) {
      alert('請輸入完整描述與到期日');
      return;
    }
    const actData: Activity = {
      id: `act-${Date.now()}`,
      opportunityId: selectedOppForDrawer.id,
      userId: selectedOppForDrawer.userId,
      type: quickActType || '待辦任務',
      description: quickActDesc,
      dueDate: quickActDueDate.replace('T', ' '),
      isCompleted: false,
    };
    try {
      await db.saveActivity(actData);
      setQuickActDesc('');
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
      setQuickActDueDate(tomorrow.toISOString().slice(0, 16));
      loadDrawerActivities(selectedOppForDrawer.id);
      bumpDataVersion();
    } catch (err) {
      console.error('Failed to save quick activity', err);
    }
  };

  const loadData = async () => {
    if (!currentUser) return;
    try {
      const filters = {
        orgId: selectedOrgId || undefined,
        companyId: selectedCompanyId || undefined,
      };

      const [activeStages, opps, comps, orgs, usrs, prods, bgItems, actTypes, acts] =
        await Promise.all([
          db.getStages(true),
          db.getOpportunities(currentUser.role, currentUser.id, filters),
          db.getCompanies(),
          db.getOrganizations(),
          db.getUsers(),
          db.getProductLines(),
          db.getBudgetItems(),
          db.getActivityTypes(),
          db.getActivities(),
        ]);

      setStages(activeStages);
      setOpportunities(opps);
      setCompanies(comps);
      setOrganizations(orgs);
      setUsers(usrs);
      setProductLines(prods);
      setBudgetItems(bgItems);
      setActivityTypes(actTypes);
      setAllActivities(acts);

      if (actTypes.length > 0 && !quickActType) {
        setQuickActType(actTypes[0].name);
      }
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
      setQuickActDueDate(tomorrow.toISOString().slice(0, 16));
    } catch (err) {
      console.error('Failed to load pipeline data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, selectedOrgId, selectedCompanyId, dataVersion]);

  useEffect(() => {
    const focusCompId = sessionStorage.getItem('autofocus_company_id');
    if (focusCompId) {
      setSelectedCompanyId(focusCompId);
      sessionStorage.removeItem('autofocus_company_id');
    }
  }, [opportunities]);

  // Compute AI preview tags per opportunity
  const getOppTags = (opp: Opportunity) => {
    const actDescs = allActivities
      .filter(a => a.opportunityId === opp.id)
      .map(a => a.description);
    return inferPreviewTags([opp.title, ...actDescs], opp.tags);
  };

  const displayedOpportunities = aiTagFilter
    ? opportunities.filter(o => getOppTags(o).some(t => t.label === aiTagFilter))
    : opportunities;

  const allDetectedTagLabels = Array.from(
    new Set(opportunities.flatMap(o => getOppTags(o).map(t => t.label)))
  );

  // Click card behavior: Variant C docks into CopilotPanel; Variants A/B open Drawer
  const handleSelectCard = (opp: Opportunity) => {
    if (variant === 'C') {
      setCopilotOppId(opp.id);
      setIsCopilotOpen(true);
    } else {
      setSelectedOppForDrawer(opp);
      setIsDrawerOpen(true);
    }
  };

  const openModal = (opp: Opportunity | null = null, defaultStageId?: string) => {
    setModalTab('info');
    setInlineNewCompany(false);
    setInlineCompName('');
    setInlineCompIndustry('');

    if (opp) {
      setEditingOpp(opp);
      setTitle(opp.title);
      setCompanyId(opp.companyId);
      setUserId(opp.userId);
      setStageId(opp.stageId);
      setWinProbability(opp.winProbability.toString());
      setExpectedCloseDate(opp.expectedCloseDate);
      setProductLineId(opp.productLineId || '');
      setMonthlyQuantity(opp.monthlyQuantity?.toString() || '');
      setUnitPrice(opp.unitPrice?.toString() || '');
      setOppSchedules(opp.schedules || {});
      setOppBudgets(opp.budgets || []);
    } else {
      setEditingOpp(null);
      setTitle('');
      setCompanyId(companies[0]?.id || '');
      setUserId(
        currentUser?.role === 'AM'
          ? currentUser.id
          : users.find(u => u.role === 'AM')?.id || currentUser?.id || ''
      );

      const targetStageId = defaultStageId || stages[0]?.id || '';
      setStageId(targetStageId);
      const stage = stages.find(s => s.id === targetStageId);
      setWinProbability(stage ? stage.defaultWinProbability.toString() : '10');

      setProductLineId(productLines[0]?.id || '');
      setMonthlyQuantity('');
      setUnitPrice('');
      setOppSchedules(targetStageId ? { [targetStageId]: new Date().toISOString().split('T')[0] } : {});
      setOppBudgets([]);
      setExpectedCloseDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      );
    }
    setIsModalOpen(true);
  };

  const handleSaveOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !title || !userId) {
      alert('請填寫所有必要欄位');
      return;
    }

    let finalCompanyId = companyId;
    if (inlineNewCompany) {
      if (!inlineCompName.trim()) {
        alert('請輸入新客戶公司名稱');
        return;
      }
      const newComp: Company = {
        id: `comp-${Date.now()}`,
        name: inlineCompName.trim(),
        industry: inlineCompIndustry.trim() || '一般企業',
        createdAt: new Date().toISOString().split('T')[0],
      };
      await db.saveCompany(newComp);
      finalCompanyId = newComp.id;
    }

    if (!finalCompanyId) {
      alert('請選擇或建立客戶公司');
      return;
    }

    const numericQty = parseInt(monthlyQuantity) || 0;
    const numericPrice = parseFloat(unitPrice) || 0;
    const calculatedAmount = numericQty * numericPrice;

    let latestDate = expectedCloseDate;
    const sortedStagesDesc = [...stages].sort((a, b) => b.displayOrder - a.displayOrder);
    for (const s of sortedStagesDesc) {
      if (oppSchedules[s.id]) {
        latestDate = oppSchedules[s.id];
        break;
      }
    }

    const currentStageId = editingOpp ? editingOpp.stageId : stageId;
    const currentWinProb = editingOpp
      ? editingOpp.winProbability
      : stages.find(s => s.id === currentStageId)?.defaultWinProbability || 10;

    const oppData: Opportunity = {
      id: editingOpp ? editingOpp.id : `opp-${Date.now()}`,
      companyId: finalCompanyId,
      userId,
      stageId: currentStageId,
      title,
      amount: calculatedAmount,
      winProbability: currentWinProb,
      expectedCloseDate: latestDate,
      productLineId,
      monthlyQuantity: numericQty,
      unitPrice: numericPrice,
      orgId: editingOpp ? editingOpp.orgId : null,
      schedules: oppSchedules,
      budgets: oppBudgets,
      tags: editingOpp?.tags,
    };

    try {
      await db.saveOpportunity(oppData);
      const activeStages = [...stages].sort((a, b) => a.displayOrder - b.displayOrder);
      const wonStageId = activeStages[activeStages.length - 2]?.id || 'stage-5';
      if (currentStageId === wonStageId && (!editingOpp || editingOpp.stageId !== wonStageId)) {
        triggerConfetti();
      }
      setIsModalOpen(false);
      bumpDataVersion();
    } catch (err) {
      console.error('Failed to save opportunity', err);
    }
  };

  const handleDeleteOpportunity = async (id: string) => {
    if (!window.confirm('確定要刪除此商機嗎？這也會一併刪除關聯的活動紀錄！')) return;
    try {
      await db.deleteOpportunity(id);
      setIsModalOpen(false);
      bumpDataVersion();
    } catch (err) {
      console.error('Failed to delete opportunity', err);
    }
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  };

  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    e.dataTransfer.setData('text/plain', oppId);
  };

  const handleDragOver = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStageId(targetStageId);
  };

  const handleDragLeave = () => {
    setDragOverStageId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);
    const oppId = e.dataTransfer.getData('text/plain');
    if (!oppId) return;

    try {
      const opp = await db.getOpportunityById(oppId);
      if (opp && opp.stageId !== targetStageId) {
        const originalStageId = opp.stageId;
        opp.stageId = targetStageId;
        const stage = stages.find(s => s.id === targetStageId);
        if (stage) {
          opp.winProbability = stage.defaultWinProbability;
        }
        await db.saveOpportunity(opp);

        const activeStages = [...stages].sort((a, b) => a.displayOrder - b.displayOrder);
        const wonStageId = activeStages[activeStages.length - 2]?.id || 'stage-5';
        if (targetStageId === wonStageId && originalStageId !== wonStageId) {
          triggerConfetti();
        }
        bumpDataVersion();
      }
    } catch (err) {
      console.error('Failed to update stage on drop', err);
    }
  };

  const formatCompactCurrency = (value: number) =>
    value >= 10000 ? `NT$ ${(value / 10000).toFixed(0)} 萬` : `NT$ ${value}`;

  const renderOrgOptions = (parentId: string | null, depth = 0) => {
    const list = organizations.filter(o => o.parentId === parentId);
    return list.map(org => (
      <React.Fragment key={org.id}>
        <option value={org.id} className="bg-white dark:bg-slate-950">
          {'\u00A0'.repeat(depth * 3)}
          {org.name}
        </option>
        {renderOrgOptions(org.id, depth + 1)}
      </React.Fragment>
    ));
  };

  const handleExportPipeline = () => {
    const headers = [
      '商機名稱',
      '客戶公司',
      '負責業務',
      '銷售階段',
      'Product Line',
      '每月數量',
      '單價(NTD)',
      '月估金額(NTD)',
      '贏率(%)',
      '加權金額(NTD)',
      '預計結案日',
    ];
    const rows = displayedOpportunities.map(o => {
      const comp = companies.find(c => c.id === o.companyId)?.name || '';
      const usr = users.find(u => u.id === o.userId)?.name || '';
      const stg = stages.find(s => s.id === o.stageId)?.name || '';
      const pl = productLines.find(p => p.id === o.productLineId)?.name || '';
      return [
        o.title,
        comp,
        usr,
        stg,
        pl,
        o.monthlyQuantity,
        o.unitPrice,
        o.amount,
        o.winProbability,
        Math.round(o.amount * (o.winProbability / 100)),
        o.expectedCloseDate,
      ];
    });
    exportToCsv(`CRM_BD_Pipeline_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const scrollKanban = (delta: number) => {
    kanbanScrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const scrollToStageColumn = (targetStageId: string) => {
    const el = document.getElementById(`kanban-col-${targetStageId}`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  // Stage dot & accent color palette
  const STAGE_COLORS = [
    { bar: 'bg-sky-500', dot: 'bg-sky-500 text-white', hex: '#0ea5e9' },
    { bar: 'bg-blue-500', dot: 'bg-blue-500 text-white', hex: '#3b82f6' },
    { bar: 'bg-indigo-500', dot: 'bg-indigo-500 text-white', hex: '#6366f1' },
    { bar: 'bg-violet-500', dot: 'bg-violet-500 text-white', hex: '#8b5cf6' },
    { bar: 'bg-emerald-500', dot: 'bg-emerald-500 text-white', hex: '#10b981' },
    { bar: 'bg-rose-500', dot: 'bg-rose-500 text-white', hex: '#f43f5e' },
  ];

  // =========================================================================
  // UPGRADED GANTT CHART WITH WEEK / MONTH / QUARTER ZOOM + TODAY LINE
  // =========================================================================
  const renderGanttChart = () => {
    const today = new Date();
    const columns: { label: string; subLabel?: string; start: number; end: number }[] = [];

    if (ganttZoom === 'week') {
      // Find Monday of 2 weeks ago, render 10 weeks
      const dayOfWeek = today.getDay() || 7;
      const baseMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek + 1 - 14);
      for (let i = 0; i < 10; i++) {
        const start = new Date(baseMonday.getTime() + i * 7 * 86400000);
        const end = new Date(start.getTime() + 7 * 86400000);
        const oneJan = new Date(start.getFullYear(), 0, 1);
        const weekNum = Math.ceil(((start.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
        columns.push({
          label: `W${weekNum}`,
          subLabel: `${start.getMonth() + 1}/${start.getDate()}`,
          start: start.getTime(),
          end: end.getTime(),
        });
      }
    } else if (ganttZoom === 'month') {
      // 7 months starting from 1 month ago
      for (let i = -1; i < 6; i++) {
        const start = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const end = new Date(today.getFullYear(), today.getMonth() + i + 1, 1);
        columns.push({
          label: `${start.getFullYear()}/${String(start.getMonth() + 1).padStart(2, '0')}`,
          start: start.getTime(),
          end: end.getTime(),
        });
      }
    } else {
      // 4 Quarters starting from current quarter - 1
      const currentQ = Math.floor(today.getMonth() / 3);
      for (let i = -1; i < 3; i++) {
        const qIndex = currentQ + i;
        const yearOffset = Math.floor(qIndex / 4);
        const normalizedQ = ((qIndex % 4) + 4) % 4;
        const year = today.getFullYear() + yearOffset;
        const start = new Date(year, normalizedQ * 3, 1);
        const end = new Date(year, normalizedQ * 3 + 3, 1);
        columns.push({
          label: `${year} Q${normalizedQ + 1}`,
          subLabel: `${normalizedQ * 3 + 1}-${normalizedQ * 3 + 3}月`,
          start: start.getTime(),
          end: end.getTime(),
        });
      }
    }

    const startTs = columns[0].start;
    const endTs = columns[columns.length - 1].end;
    const totalDuration = Math.max(1, endTs - startTs);
    const todayTs = today.getTime();
    const todayPct = ((todayTs - startTs) / totalDuration) * 100;
    const showTodayLine = todayPct >= 0 && todayPct <= 100;
    const minTableWidth = ganttZoom === 'week' ? 1040 : ganttZoom === 'month' ? 860 : 720;

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">
              BD Schedule 時間軸甘特圖
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              支援週 / 月 / 季時間尺度縮放；滿填充橫條代表當前贏率，下方彩色圓點標記各階段目標日
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Week / Month / Quarter Zoom Switcher */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              {(
                [
                  { id: 'week', label: '週 (Week)' },
                  { id: 'month', label: '月 (Month)' },
                  { id: 'quarter', label: '季 (Quarter)' },
                ] as const
              ).map(z => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setGanttZoom(z.id)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    ganttZoom === z.id
                      ? theme.badgeBg
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>

            {/* Stage Dots Toggle */}
            <label className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showStagesOnGantt}
                onChange={e => setShowStagesOnGantt(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">顯示階段圓點</span>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <div style={{ minWidth: `${minTableWidth}px` }}>
            {/* Header Row */}
            <div className="flex bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <div className="w-64 flex-shrink-0 px-4 py-3 border-r border-slate-200 dark:border-slate-800 sticky left-0 z-20 bg-slate-50 dark:bg-slate-800">
                商機與產品線 (點擊看詳情)
              </div>
              <div
                className="flex-1 grid text-center"
                style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
              >
                {columns.map(col => (
                  <div
                    key={col.start}
                    className="py-2.5 border-r last:border-r-0 border-slate-200/70 dark:border-slate-700/60"
                  >
                    <div>{col.label}</div>
                    {col.subLabel && <div className="text-[10px] font-normal text-slate-400">{col.subLabel}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Body Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {displayedOpportunities.map(opp => {
                const pLine = productLines.find(p => p.id === opp.productLineId);
                const currentStage = stages.find(s => s.id === opp.stageId);

                const schedDates = Object.values(opp.schedules || {})
                  .filter(Boolean)
                  .map(d => new Date(d).getTime())
                  .filter(ts => !Number.isNaN(ts));

                const rawStart =
                  schedDates.length > 0
                    ? Math.min(...schedDates)
                    : new Date(opp.expectedCloseDate).getTime() - 45 * 86400000;
                const rawEnd =
                  schedDates.length > 0
                    ? Math.max(...schedDates)
                    : new Date(opp.expectedCloseDate).getTime();

                const isCompletelyOutside = rawEnd < startTs || rawStart > endTs;
                const oppStart = Math.max(startTs, rawStart);
                const oppEnd = Math.min(endTs, Math.max(rawEnd, rawStart + 7 * 86400000));

                const leftPct = Math.max(0, ((oppStart - startTs) / totalDuration) * 100);
                const widthPct = isCompletelyOutside
                  ? 0
                  : Math.max(4, Math.min(100 - leftPct, ((oppEnd - oppStart) / totalDuration) * 100));

                return (
                  <div
                    key={opp.id}
                    onClick={() => handleSelectCard(opp)}
                    className="flex items-center hover:bg-slate-50/70 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    {/* Sticky Left Column */}
                    <div className="w-64 flex-shrink-0 px-4 py-3.5 border-r border-slate-200 dark:border-slate-800 sticky left-0 z-10 bg-white dark:bg-slate-900 space-y-1">
                      <p className="font-extrabold text-slate-800 dark:text-slate-100 truncate">{opp.title}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                          {pLine?.name || '未設產品線'}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${theme.accentSoftBg} ${theme.accentText}`}>
                          {currentStage?.name || '未知階段'}
                        </span>
                      </div>
                    </div>

                    {/* Timeline Cell */}
                    <div className="flex-1 h-16 relative flex items-center">
                      {/* Background Grid */}
                      <div
                        className="absolute inset-0 grid pointer-events-none"
                        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
                      >
                        {columns.map(c => (
                          <div
                            key={c.start}
                            className="border-r last:border-r-0 border-slate-100 dark:border-slate-800/60"
                          />
                        ))}
                      </div>

                      {/* Today Vertical Reference Line */}
                      {showTodayLine && (
                        <div
                          style={{ left: `${todayPct}%` }}
                          className="absolute top-0 bottom-0 w-0.5 bg-rose-500/75 z-10 pointer-events-none"
                          title={`今日：${today.toISOString().slice(0, 10)}`}
                        />
                      )}

                      {/* Full-Height Progress Bar (User's Preferred Style) */}
                      {widthPct > 0 ? (
                        <div
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          className="absolute top-2.5 h-7 rounded-lg border border-slate-300/80 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/70 overflow-hidden flex items-center shadow-xs select-none"
                        >
                          <div
                            style={{ width: `${opp.winProbability}%` }}
                            className={`h-full ${theme.progressBar} opacity-85 transition-all duration-300`}
                          />
                          <span className="absolute inset-x-0 mx-auto text-[10px] font-extrabold text-slate-800 dark:text-white pointer-events-none truncate px-2 text-center drop-shadow-xs">
                            {opp.winProbability}% | {currentStage?.name}
                          </span>
                        </div>
                      ) : (
                        <span className="mx-auto text-[10px] text-slate-400 italic">
                          排程落於目前時間視窗外（可切換「月 / 季」檢視）
                        </span>
                      )}

                      {/* Baseline + Stage Milestone Dots Below Bar */}
                      {showStagesOnGantt && (
                        <div className="absolute top-[49px] left-0 w-full h-[1px] bg-slate-200/80 dark:bg-slate-800 pointer-events-none" />
                      )}

                      {showStagesOnGantt &&
                        stages.slice(0, -1).map((st, stIdx) => {
                          const dateStr = opp.schedules?.[st.id];
                          if (!dateStr) return null;
                          const dateTs = new Date(dateStr).getTime();
                          if (dateTs < startTs || dateTs > endTs) return null;
                          const pct = ((dateTs - startTs) / totalDuration) * 100;
                          const dotClass = STAGE_COLORS[stIdx % STAGE_COLORS.length].dot;

                          return (
                            <div
                              key={st.id}
                              style={{ left: `${pct}%` }}
                              className="absolute -translate-x-1/2 top-[49px] -translate-y-1/2 flex flex-col items-center group/dot z-20"
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded-full ${dotClass} border border-white dark:border-slate-900 shadow-xs flex items-center justify-center text-[8px] font-black cursor-help hover:scale-125 transition-transform`}
                              >
                                {st.name[0]}
                              </div>
                              <div className="absolute bottom-full mb-1.5 hidden group-hover/dot:block bg-slate-950 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-30 whitespace-nowrap">
                                {st.name}: {dateStr}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}

              {displayedOpportunities.length === 0 && (
                <div className="py-12 text-center text-slate-400">目前無符合條件的銷售商機資料</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // TABLE VIEW (See all pipelines at once without horizontal scrolling)
  // =========================================================================
  const renderTableView = () => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4 font-bold">商機名稱</th>
              <th className="py-3 px-4 font-bold">客戶公司</th>
              <th className="py-3 px-4 font-bold">階段 / 贏率</th>
              <th className="py-3 px-4 font-bold">Product Line</th>
              <th className="py-3 px-4 font-bold">AI 標籤預覽</th>
              <th className="py-3 px-4 font-bold text-right">月估金額</th>
              <th className="py-3 px-4 font-bold text-right">加權金額</th>
              <th className="py-3 px-4 font-bold">負責 AM</th>
              <th className="py-3 px-4 font-bold text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayedOpportunities.map(opp => {
              const comp = companies.find(c => c.id === opp.companyId);
              const usr = users.find(u => u.id === opp.userId);
              const stgIdx = stages.findIndex(s => s.id === opp.stageId);
              const stg = stages[stgIdx];
              const pl = productLines.find(p => p.id === opp.productLineId);
              const tags = getOppTags(opp);

              return (
                <tr
                  key={opp.id}
                  onClick={() => handleSelectCard(opp)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-extrabold text-slate-800 dark:text-slate-100 max-w-[240px] truncate">
                    {opp.title}
                  </td>
                  <td
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedCompanyId(opp.companyId);
                    }}
                    className="py-3 px-4 text-slate-600 dark:text-slate-300 hover:underline"
                  >
                    {comp?.name || '未知客戶'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          STAGE_COLORS[(stgIdx >= 0 ? stgIdx : 0) % STAGE_COLORS.length].bar
                        }`}
                      />
                      {stg?.name || '未知'} ({opp.winProbability}%)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{pl?.name || '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {tags.length > 0 ? (
                        tags.map(t => (
                          <span
                            key={t.label}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getTagToneClass(t.tone)}`}
                          >
                            ✦ #{t.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                    {formatCompactCurrency(opp.amount)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono font-bold ${theme.accentText}`}>
                    {formatCompactCurrency(Math.round(opp.amount * (opp.winProbability / 100)))}
                  </td>
                  <td
                    onClick={e => {
                      e.stopPropagation();
                      if (usr) {
                        setSelectedUserForPerf(usr);
                        setIsPerfModalOpen(true);
                      }
                    }}
                    className="py-3 px-4 text-slate-600 dark:text-slate-300 hover:underline"
                  >
                    {usr?.name.split(' ')[0] || '未指派'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        openModal(opp);
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300"
                      title="編輯此商機"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {displayedOpportunities.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  目前篩選條件下無商機資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Stages displayed in Kanban (optionally hide last stage BD Loss)
  const visibleKanbanStages =
    hideLossStage && stages.length > 1 ? stages.slice(0, -1) : stages;

  // Dynamic column width: Variant B has maximum width so columns can sit compactly side by side!
  const kanbanColumnWidthClass =
    variant === 'B'
      ? cardDensity === 'compact'
        ? 'w-56'
        : 'w-64'
      : cardDensity === 'compact'
        ? 'w-64'
        : 'w-72';

  return (
    <div className="space-y-4">
      {/* Top Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Switcher: Kanban / Table / Gantt */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setSubTab('pipeline')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                subTab === 'pipeline'
                  ? `bg-white dark:bg-slate-950 ${theme.accentText} shadow-xs`
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <KanbanSquare className="w-3.5 h-3.5" /> 看板
            </button>
            <button
              type="button"
              onClick={() => setSubTab('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                subTab === 'table'
                  ? `bg-white dark:bg-slate-950 ${theme.accentText} shadow-xs`
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" /> 表格清單
            </button>
            <button
              type="button"
              onClick={() => setSubTab('schedule')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                subTab === 'schedule'
                  ? `bg-white dark:bg-slate-950 ${theme.accentText} shadow-xs`
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <GanttChartSquare className="w-3.5 h-3.5" /> BD Schedule
            </button>
          </div>

          {/* Kanban-only Density & Hide Loss Controls */}
          {subTab === 'pipeline' && (
            <>
              <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setCardDensity('normal')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    cardDensity === 'normal'
                      ? 'bg-white dark:bg-slate-950 text-slate-800 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  標準卡片
                </button>
                <button
                  type="button"
                  onClick={() => setCardDensity('compact')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    cardDensity === 'compact'
                      ? 'bg-white dark:bg-slate-950 text-slate-800 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  精簡高密
                </button>
              </div>

              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideLossStage}
                  onChange={e => setHideLossStage(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>隱藏流失欄</span>
              </label>
            </>
          )}
        </div>

        {/* Slicers + Export + Add Button */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-end">
          {currentUser?.role !== 'AM' && (
            <div className="flex items-center gap-1.5">
              <FolderTree className={`w-4 h-4 ${theme.accentText}`} />
              <select
                value={selectedOrgId}
                onChange={e => setSelectedOrgId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="" className="bg-white dark:bg-slate-950">所有部門</option>
                {renderOrgOptions(null)}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Building2 className={`w-4 h-4 ${theme.accentText}`} />
            <select
              value={selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="" className="bg-white dark:bg-slate-950">所有客戶公司</option>
              {companies.map(c => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-950">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportPipeline}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出</span>
          </button>

          <button
            onClick={() => openModal(null)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${theme.primaryBtn}`}
          >
            <Plus className="w-4 h-4" />
            <span>新增商機</span>
          </button>
        </div>
      </div>

      {/* Variant C Optional AI Tag Quick Filter Strip */}
      {variant === 'C' && allDetectedTagLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className={`text-xs font-extrabold inline-flex items-center gap-1 mr-1 ${theme.accentText}`}>
            <Sparkles className="w-3.5 h-3.5" /> AI 標籤快篩：
          </span>
          <button
            onClick={() => setAiTagFilter('')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
              aiTagFilter === ''
                ? theme.activeNav
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            全部 ({opportunities.length})
          </button>
          {allDetectedTagLabels.map(lbl => (
            <button
              key={lbl}
              onClick={() => setAiTagFilter(aiTagFilter === lbl ? '' : lbl)}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                aiTagFilter === lbl
                  ? theme.activeNav
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              ✦ #{lbl}
            </button>
          ))}
        </div>
      )}

      {/* Main View Content */}
      {subTab === 'pipeline' && (
        <div className="space-y-3">
          {/* Stage Minimap Bar + Prominent Left/Right Horizontal Scroll Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <span className="text-[11px] font-bold text-slate-400 flex-shrink-0 mr-1">
                階段速覽：
              </span>
              {visibleKanbanStages.map((st, idx) => {
                const stOpps = displayedOpportunities.filter(o => o.stageId === st.id);
                const stSum = stOpps.reduce((sum, o) => sum + o.amount, 0);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => scrollToStageColumn(st.id)}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all"
                  >
                    <span className={`w-2 h-2 rounded-full ${STAGE_COLORS[idx % STAGE_COLORS.length].bar}`} />
                    <span>{st.name}</span>
                    <span className="text-[11px] px-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                      {stOpps.length} · {stSum >= 10000 ? `${(stSum / 10000).toFixed(0)}萬` : stSum}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => scrollKanban(-320)}
                className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs"
                title="向左捲動看板"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollKanban(320)}
                className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs"
                title="向右捲動看板"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Kanban Board */}
          <div
            ref={kanbanScrollRef}
            className="flex items-start gap-3.5 overflow-x-auto pb-4 scroll-smooth"
          >
            {visibleKanbanStages.map((stage, stageIdx) => {
              const stageOpps = displayedOpportunities.filter(o => o.stageId === stage.id);
              const totalAmount = stageOpps.reduce((sum, o) => sum + o.amount, 0);
              const isOver = dragOverStageId === stage.id;
              const stageColor = STAGE_COLORS[stageIdx % STAGE_COLORS.length];

              return (
                <div
                  id={`kanban-col-${stage.id}`}
                  key={stage.id}
                  onDragOver={e => handleDragOver(e, stage.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, stage.id)}
                  className={`flex-shrink-0 ${kanbanColumnWidthClass} bg-slate-100/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 flex flex-col kanban-column ${
                    isOver ? 'drag-over' : ''
                  }`}
                >
                  {/* Colored Top Accent Bar */}
                  <div className={`h-1 rounded-full mb-2.5 ${stageColor.bar}`} />

                  {/* Stage Header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate">
                        {stage.name}
                      </span>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {stageOpps.length}
                      </span>
                    </div>
                    <button
                      onClick={() => openModal(null, stage.id)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      title="在此階段新增商機"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pb-2.5 mb-2.5 border-b border-slate-200/80 dark:border-slate-800">
                    <span>贏率 {stage.defaultWinProbability}%</span>
                    <span className={`font-bold font-mono ${theme.accentText}`}>
                      {formatCompactCurrency(totalAmount)}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2.5 min-h-[380px] overflow-y-auto pr-0.5">
                    {stageOpps.map(opp => {
                      const company = companies.find(c => c.id === opp.companyId);
                      const assignedUser = users.find(u => u.id === opp.userId);
                      const oppTags = getOppTags(opp);
                      const isDockedSelected = variant === 'C' && copilotOppId === opp.id;

                      return (
                        <div
                          key={opp.id}
                          draggable="true"
                          onDragStart={e => handleDragStart(e, opp.id)}
                          onClick={() => handleSelectCard(opp)}
                          className={`bg-white dark:bg-slate-800/90 border rounded-xl shadow-xs hover:shadow-md cursor-pointer transition-all duration-150 group relative ${
                            cardDensity === 'compact' ? 'p-2.5 pr-8' : 'p-3.5 pr-9'
                          } ${
                            isDockedSelected
                              ? `${theme.accentBorder} ring-2 ring-violet-500/30`
                              : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-500'
                          }`}
                        >
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              openModal(opp);
                            }}
                            className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
                            title="編輯此商機"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 leading-snug group-hover:underline">
                            {opp.title}
                          </h4>

                          <div
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedCompanyId(opp.companyId);
                            }}
                            className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-blue-500 mt-1.5 cursor-pointer"
                            title="點擊以過濾此客戶商機"
                          >
                            <Building2 className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate hover:underline">{company?.name || '未知客戶'}</span>
                          </div>

                          {/* AI Tag preview chips on Standard Cards */}
                          {cardDensity === 'normal' && oppTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {oppTags.slice(0, 2).map(t => (
                                <span
                                  key={t.label}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getTagToneClass(t.tone)}`}
                                >
                                  ✦ #{t.label}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/70">
                            <div
                              onClick={e => {
                                e.stopPropagation();
                                if (assignedUser) {
                                  setSelectedUserForPerf(assignedUser);
                                  setIsPerfModalOpen(true);
                                }
                              }}
                              className="flex items-center gap-1 hover:text-blue-500 cursor-pointer"
                              title="點擊查看該業務績效與管線"
                            >
                              <UserIcon className="w-3 h-3 text-slate-400" />
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[75px] hover:underline">
                                {assignedUser?.name.split(' ')[0] || '未指派'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-extrabold font-mono text-slate-800 dark:text-slate-100">
                                {formatCompactCurrency(opp.amount)}
                              </span>
                              <span className={`ml-1 text-[10px] font-bold ${theme.accentText}`}>
                                {opp.winProbability}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {stageOpps.length === 0 && (
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl h-20 text-slate-400 text-xs">
                        無商機，可拖曳至此
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'table' && renderTableView()}
      {subTab === 'schedule' && renderGanttChart()}

      {/* 新增/編輯商機 2-Tab Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-slate-800 dark:text-white mb-5">
              {editingOpp ? '編輯商機詳情' : '新增銷售商機'}
            </h3>

            <div className="flex border-b border-slate-100 dark:border-slate-800 mb-5 text-center">
              <button
                type="button"
                onClick={() => setModalTab('info')}
                className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  modalTab === 'info'
                    ? `${theme.accentText} border-current`
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                BD Info (基本資料)
              </button>
              <button
                type="button"
                onClick={() => setModalTab('schedule_budget')}
                className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  modalTab === 'schedule_budget'
                    ? `${theme.accentText} border-current`
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Schedule & Budget (排程預算)
              </button>
            </div>

            <form onSubmit={handleSaveOpportunity} className="space-y-4">
              {modalTab === 'info' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                      商機名稱 *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="例如: TSMC MES 升級系統授權"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">客戶公司 *</label>
                      <button
                        type="button"
                        onClick={() => setInlineNewCompany(!inlineNewCompany)}
                        className={`text-xs font-bold hover:underline ${theme.accentText}`}
                      >
                        {inlineNewCompany ? '← 選擇現有客戶' : '+ 直接建立新客戶'}
                      </button>
                    </div>
                    {inlineNewCompany ? (
                      <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                        <input
                          type="text"
                          required
                          placeholder="新客戶公司名稱 *"
                          value={inlineCompName}
                          onChange={e => setInlineCompName(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="產業別"
                          value={inlineCompIndustry}
                          onChange={e => setInlineCompIndustry(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={companyId}
                          onChange={e => setCompanyId(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                        >
                          {companies.map(c => (
                            <option key={c.id} value={c.id} className="bg-white dark:bg-slate-950">
                              {c.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={userId}
                          onChange={e => setUserId(e.target.value)}
                          disabled={currentUser?.role === 'AM'}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs disabled:opacity-60"
                        >
                          {users.map(u => (
                            <option key={u.id} value={u.id} className="bg-white dark:bg-slate-950">
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        Product Line *
                      </label>
                      <select
                        value={productLineId}
                        onChange={e => setProductLineId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                      >
                        {productLines.map(p => (
                          <option key={p.id} value={p.id} className="bg-white dark:bg-slate-950">
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        每月數量 *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="如: 10"
                        value={monthlyQuantity}
                        onChange={e => setMonthlyQuantity(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        預估銷售單價 *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="如: 50000"
                        value={unitPrice}
                        onChange={e => setUnitPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                      />
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${theme.accentSoftBg} ${theme.accentBorder}`}>
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Case Revenue per month (NTD)
                    </span>
                    <div className={`text-lg font-black font-mono mt-0.5 ${theme.accentText}`}>
                      NT$ {((parseInt(monthlyQuantity) || 0) * (parseFloat(unitPrice) || 0)).toLocaleString()}
                    </div>
                  </div>

                  {editingOpp && (
                    <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-center">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 mb-0.5">銷售階段</span>
                        <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                          {stages.find(s => s.id === stageId)?.name || '未知'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 mb-0.5">目前贏率</span>
                        <span className="text-[11px] font-extrabold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-lg">
                          {winProbability}%
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 mb-0.5">預估結案日</span>
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg ${theme.accentSoftBg} ${theme.accentText}`}>
                          {expectedCloseDate || '未定'}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Calendar className={`w-3.5 h-3.5 ${theme.accentText}`} /> 各銷售階段預定時程 (Schedule)
                    </span>
                    <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1 border border-slate-200 dark:border-slate-800 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50">
                      {stages.slice(0, -1).map(st => (
                        <div key={st.id} className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                            {st.name}
                          </label>
                          <input
                            type="date"
                            value={oppSchedules[st.id] || ''}
                            onChange={e => setOppSchedules({ ...oppSchedules, [st.id]: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Coins className={`w-3.5 h-3.5 ${theme.accentText}`} /> 預算費用配置 (Budgets)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setOppBudgets([...oppBudgets, { budgetItemId: budgetItems[0]?.id || '', amount: 0 }])
                        }
                        className={`text-xs font-bold flex items-center gap-1 ${theme.accentText}`}
                      >
                        <Plus className="w-3.5 h-3.5" /> 新增預算
                      </button>
                    </div>
                    <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1">
                      {oppBudgets.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <select
                            value={b.budgetItemId}
                            onChange={e => {
                              const next = [...oppBudgets];
                              next[idx].budgetItemId = e.target.value;
                              setOppBudgets(next);
                            }}
                            className="flex-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                          >
                            {budgetItems.map(item => (
                              <option key={item.id} value={item.id} className="bg-white dark:bg-slate-950">
                                {item.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="費用 (NTD)"
                            value={b.amount || ''}
                            onChange={e => {
                              const next = [...oppBudgets];
                              next[idx].amount = parseInt(e.target.value) || 0;
                              setOppBudgets(next);
                            }}
                            className="w-28 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setOppBudgets(oppBudgets.filter((_, i) => i !== idx))}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {oppBudgets.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic py-1 pl-1">目前無配置預算項目費用</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                {editingOpp ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteOpportunity(editingOpp.id)}
                    className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 font-bold border border-rose-200 dark:border-rose-900 px-3 py-2 rounded-xl"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>刪除商機</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold"
                  >
                    取消
                  </button>
                  <button type="submit" className={`px-5 py-2 rounded-xl text-xs font-bold ${theme.primaryBtn}`}>
                    儲存
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 商機時程與活動歷程 Drawer (Used in Variants A & B) */}
      {isDrawerOpen && selectedOppForDrawer && (() => {
        const company = companies.find(c => c.id === selectedOppForDrawer.companyId);
        const assignedUser = users.find(u => u.id === selectedOppForDrawer.userId);
        const tags = getOppTags(selectedOppForDrawer);
        return (
          <>
            <div
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40"
              onClick={() => setIsDrawerOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 w-[480px] max-w-full bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-800">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white leading-snug">
                    {selectedOppForDrawer.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" /> {company?.name}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${theme.accentSoftBg} ${theme.accentText}`}>
                      <UserIcon className="w-3 h-3" /> AM: {assignedUser?.name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(t => (
                      <span
                        key={t.label}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getTagToneClass(t.tone)}`}
                      >
                        ✦ #{t.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-2.5">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    排程里程碑 (Target Schedules)
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-950/30 rounded-2xl">
                    <div className="relative pl-6 border-l border-slate-200 dark:border-slate-700 space-y-3.5">
                      {stages.slice(0, -1).map(st => {
                        const dateStr = selectedOppForDrawer.schedules?.[st.id];
                        const isActive = selectedOppForDrawer.stageId === st.id;
                        return (
                          <div key={st.id} className="relative">
                            <div
                              className={`absolute -left-[29px] top-0.5 w-3.5 h-3.5 rounded-full border-2 ${
                                isActive
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'
                              }`}
                            />
                            <div className="flex justify-between items-center text-xs">
                              <span
                                className={`font-bold ${
                                  isActive ? theme.accentText : 'text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {st.name}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono font-bold">
                                {dateStr || '未定日期'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    快速登記活動 (Add Activity)
                  </h4>
                  <form
                    onSubmit={handleSaveQuickActivity}
                    className="space-y-3 border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-950/30 rounded-2xl text-xs"
                  >
                    <input
                      type="text"
                      required
                      placeholder="例如: 前往拜訪客戶、確認報價與 POC 時程..."
                      value={quickActDesc}
                      onChange={e => setQuickActDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={quickActType}
                        onChange={e => setQuickActType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                      >
                        {activityTypes.map(t => (
                          <option key={t.id} value={t.name} className="bg-white dark:bg-slate-950">
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="datetime-local"
                        required
                        value={quickActDueDate}
                        onChange={e => setQuickActDueDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-1 ${theme.primaryBtn}`}
                    >
                      <Plus className="w-3.5 h-3.5" /> <span>送出登記</span>
                    </button>
                  </form>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    歷史活動與任務紀錄 ({drawerActivities.length})
                  </h4>
                  <div className="space-y-2.5">
                    {drawerActivities.length > 0 ? (
                      drawerActivities.map(act => {
                        const toggleComplete = async () => {
                          await db.saveActivity({ ...act, isCompleted: !act.isCompleted });
                          loadDrawerActivities(selectedOppForDrawer.id);
                          bumpDataVersion();
                        };
                        return (
                          <div
                            key={act.id}
                            className="p-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-start gap-2.5 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={act.isCompleted}
                              onChange={toggleComplete}
                              className="mt-0.5 rounded text-blue-600 cursor-pointer w-3.5 h-3.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p
                                className={`font-semibold ${
                                  act.isCompleted
                                    ? 'text-slate-400 line-through'
                                    : 'text-slate-800 dark:text-slate-100'
                                }`}
                              >
                                {act.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 font-bold rounded">
                                  {act.type}
                                </span>
                                <span className="font-mono font-bold text-rose-500/90">期限: {act.dueDate}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-6">目前無任何活動紀錄</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* 業務個人業績與管線 Mini-Modal */}
      {isPerfModalOpen && selectedUserForPerf && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsPerfModalOpen(false)}
          />
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl z-50 w-[520px] max-w-full flex flex-col relative text-slate-800 dark:text-slate-100">
            <button
              onClick={() => setIsPerfModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${theme.badgeBg}`}>
                {selectedUserForPerf.name[0]}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  {selectedUserForPerf.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedUserForPerf.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 my-4">
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  負責管線商機
                </span>
                <p className={`text-lg font-black mt-1 ${theme.accentText}`}>{amOpps.length} 個</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  預估加權業績
                </span>
                <p className="text-lg font-black text-emerald-500 dark:text-emerald-400 mt-1">
                  {formatCompactCurrency(
                    amOpps.reduce((sum, o) => sum + o.amount * (o.winProbability / 100), 0)
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                管線商機列表 (Pipelines)
              </h4>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {amOpps.length > 0 ? (
                  amOpps.map(opp => {
                    const stage = stages.find(s => s.id === opp.stageId);
                    return (
                      <div
                        key={opp.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{opp.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">階段: {stage?.name || '未知'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-slate-800 dark:text-slate-100">
                            {formatCompactCurrency(opp.amount)}
                          </p>
                          <p className={`text-[10px] font-bold mt-0.5 ${theme.accentText}`}>
                            贏率: {opp.winProbability}%
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic py-6 text-center">
                    該業務目前無負責任何進行中商機
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
