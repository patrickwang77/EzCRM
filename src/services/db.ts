// B2B CRM Upgraded Mock Database Engine (LocalStorage-based)
import { formatLocalDate, getLocalTodayIso, parseLocalCalendarDate } from '../utils/dateUtils';

export type UserRole = 'ADMIN' | 'BU_HEAD' | 'AM';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  orgId: string | null; // 所屬組織 ID
}

export interface Organization {
  id: string;
  name: string;
  parentId: string | null; // 父組織 ID，支援多層級
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
}

export type StageOutcome = 'OPEN' | 'WON' | 'LOST';

export interface Stage {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  defaultWinProbability: number; // 預設贏率 0-100
  outcome: StageOutcome; // 明確區分進行中 / 成交 / 流失
}

export interface ActivityTypeConfig {
  id: string;
  name: string;      // 例如: '待辦任務', '會議拜訪'
  icon: string;      // 'CheckSquare' | 'Video' | 'FileText' | 'Calendar' | 'Coffee' | 'MessageSquare' | 'Coins' | 'Gift'
  color: string;     // 'amber' | 'blue' | 'emerald' | 'purple' | 'rose'
  unitCost?: number; // 選填：單次活動量化單價 (NTD)
}

export interface ProductLine {
  id: string;
  name: string;
  description: string;
}

export interface BudgetItemConfig {
  id: string;
  name: string;
}

export interface SalesTarget {
  month: string; // YYYY-MM
  targetAmount: number;
}

export interface EntityTag {
  label: string;
  source: 'manual' | 'ai';
  tone?: 'good' | 'warn' | 'risk' | 'info' | 'neutral';
}

export interface Opportunity {
  id: string;
  companyId: string;
  userId: string; // 負責業務
  stageId: string; // 目前所處階段
  title: string;
  amount: number; // Monthly Deal Revenue (每月數量 * 單價)
  winProbability: number; // 贏率 0-100
  expectedCloseDate: string;
  createdAt?: string; // YYYY-MM-DD
  closedAt?: string;  // YYYY-MM-DD (進入 WON / LOST 時寫入)
  
  productLineId: string;
  monthlyQuantity: number;
  unitPrice: number;
  orgId: string | null;
  schedules: { [stageId: string]: string };
  budgets: { budgetItemId: string; amount: number }[];
  tags?: EntityTag[]; // 預留給手動 / LLM 自動標籤
}

export interface QueryFilters {
  orgId?: string;
  companyId?: string;
  userId?: string;
  startMonth?: string; // YYYY-MM
  endMonth?: string;   // YYYY-MM
}

export interface Activity {
  id: string;
  opportunityId: string;
  userId: string;
  type: string; // 動態類型：對應 ActivityTypeConfig 的 name/id 或是原始類型
  description: string;
  dueDate: string; // 到期時間
  isCompleted: boolean;
  tags?: EntityTag[]; // 預留給手動 / LLM 自動標籤
}

// 預設 Mock 數據
const DEFAULT_ORGANIZATIONS: Organization[] = [
  { id: 'org-1', name: '總公司', parentId: null },
  { id: 'org-2', name: '銷售一部', parentId: 'org-1' },
  { id: 'org-3', name: '銷售二部', parentId: 'org-1' },
  { id: 'org-4', name: '銷售一組', parentId: 'org-2' },
];

const DEFAULT_USERS: User[] = [
  { id: 'user-1', name: '林經理 (Admin)', email: 'alice.lin@crm.com', role: 'ADMIN', orgId: 'org-1' },
  { id: 'user-2', name: '王協理 (BU head)', email: 'bob.wang@crm.com', role: 'BU_HEAD', orgId: 'org-2' },
  { id: 'user-3', name: '陳 AM (AM A)', email: 'charlie.chen@crm.com', role: 'AM', orgId: 'org-4' },
  { id: 'user-4', name: '張 AM (AM B)', email: 'david.chang@crm.com', role: 'AM', orgId: 'org-3' },
];

const DEFAULT_COMPANIES: Company[] = [
  { id: 'comp-1', name: '台灣積體電路製造 (TSMC)', industry: '半導體', createdAt: '2026-01-10' },
  { id: 'comp-2', name: '聯發科技 (MediaTek)', industry: 'IC 設計', createdAt: '2026-02-15' },
  { id: 'comp-3', name: '鴻海精密工業 (Foxconn)', industry: '電子代工', createdAt: '2026-03-01' },
  { id: 'comp-4', name: '大立光電 (Largan)', industry: '光學鏡頭', createdAt: '2026-04-20' },
];

const DEFAULT_CONTACTS: Contact[] = [
  { id: 'cont-1', companyId: 'comp-1', name: '張小明', email: 'xm.zhang@tsmc.com', phone: '0912-345-678' },
  { id: 'cont-2', companyId: 'comp-1', name: '李華', email: 'hua.li@tsmc.com', phone: '0922-111-222' },
  { id: 'cont-3', companyId: 'comp-2', name: '王大同', email: 'dt.wang@mediatek.com', phone: '0933-444-555' },
  { id: 'cont-4', companyId: 'comp-3', name: '趙四', email: 'si.zhao@foxconn.com', phone: '0988-777-666' },
];

const DEFAULT_STAGES: Stage[] = [
  { id: 'stage-1', name: '初步接洽', displayOrder: 1, isActive: true, defaultWinProbability: 10, outcome: 'OPEN' },
  { id: 'stage-2', name: '需求確認', displayOrder: 2, isActive: true, defaultWinProbability: 30, outcome: 'OPEN' },
  { id: 'stage-3', name: '方案展示', displayOrder: 3, isActive: true, defaultWinProbability: 50, outcome: 'OPEN' },
  { id: 'stage-4', name: '商務談判', displayOrder: 4, isActive: true, defaultWinProbability: 80, outcome: 'OPEN' },
  { id: 'stage-5', name: 'BD Won', displayOrder: 5, isActive: true, defaultWinProbability: 100, outcome: 'WON' },
  { id: 'stage-6', name: 'BD Lost', displayOrder: 6, isActive: true, defaultWinProbability: 100, outcome: 'LOST' },
];

const DEFAULT_ACTIVITY_TYPES: ActivityTypeConfig[] = [
  { id: 'acttype-1', name: '待辦任務', icon: 'CheckSquare', color: 'amber' },
  { id: 'acttype-2', name: '商務會議', icon: 'Calendar', color: 'blue' },
  { id: 'acttype-3', name: '餐敘交流', icon: 'Coffee', color: 'emerald' },
  { id: 'acttype-4', name: '客戶聯繫', icon: 'MessageSquare', color: 'purple' },
];

