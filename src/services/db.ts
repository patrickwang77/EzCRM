// B2B CRM Upgraded Mock Database Engine (LocalStorage-based)

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

export interface Stage {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  defaultWinProbability: number; // 預設贏率 0-100
}

export interface ActivityTypeConfig {
  id: string;
  name: string;      // 例如: '待辦任務', '會議拜訪'
  icon: string;      // 'CheckSquare' | 'Video' | 'Phone' | 'Mail' | 'FileText' 等
  color: string;     // 'amber' | 'blue' | 'emerald' | 'purple' | 'rose'
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
  amount: number; // 預估金額 (每月數量 * 單價)
  winProbability: number; // 贏率 0-100
  expectedCloseDate: string;
  
  productLineId: string;
  monthlyQuantity: number;
  unitPrice: number;
  orgId: string | null;
  schedules: { [stageId: string]: string };
  budgets: { budgetItemId: string; amount: number }[];
  tags?: EntityTag[]; // 預留給手動 / LLM 自動標籤
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
  { id: 'stage-1', name: '初步接洽', displayOrder: 1, isActive: true, defaultWinProbability: 10 },
  { id: 'stage-2', name: '需求確認', displayOrder: 2, isActive: true, defaultWinProbability: 30 },
  { id: 'stage-3', name: '方案展示', displayOrder: 3, isActive: true, defaultWinProbability: 50 },
  { id: 'stage-4', name: '商務談判', displayOrder: 4, isActive: true, defaultWinProbability: 80 },
  { id: 'stage-5', name: '贏得交易 (成交)', displayOrder: 5, isActive: true, defaultWinProbability: 100 },
  { id: 'stage-6', name: '流失交易', displayOrder: 6, isActive: true, defaultWinProbability: 0 },
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

  getFromStorage(STORAGE_KEYS.USERS, DEFAULT_USERS);
  getFromStorage(STORAGE_KEYS.COMPANIES, DEFAULT_COMPANIES);
  getFromStorage(STORAGE_KEYS.CONTACTS, DEFAULT_CONTACTS);
  getFromStorage(STORAGE_KEYS.STAGES, DEFAULT_STAGES);
  getFromStorage(STORAGE_KEYS.ACTIVITY_TYPES, DEFAULT_ACTIVITY_TYPES);
  getFromStorage(STORAGE_KEYS.OPPORTUNITIES, DEFAULT_OPPORTUNITIES);
  getFromStorage(STORAGE_KEYS.ACTIVITIES, DEFAULT_ACTIVITIES);
  getFromStorage(STORAGE_KEYS.PRODUCT_LINES, DEFAULT_PRODUCT_LINES);
  getFromStorage(STORAGE_KEYS.BUDGET_ITEMS, DEFAULT_BUDGET_ITEMS);
};

// Slicer Filter 輔助函數：取得某組織的所有子組織 ID 列表
const getSubOrgIds = (orgId: string, orgs: Organization[]): string[] => {
  let subIds = [orgId];
  const directChildren = orgs.filter(o => o.parentId === orgId).map(o => o.id);
  for (const childId of directChildren) {
    subIds = [...subIds, ...getSubOrgIds(childId, orgs)];
  }
  return subIds;
};

