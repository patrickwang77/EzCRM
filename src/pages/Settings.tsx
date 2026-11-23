import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { db, getDescendantOrgIds, generateId } from '../services/db';
import type { Stage, StageOutcome, User, Organization, Company, Contact, ActivityTypeConfig, ProductLine, BudgetItemConfig } from '../services/db';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Lock, 
  X,
  ShieldAlert,
  FolderOpen,
  Users,
  Building2,
  ListTodo,
  FolderTree,
  UserCheck,
  Settings2,
  Tag,
  Coins
} from 'lucide-react';

export const Settings: React.FC<{ mode?: 'system' | 'sales' }> = ({ mode = 'system' }) => {
  const { currentUser, availableUsers } = useAuth();
  const { dataVersion, bumpDataVersion, theme } = useLayout();
  const [activeTab, setActiveTab] = useState<'stages' | 'org' | 'users' | 'clients' | 'actTypes' | 'prodLines' | 'budgetItems'>(
    mode === 'sales' ? 'clients' : 'stages'
  );

  // DB States
  const [stages, setStages] = useState<Stage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeConfig[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItemConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag states (undefined = not hovering any drop zone; null = hovering unassigned pool)
  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);
  const [dragOverOrgId, setDragOverOrgId] = useState<string | null | undefined>(undefined);

  // Common Modals Toggle
  const [modalType, setModalType] = useState<'stage' | 'org' | 'user' | 'company' | 'contact' | 'actType' | 'prodLine' | 'budgetItem' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [stageForm, setStageForm] = useState({ name: '', displayOrder: '', isActive: true, defaultWinProbability: '50', outcome: 'OPEN' as StageOutcome });
  const [orgForm, setOrgForm] = useState({ name: '', parentId: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'AM' as User['role'], orgId: '' });
  const [companyForm, setCompanyForm] = useState({ name: '', industry: '' });
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', companyId: '' });
  const [actTypeForm, setActTypeForm] = useState({ name: '', icon: 'CheckSquare', color: 'blue', unitCost: '' });
  const [productLineForm, setProductLineForm] = useState({ name: '', description: '' });
  const [budgetItemForm, setBudgetItemForm] = useState({ name: '' });

  const isAdmin = currentUser?.role === 'ADMIN';

  const loadAllData = async () => {
    try {
      setLoading(true);
      const s = await db.getStages(false);
      const u = await db.getUsers();
      const o = await db.getOrganizations();
      const comp = await db.getCompanies();
      const cont = await db.getContacts();
      const a = await db.getActivityTypes();
      const p = await db.getProductLines();
      const b = await db.getBudgetItems();

      setStages(s);
      setUsers(u);
      setOrganizations(o);
      setCompanies(comp);
      setContacts(cont);
      setActivityTypes(a);
      setProductLines(p);
      setBudgetItems(b);
    } catch (err) {
      console.error('Settings failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [dataVersion]);

  useEffect(() => {
    setActiveTab(mode === 'sales' ? 'clients' : 'stages');
  }, [mode]);

  // --- Modal 開啟與欄位填充 ---
  const handleOpenModal = (type: typeof modalType, id: string | null = null) => {
    setModalType(type);
    setEditingId(id);

    if (type === 'stage') {
      if (id) {
        const item = stages.find(s => s.id === id);
        if (item) {
          setStageForm({
            name: item.name,
            displayOrder: item.displayOrder.toString(),
            isActive: item.isActive,
            defaultWinProbability: item.defaultWinProbability.toString(),
            outcome: item.outcome || 'OPEN',
          });
        }
      } else {
        const openStages = stages.filter(s => s.outcome === 'OPEN');
        const nextOrder = openStages.length > 0 ? Math.max(...openStages.map(s => s.displayOrder)) + 1 : 1;
        setStageForm({ name: '', displayOrder: nextOrder.toString(), isActive: true, defaultWinProbability: '50', outcome: 'OPEN' });
      }
    } else if (type === 'org') {
      if (id) {
        const item = organizations.find(o => o.id === id);
        if (item) setOrgForm({ name: item.name, parentId: item.parentId || '' });
      } else {
        setOrgForm({ name: '', parentId: '' });
      }
    } else if (type === 'user') {
      if (id) {
        const item = users.find(u => u.id === id);
        if (item) setUserForm({ name: item.name, email: item.email, role: item.role, orgId: item.orgId || '' });
      } else {
        setUserForm({ name: '', email: '', role: 'AM', orgId: '' });
      }
    } else if (type === 'company') {
      if (id) {
        const item = companies.find(c => c.id === id);
        if (item) setCompanyForm({ name: item.name, industry: item.industry });
      } else {
        setCompanyForm({ name: '', industry: '' });
      }
    } else if (type === 'contact') {
      if (id) {
        const item = contacts.find(c => c.id === id);
        if (item) setContactForm({ name: item.name, email: item.email, phone: item.phone, companyId: item.companyId });
      } else {
        setContactForm({ name: '', email: '', phone: '', companyId: companies[0]?.id || '' });
      }
    } else if (type === 'actType') {
      if (id) {
        const item = activityTypes.find(a => a.id === id);
        if (item) setActTypeForm({ name: item.name, icon: item.icon, color: item.color, unitCost: item.unitCost ? String(item.unitCost) : '' });
      } else {
        setActTypeForm({ name: '', icon: 'CheckSquare', color: 'blue', unitCost: '' });
      }
    } else if (type === 'prodLine') {
      if (id) {
        const item = productLines.find(p => p.id === id);
        if (item) setProductLineForm({ name: item.name, description: item.description || '' });
      } else {
        setProductLineForm({ name: '', description: '' });
      }
    } else if (type === 'budgetItem') {
      if (id) {
        const item = budgetItems.find(b => b.id === id);
        if (item) setBudgetItemForm({ name: item.name });
      } else {
        setBudgetItemForm({ name: '' });
      }
    }
  };

  // --- CRUD 提交事件 ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const systemTypes = ['stage', 'org', 'user', 'actType', 'budgetItem'];
    if (systemTypes.includes(modalType || '') && !isAdmin) return;

    try {
      if (modalType === 'stage') {
        const item: Stage = {
          id: editingId || generateId('stage'),
          name: stageForm.name,
          displayOrder: parseInt(stageForm.displayOrder) || 1,
          isActive: stageForm.isActive,
          defaultWinProbability: parseInt(stageForm.defaultWinProbability) || 0,
          outcome: stageForm.outcome || 'OPEN',
        };
        await db.saveStage(item);
      } else if (modalType === 'org') {
        const item: Organization = {
          id: editingId || generateId('org'),
          name: orgForm.name,
          parentId: orgForm.parentId || null
        };
        await db.saveOrganization(item);
      } else if (modalType === 'user') {
        const item: User = {
          id: editingId || generateId('user'),
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          orgId: userForm.orgId || null
        };
        await db.saveUser(item);
      } else if (modalType === 'company') {
        const item: Company = {
          id: editingId || generateId('comp'),
          name: companyForm.name,
          industry: companyForm.industry,
          createdAt: editingId ? (companies.find(c => c.id === editingId)?.createdAt || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0]
        };
        await db.saveCompany(item);
      } else if (modalType === 'contact') {
        const item: Contact = {
          id: editingId || generateId('cont'),
          name: contactForm.name,
          email: contactForm.email,
          phone: contactForm.phone,
          companyId: contactForm.companyId
        };
        await db.saveContact(item);
      } else if (modalType === 'actType') {
        const parsedCost = parseFloat(actTypeForm.unitCost);
        const item: ActivityTypeConfig = {
          id: editingId || generateId('acttype'),
          name: actTypeForm.name,
          icon: actTypeForm.icon,
          color: actTypeForm.color,
          unitCost: !Number.isNaN(parsedCost) && parsedCost > 0 ? parsedCost : undefined,
        };
        await db.saveActivityType(item);
      } else if (modalType === 'prodLine') {
        const item: ProductLine = {
          id: editingId || generateId('prod'),
          name: productLineForm.name,
          description: productLineForm.description
        };
        await db.saveProductLine(item);
      } else if (modalType === 'budgetItem') {
        const item: BudgetItemConfig = {
          id: editingId || generateId('budget'),
          name: budgetItemForm.name
        };
        await db.saveBudgetItem(item);
      }

      setModalType(null);
      bumpDataVersion();
      loadAllData();
    } catch (err: any) {
      alert(err?.message || '儲存失敗，請確認欄位資料');
      console.error('Failed to save settings item', err);
    }
  };

  // --- 刪除事件 ---
  const handleDelete = async (type: typeof modalType, id: string) => {
    const systemTypes = ['stage', 'org', 'user', 'actType', 'budgetItem'];
    if (systemTypes.includes(type || '') && !isAdmin) return;
    if (!window.confirm('確定要刪除此項目嗎？刪除後將無法還原，且可能影響關聯資料。')) return;

    try {
      if (type === 'stage') await db.deleteStage(id);
      else if (type === 'org') await db.deleteOrganization(id);
      else if (type === 'user') await db.deleteUser(id);
      else if (type === 'company') await db.deleteCompany(id);
      else if (type === 'contact') await db.deleteContact(id);
      else if (type === 'actType') await db.deleteActivityType(id);
      else if (type === 'prodLine') await db.deleteProductLine(id);
      else if (type === 'budgetItem') await db.deleteBudgetItem(id);

      bumpDataVersion();
      loadAllData();
    } catch (err: any) {
      alert(err?.message || '無法刪除此項目');
      console.error('Failed to delete item', err);
    }
  };

  // --- Drag & Drop 人員所屬組織分配 ---
  const handleUserDragStart = (e: React.DragEvent, userId: string) => {
    setDraggedUserId(userId);
    e.dataTransfer.setData('text/plain', userId);
  };

  const handleOrgDragOver = (e: React.DragEvent, orgId: string | null) => {
    e.preventDefault();
    setDragOverOrgId(orgId);
  };

  const handleOrgDrop = async (e: React.DragEvent, targetOrgId: string | null) => {
    e.preventDefault();
    setDragOverOrgId(undefined);
    const userId = e.dataTransfer.getData('text/plain') || draggedUserId;
    if (!userId) return;

    const user = users.find(u => u.id === userId);
    if (user && user.orgId !== targetOrgId) {
      const updated: User = { ...user, orgId: targetOrgId };
      await db.saveUser(updated);
      bumpDataVersion();
      loadAllData();
    }
    setDraggedUserId(null);
  };

  // --- 遞迴渲染組織樹與該層級的使用者 (含防循環 visited guard) ---
  const renderOrgTree = (parentId: string | null, depth = 0, visited: Set<string> = new Set()) => {
    const currentOrgs = organizations.filter(o => o.parentId === parentId && !visited.has(o.id));
    if (currentOrgs.length === 0) return null;

    return (
      <div className="space-y-3 pl-4 border-l border-slate-200 dark:border-slate-800 ml-2">
        {currentOrgs.map((org) => {
          const nextVisited = new Set(visited);
          nextVisited.add(org.id);
          const orgUsers = users.filter(u => u.orgId === org.id);
          const isOver = dragOverOrgId === org.id;

          return (
            <div key={org.id} className="space-y-2">
              
              {/* 組織節點橫條 (可 Drop 容器) */}
              <div 
                onDragOver={(e) => handleOrgDragOver(e, org.id)}
                onDragLeave={() => setDragOverOrgId(undefined)}
                onDrop={(e) => handleOrgDrop(e, org.id)}
                className={`
                  p-3 rounded-xl border flex items-center justify-between transition-all
                  ${isOver 
                    ? 'bg-sky-500/10 border-sky-500 border-dashed dark:bg-sky-950/20' 
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}
                `}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-sky-500" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{org.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    {orgUsers.length} 人
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenModal('org', org.id)}
                    className="p-1 hover:bg-slate-250 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-sky-500"
                    title="編輯組織名稱"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleDelete('org', org.id)}
                    className="p-1 hover:bg-slate-250 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-rose-500"
                    title="刪除此組織"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 組織底下的人員列表 (可 Drag 卡片) */}
              <div className="flex flex-wrap gap-2 pl-4 py-1">
                {orgUsers.map((user) => (
                  <div
                    key={user.id}
                    draggable="true"
                    onDragStart={(e) => handleUserDragStart(e, user.id)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-grab active:cursor-grabbing hover:border-sky-500/50 dark:hover:border-sky-500/50 flex items-center gap-1.5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>{user.name}</span>
                    <span className="text-[9px] text-slate-400 uppercase">({user.role})</span>
                  </div>
                ))}
                {orgUsers.length === 0 && (
                  <p className="text-[11px] text-slate-400 italic pl-1 py-1">可拖曳人員卡片至此組織</p>
                )}
              </div>

              {/* 遞迴子組織 */}
              {renderOrgTree(org.id, depth + 1, nextVisited)}
            </div>
          );
        })}
      </div>
    );
  };

  // 權限不足提示
  const isAllowed = mode === 'system' ? isAdmin : true;
  if (!isAllowed) {
    const adminNames = availableUsers.filter(u => u.role === 'ADMIN').map(u => u.name).join('、') || '系統管理員';
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm max-w-xl mx-auto space-y-6">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/50">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">權限不足</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            系統偵測到您目前以 <strong>{currentUser?.name} ({currentUser?.role})</strong> 身份存取此頁面。
            依據 RBAC 安全規範，<strong>只有系統管理員（{adminNames}）能夠進入系統設定調整銷售階段與人員配置</strong>。
          </p>
        </div>
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className={`flex items-center gap-2 justify-center text-xs font-semibold px-4 py-2.5 rounded-2xl border ${theme.accentSoftBg} ${theme.accentText} ${theme.accentBorder}`}>
            <ShieldAlert className="w-4 h-4" />
            <span>提示：請使用右上角的角色選單切換為 ADMIN 管理員（{adminNames}）即可操作。</span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  const allTabs = [
    { id: 'stages', name: '銷售階段設定', icon: Settings2, show: mode === 'system' },
    { id: 'org', name: '組織與人員分配', icon: FolderTree, show: mode === 'system' },
    { id: 'users', name: '人員帳號管理', icon: Users, show: mode === 'system' },
    { id: 'clients', name: '客戶與聯絡人', icon: Building2, show: mode === 'sales' },
    { id: 'prodLines', name: 'Product Line 設定', icon: Tag, show: mode === 'sales' },
    { id: 'actTypes', name: '活動任務類型', icon: ListTodo, show: mode === 'system' },
    { id: 'budgetItems', name: '預算項目設定', icon: Coins, show: mode === 'system' },
  ];
  const visibleTabs = allTabs.filter(t => t.show);

  return (
    <div className="space-y-6">
      
      {/* 標題 */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">
          {mode === 'system' ? '系統後台設定' : '銷售管理設定'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {mode === 'system' 
            ? '管理銷售管線階段、多層級組織樹與人員、人員帳號角色、預算項目及任務活動類型。' 
            : '管理客戶公司、窗口聯絡人與產品線 (Product Line)。'}
        </p>
      </div>

      {/* 導覽頁籤 Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap
                ${isActive 
                  ? `border-current ${theme.accentText} ${theme.accentSoftBg}` 
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300 dark:hover:text-slate-200'}
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* --- Tab 1: 銷售階段設定 --- */}
      {activeTab === 'stages' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              設置商機進度看板的展示階段與權重。<strong>BD Won (100%)</strong> 與 <strong>BD Lost (100%)</strong> 為必要結案階段（可改名、權重鎖定 100%、不可刪除；業績與 BD Progress % 僅採計 OPEN + WON，LOST 獨立呈現於銷售漏斗與流失金額），至少保留 3 個啟用階段。
            </p>
            <button
              onClick={() => handleOpenModal('stage')}
              className={`flex items-center gap-1.5 px-4 py-2 font-bold text-xs rounded-xl transition ${theme.primaryBtn}`}
            >
              <Plus className="w-4 h-4" />
              <span>新增進行中階段</span>
            </button>
          </div>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">順序</th>
                  <th className="px-6 py-3">階段名稱</th>
                  <th className="px-6 py-3">階段類型 (Outcome)</th>
                  <th className="px-6 py-3">預設贏率</th>
                  <th className="px-6 py-3">啟用狀態</th>
                  <th className="px-6 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                {[...stages].sort((a,b) => a.displayOrder - b.displayOrder).map((stage) => {
                  const isTerminal = stage.outcome === 'WON' || stage.outcome === 'LOST';
                  return (
                    <tr key={stage.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                      <td className="px-6 py-4 text-slate-500 font-bold">{stage.displayOrder}</td>
                      <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-extrabold">{stage.name}</td>
                      <td className="px-6 py-4">
                        {stage.outcome === 'WON' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            WON · 成交鎖定
                          </span>
                        ) : stage.outcome === 'LOST' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            LOST · 流失鎖定
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            OPEN · 自訂進行中
                          </span>
                        )}
                      </td>
                      <td className={`px-6 py-4 font-bold ${theme.accentText}`}>{stage.defaultWinProbability}%</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${stage.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                          {stage.isActive ? '已啟用' : '已停用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleOpenModal('stage', stage.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-sky-500" title="編輯階段"><Edit3 className="w-3.5 h-3.5" /></button>
                          {isTerminal ? (
                            <span className="p-1 text-slate-300 dark:text-slate-600 cursor-not-allowed" title="必要結案階段不可刪除">
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <button onClick={() => handleDelete('stage', stage.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500" title="刪除階段"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Tab 2: 組織與人員分配 (Drag & Drop Assigner) --- */}
      {activeTab === 'org' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">建立多層組織部門。拖曳下方「未指派/人員卡片」丟入特定組織以快速指派組織。</p>
            <button
              onClick={() => handleOpenModal('org')}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>新增組織節點</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 左側與中間：組織架構樹 (佔 2/3) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm lg:col-span-2 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <FolderTree className="w-4 h-4 text-sky-500" />
                <span>多層級部門架構</span>
              </h3>
              
              <div className="space-y-4">
                {/* 頂層 Root 組織 (parentId 是 null 的) */}
                {organizations.filter(o => o.parentId === null).map((rootOrg) => {
                  const orgUsers = users.filter(u => u.orgId === rootOrg.id);
                  const isOver = dragOverOrgId === rootOrg.id;

                  return (
                    <div key={rootOrg.id} className="space-y-2">
                      <div 
                        onDragOver={(e) => handleOrgDragOver(e, rootOrg.id)}
                        onDragLeave={() => setDragOverOrgId(null)}
                        onDrop={(e) => handleOrgDrop(e, rootOrg.id)}
                        className={`
                          p-3 rounded-xl border flex items-center justify-between transition-all
                          ${isOver 
                            ? 'bg-sky-500/10 border-sky-500 border-dashed dark:bg-sky-950/20' 
                            : 'bg-slate-100 dark:bg-slate-850 border-slate-200 dark:border-slate-750'}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <FolderTree className="w-4 h-4 text-indigo-500" />
                          <span className="text-sm font-extrabold text-slate-850 dark:text-slate-100">{rootOrg.name} (核心)</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                            {orgUsers.length} 人
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleOpenModal('org', rootOrg.id)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-850 rounded text-slate-500 hover:text-sky-500"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete('org', rootOrg.id)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-850 rounded text-slate-500 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>

                      {/* 成員列表 */}
                      <div className="flex flex-wrap gap-2 pl-4 py-1">
                        {orgUsers.map((user) => (
                          <div
                            key={user.id}
                            draggable="true"
                            onDragStart={(e) => handleUserDragStart(e, user.id)}
                            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-grab active:cursor-grabbing flex items-center gap-1.5"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <span>{user.name}</span>
                            <span className="text-[9px] text-slate-400">({user.role})</span>
                          </div>
                        ))}
                      </div>

                      {/* 遞迴渲染子組織 */}
                      {renderOrgTree(rootOrg.id, 1)}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 右側：所有人員池 - 可以拖曳出來分配 (佔 1/3) */}
            <div 
              onDragOver={(e) => handleOrgDragOver(e, null)}
              onDragLeave={() => setDragOverOrgId(undefined)}
              onDrop={(e) => handleOrgDrop(e, null)}
              className={`
                bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between min-h-[400px]
                ${dragOverOrgId === null ? 'border-dashed border-sky-500 bg-sky-500/5' : 'border-slate-200 dark:border-slate-800'}
              `}
            >
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-500" />
                  <span>未指派組織的人員</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">您可以隨時把這裡的人員卡片拖曳到左側的組織中，也可以將指派完的人拖曳回此處解除指派。</p>

                <div className="space-y-2 mt-4">
                  {users.filter(u => u.orgId === null).map((user) => (
                    <div
                      key={user.id}
                      draggable="true"
                      onDragStart={(e) => handleUserDragStart(e, user.id)}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-850 rounded-2xl cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-indigo-500/50 transition-all flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{user.name}</p>
                        <p className="text-[9px] text-slate-400">{user.email}</p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase">
                        {user.role}
                      </span>
                    </div>
                  ))}
                  {users.filter(u => u.orgId === null).length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-8 italic bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      所有人員皆已成功指派組織
                    </p>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-sky-50/50 dark:bg-sky-950/10 border border-sky-100/50 dark:border-sky-900/30 p-3 rounded-2xl leading-normal mt-6">
                💡 <strong>操作秘笈：</strong> 按住卡片拖曳，放到組織灰色方塊中即可完成即時綁定。
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- Tab 3: 人員帳號管理 (Users CRUD) --- */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">建立與管理系統使用者的帳號權限。</p>
            <button
              onClick={() => handleOpenModal('user')}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>新增使用者</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">姓名</th>
                  <th className="px-6 py-3">電子郵件</th>
                  <th className="px-6 py-3">系統角色 (RBAC)</th>
                  <th className="px-6 py-3">所屬組織</th>
                  <th className="px-6 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                {users.map((u) => {
                  const userOrg = organizations.find(o => o.id === u.orgId);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20">
                      <td className="px-6 py-4 text-slate-850 dark:text-slate-100 font-extrabold">{u.name}</td>
                      <td className="px-6 py-4 text-slate-500">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          u.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                          u.role === 'BU_HEAD' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                          'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-350">{userOrg?.name || '無'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleOpenModal('user', u.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-sky-500"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete('user', u.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Tab 4: 客戶與聯絡人管理 --- */}
      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 公司管理 */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-sky-500" />
                  <span>客戶公司清單 (Companies)</span>
                </h3>
              </div>
              <button
                onClick={() => handleOpenModal('company')}
                className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 text-white font-bold text-xs rounded-xl shadow hover:bg-sky-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增公司</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">公司名稱</th>
                    <th className="px-4 py-3">所屬產業</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {companies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 font-semibold">
                      <td className="px-4 py-3.5 text-slate-800 dark:text-slate-200 font-extrabold">{c.name}</td>
                      <td className="px-4 py-3.5 text-slate-500">{c.industry}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleOpenModal('company', c.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-sky-500"><Edit3 className="w-3 h-3" /></button>
                          <button onClick={() => handleDelete('company', c.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 聯絡人管理 */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>客戶聯絡人 (Contacts)</span>
                </h3>
              </div>
              <button
                onClick={() => handleOpenModal('contact')}
                className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 text-white font-bold text-xs rounded-xl shadow hover:bg-sky-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增聯絡人</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">聯絡人</th>
                    <th className="px-4 py-3">電話與信箱</th>
                    <th className="px-4 py-3">所屬公司</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {contacts.map((cont) => {
                    const comp = companies.find(c => c.id === cont.companyId);
                    return (
                      <tr key={cont.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 font-semibold">
                        <td className="px-4 py-3.5 text-slate-800 dark:text-slate-200 font-extrabold">{cont.name}</td>
                        <td className="px-4 py-3.5">
                          <p className="text-slate-800 dark:text-slate-350">{cont.phone}</p>
                          <p className="text-[10px] text-slate-400">{cont.email}</p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 truncate max-w-[120px]">{comp?.name || '未指派'}</td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleOpenModal('contact', cont.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-sky-500"><Edit3 className="w-3 h-3" /></button>
                            <button onClick={() => handleDelete('contact', cont.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- Tab 5: 活動類型設定 (ActivityType CRUD) --- */}
      {activeTab === 'actTypes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">定義任務與聯繫歷程的動態互動類型（如會議、郵件等）。</p>
            <button
              onClick={() => handleOpenModal('actType')}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>新增活動類型</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">類型名稱</th>
                  <th className="px-6 py-3">代表圖示</th>
                  <th className="px-6 py-3">配色樣式</th>
                  <th className="px-6 py-3">量化單價 (選填)</th>
                  <th className="px-6 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                {activityTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                    <td className="px-6 py-4 text-slate-800 dark:text-slate-100 font-extrabold">{type.name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl text-slate-600 dark:text-slate-300 text-[11px] font-mono">
                        {type.icon}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {type.color}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                      {type.unitCost ? `NT$ ${type.unitCost.toLocaleString()}` : '未設定'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleOpenModal('actType', type.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-sky-500"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete('actType', type.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Tab 6: Product Line 設定 --- */}
      {activeTab === 'prodLines' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">設定供銷售商機選取的產品線類別 (Product Line)。</p>
            <button
              onClick={() => handleOpenModal('prodLine')}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>新增產品線</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">產品線名稱</th>
                  <th className="px-6 py-3">敘述說明</th>
                  <th className="px-6 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                {productLines.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 font-semibold">
                    <td className="px-6 py-4 text-slate-850 dark:text-slate-100 font-extrabold">{p.name}</td>
                    <td className="px-6 py-4 text-slate-500">{p.description || '無'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleOpenModal('prodLine', p.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-sky-500"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete('prodLine', p.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Tab 7: 預算項目設定 --- */}
      {activeTab === 'budgetItems' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">定義可供商機配置的費用預算類別（限 Admin）。</p>
            {isAdmin && (
              <button
                onClick={() => handleOpenModal('budgetItem')}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow hover:bg-indigo-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>新增預算項目</span>
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">預算項目名稱</th>
                  <th className="px-6 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                {budgetItems.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 font-semibold">
                    <td className="px-6 py-4 text-slate-850 dark:text-slate-100 font-extrabold">{b.name}</td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleOpenModal('budgetItem', b.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-sky-500"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete('budgetItem', b.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- 全局 CRUD Modal --- */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalType(null)}
              className="absolute right-5 top-5 p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <h3 className="text-md font-extrabold text-slate-800 dark:text-white mb-6">
              {editingId ? '修改' : '新增'} {
                modalType === 'stage' ? '銷售階段' :
                modalType === 'org' ? '組織部門' :
                modalType === 'user' ? '人員帳號' :
                modalType === 'company' ? '客戶公司' :
                modalType === 'contact' ? '客戶聯絡人' :
                modalType === 'actType' ? '活動互動類型' :
                modalType === 'prodLine' ? '產品線' :
                '預算項目'
              }
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Form 1: Stage */}
              {modalType === 'stage' && (() => {
                const isTerminal = stageForm.outcome === 'WON' || stageForm.outcome === 'LOST';
                return (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">階段名稱 *</label>
                      <input
                        type="text" required value={stageForm.name}
                        onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:ring-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">顯示順序 *</label>
                        <input
                          type="number" required value={stageForm.displayOrder}
                          onChange={(e) => setStageForm({ ...stageForm, displayOrder: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:ring-2"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          預設贏率 {isTerminal ? '(系統鎖定)' : '(1-99%) *'}
                        </label>
                        <input
                          type="number" required min={isTerminal ? 100 : 1} max={isTerminal ? 100 : 99}
                          disabled={isTerminal}
                          value={stageForm.defaultWinProbability}
                          onChange={(e) => setStageForm({ ...stageForm, defaultWinProbability: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm disabled:opacity-60"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox" id="stageIsActive" checked={stageForm.isActive}
                        disabled={isTerminal}
                        onChange={(e) => setStageForm({ ...stageForm, isActive: e.target.checked })}
                        className="w-4 h-4 rounded disabled:opacity-60"
                      />
                      <label htmlFor="stageIsActive" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        {isTerminal ? '必要結案階段（固定啟用）' : '啟用此階段'}
                      </label>
                    </div>
                  </>
                );
              })()}

              {/* Form 2: Org (排除自身與所有後代以防止循環架構 — 修復 B-3) */}
              {modalType === 'org' && (() => {
                const blockedIds = editingId ? new Set([editingId, ...getDescendantOrgIds(editingId, organizations)]) : new Set<string>();
                return (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">組織/部門名稱 *</label>
                      <input
                        type="text" required placeholder="如: 銷售一組" value={orgForm.name}
                        onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:ring-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">父部門 (複層指派)</label>
                      <select
                        value={orgForm.parentId}
                        onChange={(e) => setOrgForm({ ...orgForm, parentId: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:ring-2"
                      >
                        <option value="" className="bg-white dark:bg-slate-950">無 (設定為最上層總公司)</option>
                        {organizations.filter(o => !blockedIds.has(o.id)).map(o => (
                          <option key={o.id} value={o.id} className="bg-white dark:bg-slate-950">{o.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                );
              })()}

              {/* Form 3: User */}
              {modalType === 'user' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">人員姓名 *</label>
                    <input
                      type="text" required placeholder="例如: 謝科長" value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email *</label>
                    <input
                      type="email" required placeholder="example@crm.com" value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">系統角色 *</label>
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                      >
                        <option value="AM">AM (業務代表)</option>
                        <option value="BU_HEAD">BU head (部門主管)</option>
                        <option value="ADMIN">ADMIN (管理員)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">所屬部門</label>
                      <select
                        value={userForm.orgId}
                        onChange={(e) => setUserForm({ ...userForm, orgId: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                      >
                        <option value="">未分配組織</option>
                        {organizations.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Form 4: Company */}
              {modalType === 'company' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">客戶公司名稱 *</label>
                    <input
                      type="text" required placeholder="如: 聯發科技" value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">所屬產業</label>
                    <input
                      type="text" placeholder="如: 半導體 / 生技醫療" value={companyForm.industry}
                      onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                    />
                  </div>
                </>
              )}

              {/* Form 5: Contact */}
              {modalType === 'contact' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">聯絡人姓名 *</label>
                    <input
                      type="text" required placeholder="張經理" value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">聯絡電話</label>
                      <input
                        type="text" placeholder="0911-222-333" value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email 信箱</label>
                      <input
                        type="email" placeholder="cont@company.com" value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">所屬公司 *</label>
                    <select
                      value={contactForm.companyId}
                      onChange={(e) => setContactForm({ ...contactForm, companyId: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                    >
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Form 6: Activity Type */}
              {modalType === 'actType' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">活動類型名稱 *</label>
                    <input
                      type="text" required placeholder="例如: 合約審查 / 客戶拜訪" value={actTypeForm.name}
                      onChange={(e) => setActTypeForm({ ...actTypeForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">代表圖示 *</label>
                      <select
                        value={actTypeForm.icon}
                        onChange={(e) => setActTypeForm({ ...actTypeForm, icon: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                      >
                        <option value="CheckSquare">CheckSquare (打勾勾)</option>
                        <option value="Video">Video (視訊會議)</option>
                        <option value="FileText">FileText (合約/文件)</option>
                        <option value="Calendar">Calendar (會議/日程)</option>
                        <option value="Coffee">Coffee (拜訪交流/餐敘)</option>
                        <option value="MessageSquare">MessageSquare (通訊軟體/微信聯絡)</option>
                        <option value="Coins">Coins (報價/談判)</option>
                        <option value="Gift">Gift (公關送禮/禮品)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">配色風格 *</label>
                      <select
                        value={actTypeForm.color}
                        onChange={(e) => setActTypeForm({ ...actTypeForm, color: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:ring-2"
                      >
                        <option value="blue">Blue (天空藍)</option>
                        <option value="purple">Purple (神秘紫)</option>
                        <option value="emerald">Emerald (健康綠)</option>
                        <option value="amber">Amber (琥珀橘)</option>
                        <option value="rose">Rose (玫瑰紅)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">單次量化單價 / 成本 (NTD，選填)</label>
                    <input
                      type="number" min="0" placeholder="如: 1500（供管理指標頁乘上活動次數）"
                      value={actTypeForm.unitCost}
                      onChange={(e) => setActTypeForm({ ...actTypeForm, unitCost: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:ring-2"
                    />
                  </div>
                </>
              )}

              {/* Form 7: Product Line */}
              {modalType === 'prodLine' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">產品線名稱 *</label>
                    <input
                      type="text" required placeholder="如: 製造執行系統 (MES)" value={productLineForm.name}
                      onChange={(e) => setProductLineForm({ ...productLineForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">說明敘述</label>
                    <textarea
                      placeholder="請輸入此產品線的簡短業務描述..."
                      value={productLineForm.description}
                      onChange={(e) => setProductLineForm({ ...productLineForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {/* Form 8: Budget Item */}
              {modalType === 'budgetItem' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">預算項目名稱 *</label>
                    <input
                      type="text" required placeholder="如: 差旅交通費" value={budgetItemForm.name}
                      onChange={(e) => setBudgetItemForm({ ...budgetItemForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                    />
                  </div>
                </>
              )}

              {/* 按鈕組 */}
              <div className="flex items-center justify-end gap-3 pt-6 mt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button" onClick={() => setModalType(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold rounded-xl text-xs hover:from-sky-700 hover:to-indigo-700 shadow-md shadow-sky-600/10 transition"
                >
                  儲存
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