const DEFAULT_PRODUCT_LINES: ProductLine[] = [
  { id: 'prod-1', name: '製造執行系統 (MES)', description: '智慧工廠核心生產管制系統' },
  { id: 'prod-2', name: '研發人力管理系統', description: '高科技研發資源分配與時數申報' },
  { id: 'prod-3', name: '供應鏈協同平台', description: '跨國供應商採購與交期跟蹤' },
  { id: 'prod-4', name: 'AI 瑕疵檢測演算法', description: '基於深度學習的晶圓外觀缺陷分類' },
];

const DEFAULT_BUDGET_ITEMS: BudgetItemConfig[] = [
  { id: 'budget-1', name: '差旅交通費' },
  { id: 'budget-2', name: '樣品測試費' },
  { id: 'budget-3', name: '顧問授權費' },
  { id: 'budget-4', name: '行銷推廣費' },
];

const DEFAULT_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp-1',
    companyId: 'comp-1',
    userId: 'user-3',
    stageId: 'stage-3',
    title: 'TSMC 製造執行系統 (MES) 升級專案',
    amount: 5000000,
    winProbability: 50,
    expectedCloseDate: '2026-08-30',
    productLineId: 'prod-1',
    monthlyQuantity: 10,
    unitPrice: 500000,
    orgId: 'org-4',
    schedules: {
      'stage-1': '2026-06-15',
      'stage-2': '2026-07-10',
      'stage-3': '2026-08-15',
      'stage-4': '2026-09-20',
      'stage-5': '2026-10-30',
      'stage-6': '2026-11-30',
    },
    budgets: [
      { budgetItemId: 'budget-1', amount: 50000 },
      { budgetItemId: 'budget-3', amount: 300000 },
    ]
  },
  {
    id: 'opp-2',
    companyId: 'comp-2',
    userId: 'user-3',
    stageId: 'stage-1',
    title: '聯發科研發人力管理系統導入',
    amount: 1200000,
    winProbability: 10,
    expectedCloseDate: '2026-11-15',
    productLineId: 'prod-2',
    monthlyQuantity: 6,
    unitPrice: 200000,
    orgId: 'org-4',
    schedules: {
      'stage-1': '2026-07-05',
      'stage-2': '2026-08-01',
      'stage-3': '2026-09-01',
      'stage-4': '2026-10-01',
      'stage-5': '2026-11-01',
      'stage-6': '2026-12-01',
    },
    budgets: [
      { budgetItemId: 'budget-2', amount: 20000 },
    ]
  },
  {
    id: 'opp-3',
    companyId: 'comp-3',
    userId: 'user-4',
    stageId: 'stage-4',
    title: '鴻海全球供應鏈管理平台合約',
    amount: 8500000,
    winProbability: 80,
    expectedCloseDate: '2026-07-20',
    productLineId: 'prod-3',
    monthlyQuantity: 17,
    unitPrice: 500000,
    orgId: 'org-3',
    schedules: {
      'stage-1': '2026-05-01',
      'stage-2': '2026-05-20',
      'stage-3': '2026-06-15',
      'stage-4': '2026-07-10',
      'stage-5': '2026-08-01',
      'stage-6': '2026-09-01',
    },
    budgets: [
      { budgetItemId: 'budget-1', amount: 80000 },
      { budgetItemId: 'budget-3', amount: 400000 },
    ]
  },
  {
    id: 'opp-4',
    companyId: 'comp-4',
    userId: 'user-4',
    stageId: 'stage-5',
    title: '大立光高解析度檢測軟體授權',
    amount: 3000000,
    winProbability: 100,
    expectedCloseDate: '2026-06-15',
    productLineId: 'prod-4',
    monthlyQuantity: 3,
    unitPrice: 1000000,
    orgId: 'org-3',
    schedules: {
      'stage-1': '2026-03-01',
      'stage-2': '2026-03-20',
      'stage-3': '2026-04-15',
      'stage-4': '2026-05-10',
      'stage-5': '2026-06-15',
      'stage-6': '2026-07-15',
    },
    budgets: []
  },
  {
    id: 'opp-5',
    companyId: 'comp-1',
    userId: 'user-4',
    stageId: 'stage-2',
    title: 'TSMC AI 瑕疵檢測演算法 PoC',
    amount: 800000,
    winProbability: 30,
    expectedCloseDate: '2026-09-30',
    productLineId: 'prod-4',
    monthlyQuantity: 4,
    unitPrice: 200000,
    orgId: 'org-3',
    schedules: {
      'stage-1': '2026-06-01',
      'stage-2': '2026-07-01',
      'stage-3': '2026-08-01',
      'stage-4': '2026-09-01',
      'stage-5': '2026-10-01',
      'stage-6': '2026-11-01',
    },
    budgets: [
      { budgetItemId: 'budget-2', amount: 50000 },
    ]
  },
];

const DEFAULT_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    opportunityId: 'opp-1',
    userId: 'user-3',
    type: '會議/拜訪',
    description: '與台積電資訊部門主管進行視訊會議，確認雲端與地端的架構方案。',
    dueDate: '2026-06-25 14:00',
    isCompleted: true,
  },
  {
    id: 'act-2',
    opportunityId: 'opp-1',
    userId: 'user-3',
    type: '待辦任務',
    description: '提交 MES 升級規劃書與初步報價單給李華小姐。',
    dueDate: '2026-07-02 18:00',
    isCompleted: false,
  },
  {
    id: 'act-3',
    opportunityId: 'opp-2',
    userId: 'user-3',
    type: '電話聯繫',
    description: '致電王大同經理，約定下週拜訪時間，但對方暫時未接。',
    dueDate: '2026-06-29 10:30',
    isCompleted: true,
  },
  {
    id: 'act-4',
    opportunityId: 'opp-3',
    userId: 'user-4',
    type: '會議/拜訪',
    description: '與鴻海法務部門核對合約細節與 SLA 條款。',
    dueDate: '2026-06-28 15:00',
    isCompleted: true,
  },
  {
    id: 'act-5',
    opportunityId: 'opp-3',
    userId: 'user-4',
    type: '待辦任務',
    description: '依據法務意見修正合約第三條，並重新寄送。',
    dueDate: '2026-07-01 12:00',
    isCompleted: false,
  },
  {
    id: 'act-6',
    opportunityId: 'opp-5',
    userId: 'user-4',
    type: '待辦任務',
    description: '準備 PoC 環境所需的測試資料與授權 Key。',
    dueDate: '2026-07-05 09:00',
    isCompleted: false,
  },
];