// 篩選商機的核心過濾函數
const filterOpps = (
  opps: Opportunity[], 
  role: UserRole, 
  userId: string, 
  filters?: { orgId?: string; companyId?: string }
): Opportunity[] => {
  let result = [...opps];

  // RBAC 預過濾：AM 只能看自己負責的商機
  if (role === 'AM') {
    result = result.filter(o => o.userId === userId);
  }

  if (!filters) return result;

  // 1. 客戶 Slicer 過濾
  if (filters.companyId) {
    result = result.filter(o => o.companyId === filters.companyId);
  }

  // 2. 組織 Slicer 過濾
  if (filters.orgId && role !== 'AM') {
    const orgs = getFromStorage<Organization[]>(STORAGE_KEYS.ORGANIZATIONS, DEFAULT_ORGANIZATIONS);
    const targetOrgIds = getSubOrgIds(filters.orgId, orgs);
    
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    // 找出屬於這些組織的使用者 ID 列表
    const userIdsInOrgs = users.filter(u => u.orgId && targetOrgIds.includes(u.orgId)).map(u => u.id);
    
    result = result.filter(o => userIdsInOrgs.includes(o.userId));
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
    
    // 子組織連帶解除父關聯 (設為根節點，或禁止刪除)
    const updated = list.map(o => o.parentId === id ? { ...o, parentId: null } : o).filter(o => o.id !== id);
    saveToStorage(STORAGE_KEYS.ORGANIZATIONS, updated);

    // 把屬於該組織的使用者的 orgId 清空
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const updatedUsers = users.map(u => u.orgId === id ? { ...u, orgId: null } : u);
    saveToStorage(STORAGE_KEYS.USERS, updatedUsers);

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
    return user;
  },
  deleteUser: async (id: string): Promise<boolean> => {
    const list = getFromStorage<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const filtered = list.filter(u => u.id !== id);
    saveToStorage(STORAGE_KEYS.USERS, filtered);
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

    // 連帶刪除該公司的 Contacts 與 Opportunities
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

  // Stages (CRUD)
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
    const idx = list.findIndex(s => s.id === stage.id);
    if (idx >= 0) {
      list[idx] = stage;
    } else {
      list.push(stage);
    }
    saveToStorage(STORAGE_KEYS.STAGES, list);
    return stage;
  },
  saveStages: async (stages: Stage[]): Promise<Stage[]> => {
    saveToStorage(STORAGE_KEYS.STAGES, stages);
    return stages;
  },
  deleteStage: async (id: string): Promise<boolean> => {
    const list = getFromStorage<Stage[]>(STORAGE_KEYS.STAGES, DEFAULT_STAGES);
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
    filters?: { orgId?: string; companyId?: string }
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

    // 1. 自動計算 Case Revenue per month
    opp.amount = (opp.monthlyQuantity || 0) * (opp.unitPrice || 0);

    // 2. 自動關聯負責 AM 的 orgId
    const amUser = users.find(u => u.id === opp.userId);
    opp.orgId = amUser ? amUser.orgId : null;

    // 3. 新增商機時，若未指定階段，預設設為第一個活躍階段，且自動套用贏率
    if (!opp.stageId && stages.length > 0) {
      opp.stageId = stages[0].id;
      opp.winProbability = stages[0].defaultWinProbability;
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
    
    // 同步刪除活動
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
    filters?: { orgId?: string; companyId?: string }
  ): Promise<Activity[]> => {
    initDB();
    const list = getFromStorage<Activity[]>(STORAGE_KEYS.ACTIVITIES, DEFAULT_ACTIVITIES);
    const opps = getFromStorage<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, DEFAULT_OPPORTUNITIES);
    
    // 預先過濾商機
    const filteredOppIds = filterOpps(opps, role, userId, filters).map(o => o.id);
    
    // 找出待辦任務 (isCompleted: false) 且關聯商機在過濾列表內
    const tasks = list.filter(a => a.isCompleted === false && filteredOppIds.includes(a.opportunityId));
    
    // 依據 dueDate 排序
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
    filters?: { orgId?: string; companyId?: string }
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

  // Analytics KPI (With Slicers)
  getAnalyticsKPI: async (
    role: UserRole, 
    userId: string,
    filters?: { orgId?: string; companyId?: string }
  ): Promise<{
    expectedRevenue: number;
    totalOpportunitiesCount: number;
    winRate: number;
    taskCompletionRate: number;
    funnelConversion: number;
  }> => {
    initDB();
    const opps = await db.getOpportunities(role, userId, filters);
    const oppIds = opps.map(o => o.id);
    const allActivities = getFromStorage<Activity[]>(STORAGE_KEYS.ACTIVITIES, DEFAULT_ACTIVITIES);
    
    // 過濾出與篩選後商機關聯的所有任務 (TASK)
    const userTasks = allActivities.filter(a => oppIds.includes(a.opportunityId));

    // 動態判定流失階段 (順序最後一個) 與成交階段 (倒數第二個)
    const activeStages = getFromStorage<Stage[]>(STORAGE_KEYS.STAGES, DEFAULT_STAGES)
      .filter(s => s.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const lossStageId = activeStages[activeStages.length - 1]?.id || 'stage-6';
    const wonStageId = activeStages[activeStages.length - 2]?.id || 'stage-5';

    // 計算加權預估業績 (跳過動態流失階段)
    const expectedRevenue = opps.reduce((sum, o) => {
      if (o.stageId === lossStageId) return sum;
      return sum + (o.amount * (o.winProbability / 100));
    }, 0);

    // 平均贏率
    const avgWinProbability = opps.length > 0
      ? opps.reduce((sum, o) => sum + o.winProbability, 0) / opps.length
      : 0;

    // 任務完成率
    const completedTasks = userTasks.filter(t => t.isCompleted);
    const taskCompletionRate = userTasks.length > 0
      ? (completedTasks.length / userTasks.length) * 100
      : 0;

    // 漏斗轉換率 (成交階段為 wonStageId 的商機比例)
    const wonOpps = opps.filter(o => o.stageId === wonStageId);
    const funnelConversion = opps.length > 0
      ? (wonOpps.length / opps.length) * 100
      : 0;

    return {
      expectedRevenue,
      totalOpportunitiesCount: opps.length,
      winRate: avgWinProbability,
      taskCompletionRate,
      funnelConversion,
    };
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
  }
};
