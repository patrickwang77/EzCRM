import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/db';
import type { Stage, Opportunity, User, Company, Organization, ProductLine, BudgetItemConfig, ActivityTypeConfig, Activity } from '../services/db';
import { 
  Plus, 
  Trash2, 
  User as UserIcon, 
  Building2,
  X,
  FolderTree,
  Edit3,
  Calendar,
  Coins
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const Pipeline: React.FC = () => {
  const { currentUser } = useAuth();
  
  // Slicers State
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // 子頁籤分流 (Pipeline 看板 vs BD Schedule 甘特圖)
  const [subTab, setSubTab] = useState<'pipeline' | 'schedule'>('pipeline');

  // DB States
  const [stages, setStages] = useState<Stage[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItemConfig[]>([]);
  
  // Drag state
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [modalTab, setModalTab] = useState<'info' | 'schedule_budget'>('info');
  
  // Form fields
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [userId, setUserId] = useState('');
  const [stageId, setStageId] = useState('');
  const [winProbability, setWinProbability] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');

  // 擴充欄位 Form states
  const [productLineId, setProductLineId] = useState('');
  const [monthlyQuantity, setMonthlyQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [oppSchedules, setOppSchedules] = useState<{ [stageId: string]: string }>({});
  const [oppBudgets, setOppBudgets] = useState<{ budgetItemId: string; amount: number }[]>([]);
  const [showStagesOnGantt, setShowStagesOnGantt] = useState(true);

  // 新的卡片互動與多維度連動 states
  const [selectedOppForDrawer, setSelectedOppForDrawer] = useState<Opportunity | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerActivities, setDrawerActivities] = useState<Activity[]>([]);
  const [selectedUserForPerf, setSelectedUserForPerf] = useState<User | null>(null);
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
  const [amOpps, setAmOpps] = useState<Opportunity[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeConfig[]>([]);

  // Drawer 快速新增活動 Form
  const [quickActDesc, setQuickActDesc] = useState('');
  const [quickActType, setQuickActType] = useState('');
  const [quickActDueDate, setQuickActDueDate] = useState('');

  const loadDrawerActivities = async (oppId: string) => {
    try {
      const allActs = await db.getActivities();
      const filtered = allActs.filter(a => a.opportunityId === oppId).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
      setDrawerActivities(filtered);
    } catch (err) {
      console.error('Failed to load drawer activities', err);
    }
  };

  useEffect(() => {
    if (selectedOppForDrawer) {
      loadDrawerActivities(selectedOppForDrawer.id);
    }
  }, [selectedOppForDrawer]);

  const loadAmOpps = async (amId: string) => {
    try {
      const allOpps = await db.getOpportunities('ADMIN', '', {});
      const filtered = allOpps.filter(o => o.userId === amId);
      setAmOpps(filtered);
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
    } catch (err) {
      console.error('Failed to save quick activity', err);
    }
  };

  const loadData = async () => {
    if (!currentUser) return;
    try {
      const filters = {
        orgId: selectedOrgId || undefined,
        companyId: selectedCompanyId || undefined
      };

      const activeStages = await db.getStages(true);
      const opps = await db.getOpportunities(currentUser.role, currentUser.id, filters);
      const comps = await db.getCompanies();
      const orgs = await db.getOrganizations();
      const usrs = await db.getUsers();
      const prods = await db.getProductLines();
      const bgItems = await db.getBudgetItems();
      const actTypes = await db.getActivityTypes();

      setStages(activeStages);
      setOpportunities(opps);
      setCompanies(comps);
      setOrganizations(orgs);
      setUsers(usrs);
      setProductLines(prods);
      setBudgetItems(bgItems);
      setActivityTypes(actTypes);
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
  }, [currentUser, selectedOrgId, selectedCompanyId]);

  useEffect(() => {
    const focusCompId = sessionStorage.getItem('autofocus_company_id');
    if (focusCompId) {
      setSelectedCompanyId(focusCompId);
      sessionStorage.removeItem('autofocus_company_id');
    }
  }, [opportunities]);

  // 開啟新增/編輯 Modal
  const openModal = (opp: Opportunity | null = null, defaultStageId?: string) => {
    setModalTab('info');
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
      // 如果是 AM 則鎖定為自己，其他人預設為第一個業務
      setUserId(currentUser?.role === 'AM' ? currentUser.id : users.find(u => u.role === 'AM')?.id || currentUser?.id || '');
      
      const targetStageId = defaultStageId || stages[0]?.id || '';
      setStageId(targetStageId);
      
      // 自動帶入預設贏率
      const stage = stages.find(s => s.id === targetStageId);
      setWinProbability(stage ? stage.defaultWinProbability.toString() : '10');
      
      setProductLineId(productLines[0]?.id || '');
      setMonthlyQuantity('');
      setUnitPrice('');
      setOppSchedules({});
      setOppBudgets([]);
      
      // 預設將今天的日期設為 Leads 階段的排程日期
      if (targetStageId) {
        setOppSchedules({ [targetStageId]: new Date().toISOString().split('T')[0] });
      }
      setExpectedCloseDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 預設 30 天後
    }
    setIsModalOpen(true);
  };

  // 儲存商機
  const handleSaveOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !title || !companyId || !userId) {
      alert('請填寫所有必要欄位');
      return;
    }

    const numericQty = parseInt(monthlyQuantity) || 0;
    const numericPrice = parseFloat(unitPrice) || 0;
    const calculatedAmount = numericQty * numericPrice;

    // 結案日期同步：預設為最後一個設定了排程的階段日期
    let latestDate = expectedCloseDate;
    const sortedStagesDesc = [...stages].sort((a, b) => b.displayOrder - a.displayOrder);
    for (const s of sortedStagesDesc) {
      if (oppSchedules[s.id]) {
        latestDate = oppSchedules[s.id];
        break;
      }
    }

    const currentStageId = editingOpp ? editingOpp.stageId : stageId;
    const currentWinProb = editingOpp ? editingOpp.winProbability : (stages.find(s => s.id === currentStageId)?.defaultWinProbability || 10);

    const oppData: Opportunity = {
      id: editingOpp ? editingOpp.id : `opp-${Date.now()}`,
      companyId,
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
      budgets: oppBudgets
    };

    try {
      await db.saveOpportunity(oppData);
      
      // 灑花特效：如果新設的階段為「贏得交易 (成交)」且之前不是這個階段
      const activeStages = [...stages].sort((a, b) => a.displayOrder - b.displayOrder);
      const wonStageId = activeStages[activeStages.length - 2]?.id || 'stage-5'; // 倒數第二個
      if (currentStageId === wonStageId && (!editingOpp || editingOpp.stageId !== wonStageId)) {
        triggerConfetti();
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to save opportunity', err);
    }
  };

  // 刪除商機
  const handleDeleteOpportunity = async (id: string) => {
    if (!window.confirm('確定要刪除此商機嗎？這也會一併刪除關聯的活動紀錄！')) return;
    try {
      await db.deleteOpportunity(id);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to delete opportunity', err);
    }
  };

  // 灑花特效實作
  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  // --- Drag & Drop 事件 ---
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
        
        // 贏率連動：自動更新為該階段的 defaultWinProbability
        const stage = stages.find(s => s.id === targetStageId);
        if (stage) {
          opp.winProbability = stage.defaultWinProbability;
        }

        await db.saveOpportunity(opp);

        // 成交灑花 (對應預設成交 id = 'stage-5'，或贏率等於 100 時)
        if (targetStageId === 'stage-5' && originalStageId !== 'stage-5') {
          triggerConfetti();
        }

        loadData();
      }
    } catch (err) {
      console.error('Failed to update stage on drop', err);
    }
  };

  // 輔助格式化金額
  const formatCompactCurrency = (value: number) => {
    if (value >= 10000) {
      return `NT$ ${(value / 10000).toFixed(0)} 萬`;
    }
    return `NT$ ${value}`;
  };

  // Render Indented Org Options for Slicer
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
  };

  const renderGanttChart = () => {
    // 時間刻度設定：當前月份及後續 5 個月，共 6 個月
    const today = new Date();
    const months: Date[] = [];
    for (let i = -1; i < 5; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push(d);
    }

    const formatMonthStr = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    // 時間起點與終點時間戳
    const startTs = months[0].getTime();
    const endTs = new Date(months[months.length - 1].getFullYear(), months[months.length - 1].getMonth() + 1, 1).getTime();
    const totalDuration = endTs - startTs;

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-md font-extrabold text-slate-800 dark:text-white">BD Schedule 時間軸甘特圖</h3>
            <p className="text-xs text-slate-400 mt-1">展示各商機在不同銷售階段的預定時程與當前贏率進度</p>
          </div>
          
          {/* 開關：顯示/不顯示銷售階段 */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <input
              type="checkbox"
              id="toggleStagesGantt"
              checked={showStagesOnGantt}
              onChange={(e) => setShowStagesOnGantt(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-350 dark:border-slate-850 cursor-pointer"
            />
            <label htmlFor="toggleStagesGantt" className="text-xs font-bold text-slate-650 dark:text-slate-300 cursor-pointer select-none">
              顯示銷售階段時程點
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px] border border-slate-100 dark:border-slate-800/85 rounded-2xl overflow-hidden">
            {/* 甘特圖表頭：時間刻度 */}
            <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">
              <div className="col-span-3 px-4">商機與產品線 (當前階段)</div>
              <div className="col-span-9 grid grid-cols-6 text-center border-l border-slate-200 dark:border-slate-800">
                {months.map(m => (
                  <div key={m.getTime()} className="border-r last:border-r-0 border-slate-200 dark:border-slate-800/60 py-0.5">
                    {formatMonthStr(m)}
                  </div>
                ))}
              </div>
            </div>

            {/* 甘特圖內容列 */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {opportunities.map(opp => {
                const pLine = productLines.find(p => p.id === opp.productLineId);
                const currentStage = stages.find(s => s.id === opp.stageId);
                
                // 找出商機排程的最早與最晚日期
                const schedDates = Object.values(opp.schedules || {}).filter(Boolean).map(d => new Date(d).getTime());
                let oppStart = schedDates.length > 0 ? Math.min(...schedDates) : new Date(opp.expectedCloseDate).getTime() - 60*24*60*60*1000;
                let oppEnd = schedDates.length > 0 ? Math.max(...schedDates) : new Date(opp.expectedCloseDate).getTime();
                
                // 防呆邊界保護
                if (oppStart < startTs) oppStart = startTs;
                if (oppEnd > endTs) oppEnd = endTs;
                if (oppEnd < oppStart) oppEnd = oppStart + 30*24*60*60*1000;

                // 計算條形 left 與 width 百分比
                const leftPct = Math.max(0, ((oppStart - startTs) / totalDuration) * 100);
                const widthPct = Math.min(100 - leftPct, ((oppEnd - oppStart) / totalDuration) * 100);

                return (
                  <div key={opp.id} className="grid grid-cols-12 items-center hover:bg-slate-50/40 dark:hover:bg-slate-850/20 py-4 font-semibold">
                    {/* 商機資訊區 (3格) */}
                    <div className="col-span-3 px-4 space-y-1">
                      <p className="font-extrabold text-slate-800 dark:text-slate-100 truncate">{opp.title}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 px-1.5 py-0.5 rounded border border-indigo-150 dark:border-indigo-900/35">
                          {pLine?.name || '未知產品線'}
                        </span>
                        <span className="text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-150 dark:border-emerald-900/35">
                          {currentStage?.name || '未知階段'}
                        </span>
                      </div>
                    </div>

                    {/* 時間軸條形圖 (9格) - 高度改為 h-16 以包容下方圓點線 */}
                    <div className="col-span-9 h-16 relative flex items-center border-l border-slate-200 dark:border-slate-800 text-center">
                      {/* 背景虛線輔助 */}
                      <div className="absolute inset-0 grid grid-cols-6 pointer-events-none divide-x divide-slate-150 dark:divide-slate-800/40 h-full w-full" />
                      
                      {/* 橫向甘特條形 - 恢復前一版 h-7 高度填充 */}
                      {widthPct > 0 && (
                        <div 
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          className="absolute top-2.5 h-7 rounded-lg border border-sky-200 dark:border-sky-850 bg-sky-50/20 dark:bg-sky-950/15 overflow-hidden flex items-center shadow-sm select-none group"
                        >
                          {/* 進度填充度：恢復為 h-full */}
                          <div 
                            style={{ width: `${opp.winProbability}%` }}
                            className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 opacity-80 rounded-l-lg transition-all duration-300"
                          />
                          {/* 浮動標註當前進度與階段 */}
                          <span className="absolute inset-x-0 mx-auto text-[9px] font-extrabold text-slate-700 dark:text-slate-200 pointer-events-none drop-shadow-sm truncate px-2 text-center">
                            {opp.winProbability}% 贏率 | {currentStage?.name}
                          </span>
                        </div>
                      )}

                      {/* 時程點連接基準線 (Bar下方) */}
                      {showStagesOnGantt && (
                        <div className="absolute top-[48px] left-0 w-full h-[1px] bg-slate-100 dark:bg-slate-800 pointer-events-none" />
                      )}

                      {/* 彩色圓點：各銷售階段的日期位置 (Bar下方，水平基準線上) */}
                      {showStagesOnGantt && stages.slice(0, -1).map((st, stIdx) => {
                        const dateStr = opp.schedules?.[st.id];
                        if (!dateStr) return null;
                        const dateTs = new Date(dateStr).getTime();
                        
                        // 計算在整個 6 個月 timeline 容器中的絕對百分比位置
                        const pct = Math.max(0, Math.min(100, ((dateTs - startTs) / totalDuration) * 100));

                        const colors = [
                          'bg-sky-500 text-white',
                          'bg-purple-500 text-white',
                          'bg-amber-500 text-white',
                          'bg-pink-500 text-white',
                          'bg-emerald-500 text-white',
                          'bg-rose-500 text-white'
                        ];
                        const colorClass = colors[stIdx % colors.length];

                        return (
                          <div 
                            key={st.id}
                            style={{ left: `${pct}%` }}
                            className="absolute -translate-x-1/2 top-[48px] -translate-y-1/2 flex flex-col items-center group/dot z-10"
                          >
                            <div className={`w-3.5 h-3.5 rounded-full ${colorClass} border border-white dark:border-slate-900 shadow-sm flex items-center justify-center text-[7.5px] font-black cursor-help hover:scale-110 transition-transform`}>
                              {st.name[0]}
                            </div>
                            <div className="absolute bottom-full mb-1.5 hidden group-hover/dot:block bg-slate-950 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg z-30 whitespace-nowrap">
                              {st.name}: {dateStr}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {opportunities.length === 0 && (
                <div className="py-12 text-center text-slate-400">目前無銷售商機資料</div>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Slicers 篩選面板 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">BD Pipeline</h2>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setSubTab('pipeline')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${subTab === 'pipeline' ? 'bg-white dark:bg-slate-950 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Pipeline 看板
              </button>
              <button
                type="button"
                onClick={() => setSubTab('schedule')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${subTab === 'schedule' ? 'bg-white dark:bg-slate-950 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                BD Schedule (甘特圖)
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            {subTab === 'pipeline'
              ? '您可以透過拖放卡片改變銷售階段。卡片將自動套用該階段之預設贏率。'
              : '展示各銷售商機在各銷售階段的預定時程規劃 Gantt Chart，橫條填充比例代表當前贏率。'}
          </p>
        </div>

        {/* Slicer Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          
          {/* 組織 Slicer (限 ADMIN/BU head) */}
          {currentUser?.role !== 'AM' && (
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-indigo-500" />
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">(所有部門)</option>
                {renderOrgOptions(null)}
              </select>
            </div>
          )}

          {/* 客戶 Slicer */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-500" />
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">(所有客戶公司)</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => openModal(null)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>新增商機</span>
          </button>
        </div>
      </div>

      {/* 看板主容器 / 甘特圖切換 */}
      {subTab === 'pipeline' ? (
        <div className="flex items-start gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {stages.map((stage) => {
          const stageOpps = opportunities.filter(o => o.stageId === stage.id);
          const totalAmount = stageOpps.reduce((sum, o) => sum + o.amount, 0);
          const isOver = dragOverStageId === stage.id;

          return (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`
                flex-shrink-0 w-80 bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col kanban-column
                ${isOver ? 'drag-over' : ''}
              `}
            >
              {/* 階段標題資訊 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-700 dark:text-slate-200">{stage.name}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {stageOpps.length}
                  </span>
                </div>
                <button 
                  onClick={() => openModal(null, stage.id)}
                  className="p-1 hover:bg-slate-250 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 transition-colors"
                  title="在此階段新增商機"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* 階段預設贏率 */}
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2">
                預設贏率: <span className="text-indigo-500 dark:text-indigo-400 font-extrabold">{stage.defaultWinProbability}%</span>
              </div>

              {/* 預估總金額 */}
              <div className="text-xs font-semibold text-slate-400 mb-4 border-b border-slate-250/60 dark:border-slate-800/60 pb-2">
                總預估額: <span className="text-indigo-500 dark:text-indigo-400 font-bold">{formatCompactCurrency(totalAmount)}</span>
              </div>

              {/* 卡片列表 */}
              <div className="space-y-3 min-h-[420px] overflow-y-auto pr-1">
                {stageOpps.map((opp) => {
                  const company = companies.find(c => c.id === opp.companyId);
                  const assignedUser = users.find(u => u.id === opp.userId);

                  return (
                    <div
                      key={opp.id}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, opp.id)}
                      onClick={() => {
                        setSelectedOppForDrawer(opp);
                        setIsDrawerOpen(true);
                      }}
                      className="bg-white dark:bg-slate-800 border border-slate-200/85 dark:border-slate-750 p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer hover:border-sky-500/50 dark:hover:border-sky-500/50 transition-all duration-150 group relative pr-9"
                    >
                      {/* 卡片右上角顯眼編輯按鈕 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(opp);
                        }}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-200/40 dark:border-slate-600/30 text-slate-400 hover:text-sky-500 transition-all shadow-sm"
                        title="編輯此商機"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <h4 className="text-sm font-bold text-slate-850 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors leading-snug hover:underline">
                        {opp.title}
                      </h4>
                      
                      {/* 公司資訊 - 點擊快速設定客戶篩選 */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCompanyId(opp.companyId);
                        }}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 mt-3.5 transition-colors cursor-pointer"
                        title="點擊以過濾此客戶商機"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="truncate hover:underline">{company?.name || '未知客戶'}</span>
                      </div>

                      {/* 負責人 & 預估金額 - 點擊業務開啟 mini modal */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-850">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (assignedUser) {
                              setSelectedUserForPerf(assignedUser);
                              setIsPerfModalOpen(true);
                            }
                          }}
                          className="flex items-center gap-1.5 hover:text-sky-500 dark:hover:text-sky-400 transition-colors cursor-pointer"
                          title="點擊查看該業務績效與管線"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500" />
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[80px] hover:underline">
                            {assignedUser?.name.split(' ')[0] || '未指派'}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-850 dark:text-slate-200">
                            {formatCompactCurrency(opp.amount)}
                          </p>
                          <div className="flex items-center justify-end gap-0.5 text-[10px] font-semibold text-slate-400">
                            <span>贏率 {opp.winProbability}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {stageOpps.length === 0 && (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl h-24 text-slate-400 text-xs">
                    無商機，可拖曳至此
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      ) : (
        renderGanttChart()
      )}

      {/* 新增/編輯商機 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mb-6">
              {editingOpp ? '編輯商機詳情' : '新增銷售商機'}
            </h3>

            {/* Modal Tabs 切換 */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 mb-5 text-center">
              <button
                type="button"
                onClick={() => setModalTab('info')}
                className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  modalTab === 'info'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-slate-450 hover:text-slate-600 dark:text-slate-400'
                }`}
              >
                BD Info (基本資料)
              </button>
              <button
                type="button"
                onClick={() => setModalTab('schedule_budget')}
                className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  modalTab === 'schedule_budget'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-slate-450 hover:text-slate-600 dark:text-slate-400'
                }`}
              >
                Schedule & Budget (排程預算)
              </button>
            </div>

            <form onSubmit={handleSaveOpportunity} className="space-y-4">
              
              {modalTab === 'info' ? (
                <>
                  {/* 商機標題 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">商機名稱 *</label>
                    <input
                      type="text"
                      required
                      placeholder="例如: TSMC MES 升級系統授權"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* 客戶公司 */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">客戶公司 *</label>
                      <select
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                      >
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 負責業務 */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">負責業務 *</label>
                      <select
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        disabled={currentUser?.role === 'AM'}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Product Line */}
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Product Line *</label>
                      <select
                        value={productLineId}
                        onChange={(e) => setProductLineId(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2"
                      >
                        {productLines.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 每月數量 */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">每月數量 *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="如: 10"
                        value={monthlyQuantity}
                        onChange={(e) => setMonthlyQuantity(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2"
                      />
                    </div>

                    {/* 預估銷售單價 */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">預估銷售單價 *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="如: 50000"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2"
                      />
                    </div>
                  </div>

                  {/* Case Revenue per month 自動計算 */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-850">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Case Revenue per month (NTD)</span>
                    <div className="text-lg font-black text-indigo-500 dark:text-indigo-400">
                      NT$ {((parseInt(monthlyQuantity) || 0) * (parseFloat(unitPrice) || 0)).toLocaleString()}
                    </div>
                  </div>

                  {/* 編輯模式時唯讀顯示當前進度狀態 */}
                  {editingOpp && (
                    <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-center">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 mb-0.5">銷售階段</span>
                        <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800">{stages.find(s => s.id === stageId)?.name || '未知'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 mb-0.5">目前贏率</span>
                        <span className="text-[11px] font-extrabold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">{winProbability}%</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 mb-0.5">預估結案日</span>
                        <span className="text-[11px] font-extrabold text-indigo-500 bg-indigo-550/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">{expectedCloseDate || '未定'}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* 各階段時程設定 */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-sky-500" /> 各銷售階段預定時程 (Schedule)</span>
                    <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1 border border-slate-100 dark:border-slate-850/80 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40">
                      {stages.slice(0, -1).map(st => (
                        <div key={st.id} className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">{st.name}</label>
                          <input
                            type="date"
                            value={oppSchedules[st.id] || ''}
                            onChange={(e) => setOppSchedules({ ...oppSchedules, [st.id]: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 預算配置設定 */}
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-850 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-indigo-500" /> 預算費用配置 (Budgets)</span>
                      <button
                        type="button"
                        onClick={() => setOppBudgets([...oppBudgets, { budgetItemId: budgetItems[0]?.id || '', amount: 0 }])}
                        className="text-[10px] font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> 新增預算
                      </button>
                    </div>
                    <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1">
                      {oppBudgets.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <select
                            value={b.budgetItemId}
                            onChange={(e) => {
                              const next = [...oppBudgets];
                              next[idx].budgetItemId = e.target.value;
                              setOppBudgets(next);
                            }}
                            className="flex-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs"
                          >
                            {budgetItems.map(item => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="費用 (NTD)"
                            value={b.amount || ''}
                            onChange={(e) => {
                              const next = [...oppBudgets];
                              next[idx].amount = parseInt(e.target.value) || 0;
                              setOppBudgets(next);
                            }}
                            className="w-24 px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setOppBudgets(oppBudgets.filter((_, i) => i !== idx))}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {oppBudgets.length === 0 && (
                        <p className="text-[10px] text-slate-400 italic py-1 pl-1">目前無配置預算項目費用</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 按鈕組 */}
              <div className="flex items-center justify-between pt-6 mt-2 border-t border-slate-100 dark:border-slate-800">
                {editingOpp ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteOpportunity(editingOpp.id)}
                    className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 font-bold border border-rose-200 hover:border-rose-300 dark:border-rose-900 px-3.5 py-2 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>刪除商機</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-semibold rounded-xl text-sm hover:from-sky-700 hover:to-indigo-700 shadow-md shadow-sky-600/10 transition-colors"
                  >
                    儲存
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 商機時程與活動歷程 Drawer */}
      {isDrawerOpen && selectedOppForDrawer && (() => {
        const company = companies.find(c => c.id === selectedOppForDrawer.companyId);
        const assignedUser = users.find(u => u.id === selectedOppForDrawer.userId);
        return (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setIsDrawerOpen(false)}
            />
            {/* Drawer Panel */}
            <div className="fixed inset-y-0 right-0 w-[500px] max-w-full bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 translate-x-0 border-l border-slate-200 dark:border-slate-800">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white leading-snug">{selectedOppForDrawer.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-655 dark:text-slate-350 px-2 py-0.5 rounded flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" /> {company?.name}
                    </span>
                    <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 px-2 py-0.5 rounded flex items-center gap-1">
                      <UserIcon className="w-3 h-3 text-indigo-400" /> AM: {assignedUser?.name}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. 排程時間軸 */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">排程里程碑 (Target Schedules)</h4>
                  <div className="border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl">
                    <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-4">
                      {stages.slice(0, -1).map(st => {
                        const dateStr = selectedOppForDrawer.schedules?.[st.id];
                        const isActive = selectedOppForDrawer.stageId === st.id;
                        return (
                          <div key={st.id} className="relative">
                            <div className={`absolute -left-[29px] top-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${isActive ? 'bg-indigo-500 border-indigo-500 animate-pulse' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'}`} />
                            <div className="flex justify-between items-center text-xs">
                              <span className={`font-bold ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-600 dark:text-slate-300'}`}>{st.name}</span>
                              <span className="text-[11px] text-slate-400 font-mono font-bold">{dateStr || '未定日期'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. 快速新增活動 */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">快速登記活動 (Add Activity)</h4>
                  <form onSubmit={handleSaveQuickActivity} className="space-y-3 border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl text-xs">
                    <div>
                      <input 
                        type="text" required placeholder="例如: 前往拜訪客戶、提供第二版簡報描述..."
                        value={quickActDesc}
                        onChange={(e) => setQuickActDesc(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={quickActType}
                        onChange={(e) => setQuickActType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-sky-500"
                      >
                        {activityTypes.map(t => (
                          <option key={t.id} value={t.name} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">{t.name}</option>
                        ))}
                      </select>
                      <input 
                        type="datetime-local" required
                        value={quickActDueDate}
                        onChange={(e) => setQuickActDueDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow transition-all flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> <span>送出登記</span>
                    </button>
                  </form>
                </div>

                {/* 3. 歷史活動列表 */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">歷史活動與任務紀錄</h4>
                  <div className="space-y-3">
                    {drawerActivities.length > 0 ? (
                      drawerActivities.map(act => {
                        const toggleComplete = async () => {
                          const updated = { ...act, isCompleted: !act.isCompleted };
                          await db.saveActivity(updated);
                          loadDrawerActivities(selectedOppForDrawer.id);
                        };
                        return (
                          <div key={act.id} className="p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl flex items-start gap-2.5 shadow-sm text-xs">
                            <input 
                              type="checkbox"
                              checked={act.isCompleted}
                              onChange={toggleComplete}
                              className="mt-0.5 rounded text-sky-600 focus:ring-sky-500 border-slate-350 dark:border-slate-800 cursor-pointer w-3.5 h-3.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold ${act.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>{act.description}</p>
                              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-450 dark:text-slate-400">
                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 font-bold rounded">{act.type}</span>
                                <span className="font-mono font-bold text-rose-500/80">期限: {act.dueDate}</span>
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

      {/* 業務個人業績與管線 Modal */}
      {isPerfModalOpen && selectedUserForPerf && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsPerfModalOpen(false)}
          />
          {/* Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-50 w-[520px] max-w-full flex flex-col relative animate-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
            <button 
              onClick={() => setIsPerfModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Avatar & Header */}
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-sky-600/10">
                {selectedUserForPerf.name[0]}
              </div>
              <div>
                <h3 className="text-md font-extrabold text-slate-800 dark:text-slate-100">{selectedUserForPerf.name}</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-400 font-mono mt-0.5">{selectedUserForPerf.email}</p>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 my-5">
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">負責管線商機</span>
                <p className="text-lg font-black text-indigo-500 dark:text-indigo-400 mt-1">{amOpps.length} 個</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">預估加權業績</span>
                <p className="text-lg font-black text-emerald-500 dark:text-emerald-400 mt-1">
                  {formatCompactCurrency(amOpps.reduce((sum, o) => sum + (o.amount * (o.winProbability / 100)), 0))}
                </p>
              </div>
            </div>

            {/* Opportunity list */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">管線商機列表 (Pipelines)</h4>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {amOpps.length > 0 ? (
                  amOpps.map(opp => {
                    const stage = stages.find(s => s.id === opp.stageId);
                    return (
                      <div key={opp.id} className="p-3 bg-slate-50/50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-xl flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-200">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{opp.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">階段: {stage?.name || '未知'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-slate-850 dark:text-slate-100">{formatCompactCurrency(opp.amount)}</p>
                          <p className="text-[9px] font-bold text-indigo-500 mt-0.5">贏率: {opp.winProbability}%</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic py-6 text-center">該業務目前無負責任何進行中商機</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