// LocalStorage Keys
const STORAGE_KEYS = {
  ORGANIZATIONS: 'crm_orgs',
  USERS: 'crm_users',
  COMPANIES: 'crm_companies',
  CONTACTS: 'crm_contacts',
  STAGES: 'crm_stages',
  ACTIVITY_TYPES: 'crm_act_types',
  OPPORTUNITIES: 'crm_opportunities',
  ACTIVITIES: 'crm_activities',
  PRODUCT_LINES: 'crm_product_lines',
  BUDGET_ITEMS: 'crm_budget_items',
  SALES_TARGETS: 'crm_sales_targets',
};

const IS_CLEAN_START = import.meta.env.VITE_CLEAN_START === 'true';

const CLEAN_START_ADMIN: User[] = [
  { id: 'admin-init', name: '系統管理員 (Admin)', email: 'admin@crm.local', role: 'ADMIN', orgId: null },
];

const getCleanFallback = <T>(key: string, defaultValue: T): T => {
  if (!IS_CLEAN_START) return defaultValue;
  switch (key) {
    case STORAGE_KEYS.USERS:
      return CLEAN_START_ADMIN as unknown as T;
    case STORAGE_KEYS.ORGANIZATIONS:
    case STORAGE_KEYS.COMPANIES:
    case STORAGE_KEYS.CONTACTS:
    case STORAGE_KEYS.OPPORTUNITIES:
    case STORAGE_KEYS.ACTIVITIES:
    case STORAGE_KEYS.PRODUCT_LINES:
    case STORAGE_KEYS.BUDGET_ITEMS:
    case STORAGE_KEYS.SALES_TARGETS:
      return [] as unknown as T;
    default:
      return defaultValue;
  }
};

const getFromStorage = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    const seed = getCleanFallback(key, defaultValue);
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
};

const saveToStorage = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

const notifyUsersChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm:users-changed'));
  }
};

export const generateId = (prefix: string): string => {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${Date.now()}-${rand}`;
};

// 自動補齊舊版 stages 缺失的 outcome 欄位，並鎖定 WON=100% / LOST=100%（以 outcome 區分，讓漏斗能視覺化顯示 LOST 金額，業績與 BD Progress % 僅採計 OPEN+WON）
const normalizeStages = (stages: Stage[]): { stages: Stage[]; changed: boolean } => {
  let changed = false;
  const sorted = stages.toSorted((a, b) => a.displayOrder - b.displayOrder);
  const activeSorted = sorted.filter(s => s.isActive);
  const inferredLostId = activeSorted[activeSorted.length - 1]?.id;
  const inferredWonId = activeSorted.length >= 2 ? activeSorted[activeSorted.length - 2]?.id : undefined;

  const normalized = sorted.map(s => {
    let outcome = s.outcome;
    if (!outcome) {
      if (s.id === inferredLostId || s.defaultWinProbability === 0 || /lost|loss|流失/i.test(s.name)) outcome = 'LOST';
      else if (s.id === inferredWonId || s.defaultWinProbability === 100 || /won|awarded|成交/i.test(s.name)) outcome = 'WON';
      else outcome = 'OPEN';
      changed = true;
    }
    let prob = s.defaultWinProbability;
    let isActive = s.isActive;
    if ((outcome === 'WON' || outcome === 'LOST') && (prob !== 100 || !isActive)) {
      prob = 100;
      isActive = true;
      changed = true;
    }
    return { ...s, outcome, defaultWinProbability: prob, isActive };
  });

  return { stages: normalized, changed };
};

export const initDB = (): void => {
  getFromStorage(STORAGE_KEYS.ORGANIZATIONS, DEFAULT_ORGANIZATIONS);
  
  // 檢測並自動升級緩存在 LocalStorage 中的舊角色數據 (SALES -> AM, MANAGER -> BU_HEAD)
  const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
  if (rawUsers) {
    try {
      const parsed: any[] = JSON.parse(rawUsers);
      let changed = false;
      const migrated = parsed.map(u => {
        if (u.role === 'SALES') {
          u.role = 'AM';
          changed = true;
        }
        if (u.role === 'MANAGER') {
          u.role = 'BU_HEAD';
          changed = true;
        }
        if (u.name && u.name.includes('Sales')) {
          u.name = u.name.replace('Sales', 'AM');
          changed = true;
        }
        if (u.name && u.name.includes('Manager')) {
          u.name = u.name.replace('Manager', 'BU head');
          changed = true;
        }
        return u;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(migrated));
      }
    } catch (e) {
      console.warn('Failed to parse or migrate local storage users', e);
    }
  }

  // 自動遷移舊版 stages 加上 outcome 欄位，並同步結案 (WON/LOST) 商機權重為 100%
  const rawStages = localStorage.getItem(STORAGE_KEYS.STAGES);
  let activeStagesForMigration: Stage[] = DEFAULT_STAGES;
  if (rawStages) {
    try {
      const parsed: Stage[] = JSON.parse(rawStages);
      const { stages: migrated, changed } = normalizeStages(parsed);
      activeStagesForMigration = migrated;
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.STAGES, JSON.stringify(migrated));
      }
    } catch (e) {
      console.warn('Failed to migrate stages', e);
    }
  }

  const rawOpps = localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES);
  if (rawOpps) {
    try {
      const parsedOpps: Opportunity[] = JSON.parse(rawOpps);
      const terminalStageIds = new Set(
        activeStagesForMigration
          .filter(s => s.outcome === 'WON' || s.outcome === 'LOST')
          .map(s => s.id)
      );
      let oppsChanged = false;
      const migratedOpps = parsedOpps.map(o => {
        if (terminalStageIds.has(o.stageId) && o.winProbability !== 100) {
          oppsChanged = true;
          return { ...o, winProbability: 100 };
        }
        return o;
      });
      if (oppsChanged) {
        localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(migratedOpps));
      }
    } catch (e) {
      console.warn('Failed to migrate terminal opportunities winProbability', e);
    }
  }

  getFromStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);
  getFromStorage(STORAGE_KEYS.COMPANIES, DEFAULT_COMPANIES);
  getFromStorage(STORAGE_KEYS.CONTACTS, DEFAULT_CONTACTS);
  getFromStorage(STORAGE_KEYS.STAGES, DEFAULT_STAGES);
  getFromStorage(STORAGE_KEYS.ACTIVITY_TYPES, DEFAULT_ACTIVITY_TYPES);
  getFromStorage(STORAGE_KEYS.OPPORTUNITIES, DEFAULT_OPPORTUNITIES);
  getFromStorage(STORAGE_KEYS.ACTIVITIES, DEFAULT_ACTIVITIES);
  getFromStorage(STORAGE_KEYS.PRODUCT_LINES, DEFAULT_PRODUCT_LINES);
  getFromStorage(STORAGE_KEYS.BUDGET_ITEMS, DEFAULT_BUDGET_ITEMS);
  getFromStorage(STORAGE_KEYS.SALES_TARGETS, []);
};

// Slicer Filter 輔助函數：取得某組織自身及所有子組織 ID 列表（內建防循環 visited guard — B-3）
export const getSubOrgIds = (
  orgId: string,
  orgs: Organization[],
  visited: Set<string> = new Set()
): string[] => {
  if (visited.has(orgId)) return [];
  visited.add(orgId);
  let subIds = [orgId];
  const directChildren = orgs.filter(o => o.parentId === orgId).map(o => o.id);
  for (const childId of directChildren) {
    subIds = [...subIds, ...getSubOrgIds(childId, orgs, visited)];
  }
  return subIds;
};

// 取得某組織的所有後代 ID（不含自己），供設定頁防止循環父子指派 (B-3)
export const getDescendantOrgIds = (orgId: string, orgs: Organization[]): string[] => {
  return getSubOrgIds(orgId, orgs).filter(id => id !== orgId);
};

// 取得目前使用者依 RBAC 權限可見的組織清單 (BU_HEAD 僅見自己部門樹 — B-4)
export const getVisibleOrgsForUser = (
  orgs: Organization[],
  users: User[],
  role: UserRole,
  currentUserId: string
): Organization[] => {
  if (role === 'ADMIN') return orgs;
  if (role === 'BU_HEAD') {
    const me = users.find(u => u.id === currentUserId);
    if (me?.orgId) {
      const allowed = new Set(getSubOrgIds(me.orgId, orgs));
      return orgs.filter(o => allowed.has(o.id));
    }
    return orgs;
  }
  return [];
};

// 取得特定組織下階所有人員（作為條件式 Sales Rep Slicer；無人則回傳空陣列）
export const getEligibleSalesReps = (
  orgs: Organization[],
  users: User[],
  role: UserRole,
  currentUserId: string,
  selectedOrgId?: string
): User[] => {
  if (role === 'AM') return [];
  let targetOrgIds: string[] = [];

  if (selectedOrgId) {
    targetOrgIds = getSubOrgIds(selectedOrgId, orgs);
  } else if (role === 'BU_HEAD') {
    const me = users.find(u => u.id === currentUserId);
    if (me?.orgId) {
      targetOrgIds = getSubOrgIds(me.orgId, orgs);
    } else {
      targetOrgIds = orgs.map(o => o.id);
    }
  } else {
    // ADMIN 未選特定部門時，僅涵蓋已歸屬任一組織的人員
    targetOrgIds = orgs.map(o => o.id);
  }

  if (targetOrgIds.length === 0) return [];
  const orgSet = new Set(targetOrgIds);
  return users.filter(u => u.orgId !== null && orgSet.has(u.orgId));
};

// 取得商機建立日期（相容舊資料 fallback）
export const getOppCreatedDate = (opp: Opportunity): string => {
  if (opp.createdAt) return opp.createdAt;
  const schedDates = Object.values(opp.schedules || {}).filter(Boolean).sort();
  if (schedDates.length > 0) return schedDates[0];
  if (opp.expectedCloseDate) {
    const d = parseLocalCalendarDate(opp.expectedCloseDate);
    if (!Number.isNaN(d.getTime())) {
      d.setDate(d.getDate() - 30);
      return formatLocalDate(d);
    }
  }
  return getLocalTodayIso();
};

// 取得商機結案日期（若目前在 WON/LOST 階段）
export const getOppClosedDate = (opp: Opportunity, stages: Stage[]): string | null => {
  const st = stages.find(s => s.id === opp.stageId);
  if (!st || st.outcome === 'OPEN') return null;
  if (opp.closedAt) return opp.closedAt;
  if (opp.schedules?.[st.id]) return opp.schedules[st.id];
  if (opp.expectedCloseDate) return opp.expectedCloseDate;
  return getLocalTodayIso();
};

// 判斷商機是否落於月區間 [startMonth, endMonth]：
// 1. 該區間建立的 BD
// 2. 該區間內結案 (WON/LOST) 的 case
// 3. 該時間點結束時尚未進入 WON/LOST 的舊案
export const isOppInMonthRange = (
  opp: Opportunity,
  stages: Stage[],
  startMonth?: string,
  endMonth?: string
): boolean => {
  if (!startMonth && !endMonth) return true;
  const effStart = startMonth || '1970-01';
  const effEnd = endMonth || '2999-12';
  const rangeStart = `${effStart}-01`;
  // Compute last day of effEnd month
  const [ey, em] = effEnd.split('-').map(Number);
  const lastDay = new Date(ey, em, 0).getDate();
  const rangeEnd = `${effEnd}-${String(lastDay).padStart(2, '0')}`;

  const created = getOppCreatedDate(opp);
  const closed = getOppClosedDate(opp, stages);
  const st = stages.find(s => s.id === opp.stageId);
  const isOpen = !st || st.outcome === 'OPEN';

  // (1) Created within [rangeStart, rangeEnd]
  if (created >= rangeStart && created <= rangeEnd) return true;
  // (2) Closed within [rangeStart, rangeEnd]
  if (closed && closed >= rangeStart && closed <= rangeEnd) return true;
  // (3) Created on/before rangeEnd and still OPEN at rangeEnd (either still OPEN now or closed AFTER rangeEnd)
  if (created <= rangeEnd && (isOpen || (closed !== null && closed > rangeEnd))) return true;

  return false;
};

// 判斷活動是否落於月區間 [startMonth, endMonth]
export const isActivityInMonthRange = (
  act: Activity,
  startMonth?: string,
  endMonth?: string
): boolean => {
  if (!startMonth && !endMonth) return true;
  const ym = (act.dueDate || '').slice(0, 7);
  if (!ym) return true;
  if (startMonth && ym < startMonth) return false;
  if (endMonth && ym > endMonth) return false;
  return true;
};

// 篩選商機的核心過濾函數 (支援 AM/BU_HEAD RBAC、組織樹、Sales Rep、客戶、月區間)
const filterOpps = (
  opps: Opportunity[],
  role: UserRole,
  userId: string,
  filters?: QueryFilters
): Opportunity[] => {
  const orgs = getFromStorage<Organization[]>(STORAGE_KEYS.ORGANIZATIONS, DEFAULT_ORGANIZATIONS);
  const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
  const stages = getFromStorage<Stage[]>(STORAGE_KEYS.STAGES, DEFAULT_STAGES);

  let result = [...opps];

  // RBAC 預過濾：
  // 1) AM 只能看自己負責的商機
  if (role === 'AM') {
    result = result.filter(o => o.userId === userId);
  } else if (role === 'BU_HEAD') {
    // 2) BU_HEAD 僅能看自己所屬組織與其子組織的人員商機 (修復 B-4)
    const me = users.find(u => u.id === userId);
    if (me?.orgId) {
      const allowedOrgs = new Set(getSubOrgIds(me.orgId, orgs));
      const allowedUserIds = new Set(
        users.filter(u => u.orgId && allowedOrgs.has(u.orgId)).map(u => u.id)
      );
      allowedUserIds.add(userId);
      result = result.filter(o => allowedUserIds.has(o.userId));
    }
  }

  if (!filters) return result;

  // 客戶 Slicer 過濾
  if (filters.companyId) {
    result = result.filter(o => o.companyId === filters.companyId);
  }

  // 組織 Slicer 過濾
  if (filters.orgId && role !== 'AM') {
    const targetOrgIds = getSubOrgIds(filters.orgId, orgs);
    const userIdsInOrgs = users
      .filter(u => u.orgId && targetOrgIds.includes(u.orgId))
      .map(u => u.id);
    result = result.filter(o => userIdsInOrgs.includes(o.userId));
  }

  // Sales Rep Slicer 過濾
  if (filters.userId && role !== 'AM') {
    result = result.filter(o => o.userId === filters.userId);
  }

  // 月區間 Slicer 過濾
  if (filters.startMonth || filters.endMonth) {
    result = result.filter(o =>
      isOppInMonthRange(o, stages, filters.startMonth, filters.endMonth)
    );
  }

  return result;
};

// DB API 實作
export const db = {
  // Organizations (樹狀結構 CRUD)
  getOrganizations: async (): Promise<Organization[]> => {
    initDB();
    return getFromStorage<Organization[]>(STORAGE_KEYS.ORGANIZATIONS, DEFAULT_ORGANIZATIONS);
  },
  saveOrganization: async (org: Organization): Promise<Organization> => {
    const list = getFromStorage<Organization[]>(STORAGE_KEYS.ORGANIZATIONS, DEFAULT_ORGANIZATIONS);
    // 防循環父子保護 (修復 B-3)
    if (org.parentId) {
      if (org.parentId === org.id) {
        throw new Error('不可將組織的父部門設為自己');
      }
      const descendants = getDescendantOrgIds(org.id, list);
      if (descendants.includes(org.parentId)) {
        throw new Error('不可將組織的父部門設為其下層子部門（會造成循環架構）');
      }
    }
    const idx = list.findIndex(o => o.id === org.id);
    if (idx >= 0) {
      list[idx] = org;
    } else {
      list.push(org);
    }
    saveToStorage(STORAGE_KEYS.ORGANIZATIONS, list);
    return org;
  },
  deleteOrganization: async (id: string): Promise<boolean> => {
    const list = getFromStorage<Organization[]>(STORAGE_KEYS.ORGANIZATIONS, DEFAULT_ORGANIZATIONS);
    const updated = list
      .map(o => (o.parentId === id ? { ...o, parentId: null } : o))
      .filter(o => o.id !== id);
    saveToStorage(STORAGE_KEYS.ORGANIZATIONS, updated);

    // 把屬於該組織的使用者的 orgId 清空，並同步其名下商機 orgId (修復 B-5)
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const affectedUserIds = new Set(users.filter(u => u.orgId === id).map(u => u.id));
    const updatedUsers = users.map(u => (u.orgId === id ? { ...u, orgId: null } : u));
    saveToStorage(STORAGE_KEYS.USERS, updatedUsers);

    if (affectedUserIds.size > 0) {
      const opps = getFromStorage<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, DEFAULT_OPPORTUNITIES);
      const syncedOpps = opps.map(o =>
        affectedUserIds.has(o.userId) ? { ...o, orgId: null } : o
      );
      saveToStorage(STORAGE_KEYS.OPPORTUNITIES, syncedOpps);
      notifyUsersChanged();
    }

    return true;
  },

  // Users (CRUD)
  getUsers: async (): Promise<User[]> => {
    initDB();
    return getFromStorage<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
  },
  saveUser: async (user: User): Promise<User> => {
    const list = getFromStorage<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const idx = list.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      list[idx] = user;
    } else {
      list.push(user);
    }
    saveToStorage(STORAGE_KEYS.USERS, list);

    // 同步該人員所有名下商機的 orgId，避免人員調動部門後殘留過期組織 (修復 B-5)
    const opps = getFromStorage<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, DEFAULT_OPPORTUNITIES);
    let oppsChanged = false;
    const syncedOpps = opps.map(o => {
      if (o.userId === user.id && o.orgId !== user.orgId) {
        oppsChanged = true;
        return { ...o, orgId: user.orgId };
      }
      return o;
    });
    if (oppsChanged) {
      saveToStorage(STORAGE_KEYS.OPPORTUNITIES, syncedOpps);
    }

    // 即時通知 AuthContext 刷新角色切換器 (修復 B-1)
    notifyUsersChanged();
    return user;
  },
  deleteUser: async (id: string): Promise<boolean> => {
    const list = getFromStorage<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const target = list.find(u => u.id === id);
    if (!target) return false;

    // 防止刪除最後一位系統管理員
    if (target.role === 'ADMIN' && list.filter(u => u.role === 'ADMIN').length <= 1) {
      throw new Error('系統至少必須保留一位 ADMIN 管理員帳號');
    }

    // 防止刪除仍有負責商機的人員（避免孤兒商機 — 修復 B-5）
    const opps = getFromStorage<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, DEFAULT_OPPORTUNITIES);
    const ownedCount = opps.filter(o => o.userId === id).length;
    if (ownedCount > 0) {
      throw new Error(`此人員目前仍負責 ${ownedCount} 筆商機，請先將商機轉交其他業務後再刪除`);
    }

    const filtered = list.filter(u => u.id !== id);
    saveToStorage(STORAGE_KEYS.USERS, filtered);
    notifyUsersChanged();
    return true;
  },

  // Companies (CRUD)
  getCompanies: async (): Promise<Company[]> => {
    initDB();
    return getFromStorage<Company[]>(STORAGE_KEYS.COMPANIES, DEFAULT_COMPANIES);
  },
  saveCompany: async (comp: Company): Promise<Company> => {
    const list = getFromStorage<Company[]>(STORAGE_KEYS.COMPANIES, DEFAULT_COMPANIES);
    const idx = list.findIndex(c => c.id === comp.id);
    if (idx >= 0) {
      list[idx] = comp;
    } else {
      list.push(comp);
    }
    saveToStorage(STORAGE_KEYS.COMPANIES, list);
    return comp;
  },
  deleteCompany: async (id: string): Promise<boolean> => {
    const list = getFromStorage<Company[]>(STORAGE_KEYS.COMPANIES, DEFAULT_COMPANIES);
    const filtered = list.filter(c => c.id !== id);
    saveToStorage(STORAGE_KEYS.COMPANIES, filtered);

    const contacts = getFromStorage<Contact[]>(STORAGE_KEYS.CONTACTS, DEFAULT_CONTACTS);
    saveToStorage(STORAGE_KEYS.CONTACTS, contacts.filter(c => c.companyId !== id));

    const opps = getFromStorage<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, DEFAULT_OPPORTUNITIES);
    saveToStorage(STORAGE_KEYS.OPPORTUNITIES, opps.filter(o => o.companyId !== id));

    return true;
  },

  // Contacts (CRUD)
  getContacts: async (companyId?: string): Promise<Contact[]> => {
    initDB();
    const list = getFromStorage<Contact[]>(STORAGE_KEYS.CONTACTS, DEFAULT_CONTACTS);
    if (companyId) {
      return list.filter(c => c.companyId === companyId);
    }
    return list;
  },
  saveContact: async (contact: Contact): Promise<Contact> => {
    const list = getFromStorage<Contact[]>(STORAGE_KEYS.CONTACTS, DEFAULT_CONTACTS);
    const idx = list.findIndex(c => c.id === contact.id);
    if (idx >= 0) {
      list[idx] = contact;
    } else {
      list.push(contact);
    }
    saveToStorage(STORAGE_KEYS.CONTACTS, list);
    return contact;
  },
  deleteContact: async (id: string): Promise<boolean> => {
    const list = getFromStorage<Contact[]>(STORAGE_KEYS.CONTACTS, DEFAULT_CONTACTS);
    const filtered = list.filter(c => c.id !== id);
    saveToStorage(STORAGE_KEYS.CONTACTS, filtered);
    return true;
  },

  // Stages (CRUD with explicit outcome: 'OPEN' | 'WON' | 'LOST' & mandatory WON/LOST lock)
  getStages: async (onlyActive = false): Promise<Stage[]> => {
    initDB();
    let list = getFromStorage<Stage[]>(STORAGE_KEYS.STAGES, DEFAULT_STAGES);
    if (onlyActive) {
      list = list.filter(s => s.isActive);
    }
    return list.sort((a, b) => a.displayOrder - b.displayOrder);
  },
  saveStage: async (stage: Stage): Promise<Stage> => {
    const list = getFromStorage<Stage[]>(STORAGE_KEYS.STAGES, DEFAULT_STAGES);
    const existing = list.find(s => s.id === stage.id);
    const outcome: StageOutcome = existing?.outcome || stage.outcome || 'OPEN';

    // 強制鎖定 WON / LOST 的贏率 (100%) 與啟用狀態（業績僅採計 OPEN+WON，LOST 100% 供漏斗視覺化）
    const enforced: Stage = {
      ...stage,
      outcome,
      defaultWinProbability:
        outcome === 'WON' || outcome === 'LOST'
          ? 100
          : Math.max(1, Math.min(99, stage.defaultWinProbability)),
      isActive: outcome === 'WON' || outcome === 'LOST' ? true : stage.isActive,
    };

    // 確保至少保留 1 個啟用的 OPEN 階段（總階段至少 3 個）
    if (outcome === 'OPEN' && !enforced.isActive) {
      const otherActiveOpen = list.filter(
        s => s.id !== enforced.id && s.outcome === 'OPEN' && s.isActive
      );
      if (otherActiveOpen.length === 0) {
        throw new Error('管線至少必須保留 1 個啟用的進行中階段（含 BD Won 與 BD Lost 最少 3 階段）');
      }
    }

    const idx = list.findIndex(s => s.id === enforced.id);
    if (idx >= 0) {
      list[idx] = enforced;
    } else {
      list.push(enforced);
    }
    saveToStorage(STORAGE_KEYS.STAGES, list);
    return enforced;
  },
  saveStages: async (stages: Stage[]): Promise<Stage[]> => {
    saveToStorage(STORAGE_KEYS.STAGES, stages);
    return stages;
  },
  deleteStage: async (id: string): Promise<boolean> => {
    const list = getFromStorage<Stage[]>(STORAGE_KEYS.STAGES, DEFAULT_STAGES);
    const target = list.find(s => s.id === id);
    if (!target) return false;

    if (target.outcome === 'WON' || target.outcome === 'LOST') {
      throw new Error('BD Won 與 BD Lost 為必要結案階段，不可刪除');
    }

    const remainingActiveOpen = list.filter(
      s => s.id !== id && s.outcome === 'OPEN' && s.isActive
    );
    if (remainingActiveOpen.length === 0) {
      throw new Error('管線至少必須保留 1 個進行中階段（含 BD Won 與 BD Lost 最少 3 階段）');
    }

    const opps = getFromStorage<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, DEFAULT_OPPORTUNITIES);
    const inUse = opps.filter(o => o.stageId === id).length;
    if (inUse > 0) {
      throw new Error(`此階段目前仍有 ${inUse} 筆商機，請先移動商機後再刪除`);
    }

    const filtered = list.filter(s => s.id !== id);
    saveToStorage(STORAGE_KEYS.STAGES, filtered);
    return true;
  },

  // Activity Types (CRUD)
  getActivityTypes: async (): Promise<ActivityTypeConfig[]> => {
    initDB();
    return getFromStorage<ActivityTypeConfig[]>(STORAGE_KEYS.ACTIVITY_TYPES, DEFAULT_ACTIVITY_TYPES);
  },
  saveActivityType: async (type: ActivityTypeConfig): Promise<ActivityTypeConfig> => {
    const list = getFromStorage<ActivityTypeConfig[]>(STORAGE_KEYS.ACTIVITY_TYPES, DEFAULT_ACTIVITY_TYPES);
    const idx = list.findIndex(t => t.id === type.id);
    if (idx >= 0) {
      list[idx] = type;
    } else {
      list.push(type);
    }
    saveToStorage(STORAGE_KEYS.ACTIVITY_TYPES, list);
    return type;
  },
  deleteActivityType: async (id: string): Promise<boolean> => {
    const list = getFromStorage<ActivityTypeConfig[]>(STORAGE_KEYS.ACTIVITY_TYPES, DEFAULT_ACTIVITY_TYPES);
    const filtered = list.filter(t => t.id !== id);
    saveToStorage(STORAGE_KEYS.ACTIVITY_TYPES, filtered);
    return true;
  },

  // Opportunities (CRUD with RBAC & Slicers)
  getOpportunities: async (
    role: UserRole,
    userId: string,
    filters?: QueryFilters
  ): Promise<Opportunity[]> => {
    initDB();
    const list = getFromStorage<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, DEFAULT_OPPORTUNITIES);
    return filterOpps(list, role, userId, filters);
  },
  getOpportunityById: async (id: string): Promise<Opportunity | undefined> => {
    initDB();
    const list = getFromStorage<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, DEFAULT_OPPORTUNITIES);
    return list.find(o => o.id === id);
  },
  saveOpportunity: async (opp: Opportunity): Promise<Opportunity> => {
    const list = getFromStorage<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, DEFAULT_OPPORTUNITIES);
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const stages = getFromStorage<Stage[]>(STORAGE_KEYS.STAGES, DEFAULT_STAGES)
      .filter(s => s.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const existing = list.find(o => o.id === opp.id);

    // 1. 自動計算 Monthly Deal Revenue
    opp.amount = (opp.monthlyQuantity || 0) * (opp.unitPrice || 0);

    // 2. 自動關聯負責 AM 的 orgId
    const amUser = users.find(u => u.id === opp.userId);
    opp.orgId = amUser ? amUser.orgId : null;

    // 3. 新增商機時，若未指定階段，預設設為第一個 OPEN 階段，且自動套用贏率
    if (!opp.stageId && stages.length > 0) {
      const firstOpen = stages.find(s => s.outcome === 'OPEN') || stages[0];
      opp.stageId = firstOpen.id;
      opp.winProbability = firstOpen.defaultWinProbability;
    }

    // 4. 自動記錄 createdAt / closedAt 時間戳以支援月區間報表（採用本地日曆日期避免跨午夜偏移）
    const todayStr = getLocalTodayIso();
    if (!opp.createdAt) {
      opp.createdAt = existing?.createdAt || todayStr;
    }
    const targetStage = stages.find(s => s.id === opp.stageId);
    if (targetStage?.outcome === 'WON' || targetStage?.outcome === 'LOST') {
      opp.winProbability = 100;
      if (!opp.closedAt || (existing && existing.stageId !== opp.stageId)) {
        opp.closedAt = existing?.stageId === opp.stageId && existing.closedAt ? existing.closedAt : todayStr;
      }
    } else {
      opp.closedAt = undefined;
    }

    const idx = list.findIndex(o => o.id === opp.id);
    if (idx >= 0) {
      list[idx] = opp;
    } else {
      list.push(opp);
    }
    saveToStorage(STORAGE_KEYS.OPPORTUNITIES, list);
    return opp;
  },
  deleteOpportunity: async (id: string): Promise<boolean> => {
    const list = getFromStorage<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, DEFAULT_OPPORTUNITIES);
    const filtered = list.filter(o => o.id !== id);
    saveToStorage(STORAGE_KEYS.OPPORTUNITIES, filtered);

    const acts = getFromStorage<Activity[]>(STORAGE_KEYS.ACTIVITIES, DEFAULT_ACTIVITIES);
    saveToStorage(STORAGE_KEYS.ACTIVITIES, acts.filter(a => a.opportunityId !== id));
    return true;
  },

  // Activities & Tasks (With Slicers)
  getActivities: async (opportunityId?: string): Promise<Activity[]> => {
    initDB();
    const list = getFromStorage<Activity[]>(STORAGE_KEYS.ACTIVITIES, DEFAULT_ACTIVITIES);
    if (opportunityId) {
      return list.filter(a => a.opportunityId === opportunityId);
    }
    return list;
  },
  getPendingTasks: async (
    userId: string,
    role: UserRole,
    filters?: QueryFilters
  ): Promise<Activity[]> => {
    initDB();
    const list = getFromStorage<Activity[]>(STORAGE_KEYS.ACTIVITIES, DEFAULT_ACTIVITIES);
    const opps = getFromStorage<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, DEFAULT_OPPORTUNITIES);
    const filteredOppIds = filterOpps(opps, role, userId, filters).map(o => o.id);
    const tasks = list.filter(
      a =>
        a.isCompleted === false &&
        filteredOppIds.includes(a.opportunityId) &&
        isActivityInMonthRange(a, filters?.startMonth, filters?.endMonth)
    );
    return tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },
  saveActivity: async (act: Activity): Promise<Activity> => {
    const list = getFromStorage<Activity[]>(STORAGE_KEYS.ACTIVITIES, DEFAULT_ACTIVITIES);
    const idx = list.findIndex(a => a.id === act.id);
    if (idx >= 0) {
      list[idx] = act;
    } else {
      list.push(act);
    }
    saveToStorage(STORAGE_KEYS.ACTIVITIES, list);
    return act;
  },
  deleteActivity: async (id: string): Promise<boolean> => {
    const list = getFromStorage<Activity[]>(STORAGE_KEYS.ACTIVITIES, DEFAULT_ACTIVITIES);
    const filtered = list.filter(a => a.id !== id);
    saveToStorage(STORAGE_KEYS.ACTIVITIES, filtered);
    return true;
  },

  // Analytics Funnel Data (With Slicers)
  getAnalyticsFunnel: async (
    role: UserRole,
    userId: string,
    filters?: QueryFilters
  ): Promise<{ stageName: string; amount: number; count: number }[]> => {
    initDB();
    const opps = await db.getOpportunities(role, userId, filters);
    const stages = await db.getStages(true);

    return stages.map(stage => {
      const stageOpps = opps.filter(o => o.stageId === stage.id);
      const totalAmount = stageOpps.reduce((sum, o) => sum + Number(o.amount), 0);
      return {
        stageName: stage.name,
        amount: totalAmount,
        count: stageOpps.length,
      };
    });
  },

  // Analytics KPI (Redesigned KPI Suite using explicit Stage.outcome + month range!)
  getAnalyticsKPI: async (
    role: UserRole,
    userId: string,
    filters?: QueryFilters
  ): Promise<{
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
  }> => {
    initDB();
    const opps = await db.getOpportunities(role, userId, filters);
    const oppIds = new Set(opps.map(o => o.id));
    const allActivities = getFromStorage<Activity[]>(STORAGE_KEYS.ACTIVITIES, DEFAULT_ACTIVITIES);
    const stages = getFromStorage<Stage[]>(STORAGE_KEYS.STAGES, DEFAULT_STAGES);

    const stageMap = new Map(stages.map(s => [s.id, s]));
    const getOutcome = (stageId: string): StageOutcome => stageMap.get(stageId)?.outcome || 'OPEN';

    // 區間內的關聯活動
    const filteredActivities = allActivities.filter(
      a =>
        oppIds.has(a.opportunityId) &&
        isActivityInMonthRange(a, filters?.startMonth, filters?.endMonth)
    );

    const openOpps = opps.filter(o => getOutcome(o.stageId) === 'OPEN');
    const wonOpps = opps.filter(o => getOutcome(o.stageId) === 'WON');
    const lostOpps = opps.filter(o => getOutcome(o.stageId) === 'LOST');

    // 全部潛在商機金額（不含 BD Lost）
    const nonLostOpps = opps.filter(o => getOutcome(o.stageId) !== 'LOST');
    const totalPotentialAmount = nonLostOpps.reduce((sum, o) => sum + o.amount, 0);

    // 加權金額（不含 BD Lost）
    const expectedRevenue = nonLostOpps.reduce(
      (sum, o) => sum + o.amount * (o.winProbability / 100),
      0
    );

    // BD Progress % = 加權金額 / 全部潛在商機金額 (不含 BD Lost)
    const bdProgressRate =
      totalPotentialAmount > 0 ? (expectedRevenue / totalPotentialAmount) * 100 : 0;

    const wonAmount = wonOpps.reduce((sum, o) => sum + o.amount, 0);
    const lostAmount = lostOpps.reduce((sum, o) => sum + o.amount, 0);

    // BD Won % = BD Won count / total BD count; BD Lost % = BD Lost count / total BD count
    const wonRate = opps.length > 0 ? (wonOpps.length / opps.length) * 100 : 0;
    const lostRate = opps.length > 0 ? (lostOpps.length / opps.length) * 100 : 0;
    const closedTotal = wonOpps.length + lostOpps.length;
    const closedWinRate = closedTotal > 0 ? (wonOpps.length / closedTotal) * 100 : 0;

    // 活動完成率
    const completedActs = filteredActivities.filter(a => a.isCompleted);
    const activityCompletionRate =
      filteredActivities.length > 0 ? (completedActs.length / filteredActivities.length) * 100 : 0;

    return {
      totalPotentialAmount,
      expectedRevenue,
      bdProgressRate,
      openCount: openOpps.length,
      wonCount: wonOpps.length,
      lostCount: lostOpps.length,
      totalOpportunitiesCount: opps.length,
      wonAmount,
      lostAmount,
      wonRate,
      lostRate,
      closedWinRate,
      activityCompletionRate,
      completedActivitiesCount: completedActs.length,
      totalActivitiesCount: filteredActivities.length,
      taskCompletionRate: activityCompletionRate,
      funnelConversion: wonRate,
    };
  },

  // Sales Targets (Monthly Goals for Management Metrics)
  getSalesTargets: async (): Promise<SalesTarget[]> => {
    initDB();
    return getFromStorage<SalesTarget[]>(STORAGE_KEYS.SALES_TARGETS, []);
  },
  saveSalesTarget: async (target: SalesTarget): Promise<SalesTarget> => {
    const list = getFromStorage<SalesTarget[]>(STORAGE_KEYS.SALES_TARGETS, []);
    const idx = list.findIndex(t => t.month === target.month);
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    saveToStorage(STORAGE_KEYS.SALES_TARGETS, list);
    return target;
  },

  // Product Lines APIs
  getProductLines: async (): Promise<ProductLine[]> => {
    initDB();
    return getFromStorage<ProductLine[]>(STORAGE_KEYS.PRODUCT_LINES, DEFAULT_PRODUCT_LINES);
  },
  saveProductLine: async (item: ProductLine): Promise<ProductLine> => {
    const list = getFromStorage<ProductLine[]>(STORAGE_KEYS.PRODUCT_LINES, DEFAULT_PRODUCT_LINES);
    const idx = list.findIndex(p => p.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    saveToStorage(STORAGE_KEYS.PRODUCT_LINES, list);
    return item;
  },
  deleteProductLine: async (id: string): Promise<boolean> => {
    const list = getFromStorage<ProductLine[]>(STORAGE_KEYS.PRODUCT_LINES, DEFAULT_PRODUCT_LINES);
    const filtered = list.filter(p => p.id !== id);
    saveToStorage(STORAGE_KEYS.PRODUCT_LINES, filtered);
    return true;
  },

  // Budget Items Config APIs
  getBudgetItems: async (): Promise<BudgetItemConfig[]> => {
    initDB();
    return getFromStorage<BudgetItemConfig[]>(STORAGE_KEYS.BUDGET_ITEMS, DEFAULT_BUDGET_ITEMS);
  },
  saveBudgetItem: async (item: BudgetItemConfig): Promise<BudgetItemConfig> => {
    const list = getFromStorage<BudgetItemConfig[]>(STORAGE_KEYS.BUDGET_ITEMS, DEFAULT_BUDGET_ITEMS);
    const idx = list.findIndex(b => b.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    saveToStorage(STORAGE_KEYS.BUDGET_ITEMS, list);
    return item;
  },
  deleteBudgetItem: async (id: string): Promise<boolean> => {
    const list = getFromStorage<BudgetItemConfig[]>(STORAGE_KEYS.BUDGET_ITEMS, DEFAULT_BUDGET_ITEMS);
    const filtered = list.filter(b => b.id !== id);
    saveToStorage(STORAGE_KEYS.BUDGET_ITEMS, filtered);
    return true;
  },
};
