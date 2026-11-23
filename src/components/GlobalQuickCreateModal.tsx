import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import type { QuickCreateTab } from '../context/LayoutContext';
import { db } from '../services/db';
import type {
  Company,
  User,
  Stage,
  ProductLine,
  Opportunity,
  ActivityTypeConfig,
  Activity,
  Contact,
} from '../services/db';
import { X, Plus, Briefcase, CheckSquare, Building2, ChevronDown, ChevronRight } from 'lucide-react';

export const GlobalQuickCreateModal: React.FC = () => {
  const { currentUser } = useAuth();
  const { isQuickCreateOpen, quickCreateTab, closeQuickCreate, bumpDataVersion, theme } = useLayout();

  const [tab, setTab] = useState<QuickCreateTab>(quickCreateTab);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeConfig[]>([]);

  // Opportunity form
  const [oppTitle, setOppTitle] = useState('');
  const [oppCompanyId, setOppCompanyId] = useState('');
  const [oppUserId, setOppUserId] = useState('');
  const [oppProductLineId, setOppProductLineId] = useState('');
  const [oppQty, setOppQty] = useState('');
  const [oppPrice, setOppPrice] = useState('');
  const [showAdvancedOpp, setShowAdvancedOpp] = useState(false);
  const [oppSchedules, setOppSchedules] = useState<{ [stageId: string]: string }>({});

  // Inline new company inside Opportunity tab (fixes chicken-and-egg friction!)
  const [inlineNewComp, setInlineNewComp] = useState(false);
  const [inlineCompName, setInlineCompName] = useState('');
  const [inlineCompIndustry, setInlineCompIndustry] = useState('');

  // Activity form
  const [actOppId, setActOppId] = useState('');
  const [actType, setActType] = useState('');
  const [actDesc, setActDesc] = useState('');
  const [actDueDate, setActDueDate] = useState('');

  // Company + Contact form
  const [compName, setCompName] = useState('');
  const [compIndustry, setCompIndustry] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    setTab(quickCreateTab);
  }, [quickCreateTab, isQuickCreateOpen]);

  useEffect(() => {
    if (!isQuickCreateOpen || !currentUser) return;
    const load = async () => {
      const [comps, usrs, stgs, prods, opps, actTypes] = await Promise.all([
        db.getCompanies(),
        db.getUsers(),
        db.getStages(true),
        db.getProductLines(),
        db.getOpportunities(currentUser.role, currentUser.id),
        db.getActivityTypes(),
      ]);
      setCompanies(comps);
      setUsers(usrs);
      setStages(stgs);
      setProductLines(prods);
      setOpportunities(opps);
      setActivityTypes(actTypes);

      setOppTitle('');
      setOppCompanyId(comps[0]?.id || '');
      setOppUserId(
        currentUser.role === 'AM'
          ? currentUser.id
          : usrs.find(u => u.role === 'AM')?.id || currentUser.id
      );
      setOppProductLineId(prods[0]?.id || '');
      setOppQty('');
      setOppPrice('');
      setInlineNewComp(false);
      setInlineCompName('');
      setInlineCompIndustry('');
      setShowAdvancedOpp(false);
      setOppSchedules(stgs[0] ? { [stgs[0].id]: new Date().toISOString().split('T')[0] } : {});

      setActOppId(opps[0]?.id || '');
      setActType(actTypes[0]?.name || '待辦任務');
      setActDesc('');
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
      setActDueDate(tomorrow.toISOString().slice(0, 16));

      setCompName('');
      setCompIndustry('');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
    };
    load();
  }, [isQuickCreateOpen, currentUser]);

  if (!isQuickCreateOpen) return null;

  const handleCreateOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppTitle.trim()) return;

    let finalCompanyId = oppCompanyId;
    if (inlineNewComp) {
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

    const firstStage = stages[0];
    const qty = parseInt(oppQty) || 0;
    const price = parseFloat(oppPrice) || 0;
    const defaultClose = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Determine latest scheduled date or default
    let latestDate = defaultClose;
    const descStages = [...stages].sort((a, b) => b.displayOrder - a.displayOrder);
    for (const s of descStages) {
      if (oppSchedules[s.id]) {
        latestDate = oppSchedules[s.id];
        break;
      }
    }

    const opp: Opportunity = {
      id: `opp-${Date.now()}`,
      companyId: finalCompanyId,
      userId: oppUserId || currentUser?.id || 'user-3',
      stageId: firstStage?.id || 'stage-1',
      title: oppTitle.trim(),
      amount: qty * price,
      winProbability: firstStage?.defaultWinProbability ?? 10,
      expectedCloseDate: latestDate,
      productLineId: oppProductLineId,
      monthlyQuantity: qty,
      unitPrice: price,
      orgId: null,
      schedules: oppSchedules,
      budgets: [],
    };

    await db.saveOpportunity(opp);
    bumpDataVersion();
    closeQuickCreate();
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actOppId || !actDesc.trim() || !actDueDate) {
      alert('請選擇關聯商機並填寫內容與時間');
      return;
    }
    const targetOpp = opportunities.find(o => o.id === actOppId);
    const act: Activity = {
      id: `act-${Date.now()}`,
      opportunityId: actOppId,
      userId: targetOpp?.userId || currentUser?.id || 'user-3',
      type: actType || '待辦任務',
      description: actDesc.trim(),
      dueDate: actDueDate.replace('T', ' '),
      isCompleted: false,
    };
    await db.saveActivity(act);
    bumpDataVersion();
    closeQuickCreate();
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim()) {
      alert('請輸入公司名稱');
      return;
    }
    const newComp: Company = {
      id: `comp-${Date.now()}`,
      name: compName.trim(),
      industry: compIndustry.trim() || '一般企業',
      createdAt: new Date().toISOString().split('T')[0],
    };
    await db.saveCompany(newComp);

    if (contactName.trim()) {
      const newContact: Contact = {
        id: `cont-${Date.now()}`,
        companyId: newComp.id,
        name: contactName.trim(),
        email: contactEmail.trim(),
        phone: contactPhone.trim(),
      };
      await db.saveContact(newContact);
    }

    bumpDataVersion();
    closeQuickCreate();
  };

  const monthlyRev = (parseInt(oppQty) || 0) * (parseFloat(oppPrice) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Plus className={`w-4 h-4 ${theme.accentText}`} />
              <span>快速建立 (Ctrl/⌘ + K)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              在任何頁面一鍵新增商機、活動紀錄或客戶窗口
            </p>
          </div>
          <button
            onClick={closeQuickCreate}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 flex gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          {[
            { id: 'opp' as const, label: '新增商機', icon: Briefcase },
            { id: 'act' as const, label: '登記活動', icon: CheckSquare },
            { id: 'comp' as const, label: '新增客戶與窗口', icon: Building2 },
          ].map(item => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-colors ${
                  active
                    ? `${theme.accentText} border-current`
                    : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        {tab === 'opp' && (
          <form onSubmit={handleCreateOpp} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">商機名稱 *</label>
              <input
                type="text"
                required
                placeholder="例如：TSMC 智慧排程二期專案"
                value={oppTitle}
                onChange={e => setOppTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-600 dark:text-slate-300">客戶公司 *</label>
                <button
                  type="button"
                  onClick={() => setInlineNewComp(!inlineNewComp)}
                  className={`text-xs font-bold hover:underline ${theme.accentText}`}
                >
                  {inlineNewComp ? '← 回選單選擇現有公司' : '+ 找不到？直接內聯建立新客戶'}
                </button>
              </div>
              {inlineNewComp ? (
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
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
                    placeholder="產業別 (例：半導體)"
                    value={inlineCompIndustry}
                    onChange={e => setInlineCompIndustry(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
              ) : (
                <select
                  value={oppCompanyId}
                  onChange={e => setOppCompanyId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-slate-950">
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">Product Line</label>
                <select
                  value={oppProductLineId}
                  onChange={e => setOppProductLineId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                >
                  {productLines.map(p => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-slate-950">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">負責業務 (AM)</label>
                <select
                  value={oppUserId}
                  disabled={currentUser?.role === 'AM'}
                  onChange={e => setOppUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 disabled:opacity-60"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id} className="bg-white dark:bg-slate-950">
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">每月數量</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={oppQty}
                  onChange={e => setOppQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">預估銷售單價</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={oppPrice}
                  onChange={e => setOppPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">Monthly Deal Revenue (NTD)</label>
                <div className={`px-3 py-2 rounded-xl border font-mono font-extrabold ${theme.accentSoftBg} ${theme.accentBorder} ${theme.accentText}`}>
                  NT$ {monthlyRev.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Optional collapsible schedule */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvancedOpp(!showAdvancedOpp)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between font-bold text-slate-600 dark:text-slate-300"
              >
                <span>選填：設定各階段目標排程日期 (日後亦可於商機卡片編輯)</span>
                {showAdvancedOpp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {showAdvancedOpp && (
                <div className="p-3.5 grid grid-cols-2 gap-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  {stages.filter(st => st.outcome !== 'LOST').map(st => (
                    <div key={st.id}>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        {st.name}
                      </label>
                      <input
                        type="date"
                        value={oppSchedules[st.id] || ''}
                        onChange={e => setOppSchedules({ ...oppSchedules, [st.id]: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={closeQuickCreate}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                取消
              </button>
              <button type="submit" className={`px-5 py-2 rounded-xl font-bold transition-colors ${theme.primaryBtn}`}>
                建立商機
              </button>
            </div>
          </form>
        )}

        {tab === 'act' && (
          <form onSubmit={handleCreateActivity} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">關聯商機 *</label>
              <select
                required
                value={actOppId}
                onChange={e => setActOppId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
              >
                {opportunities.map(o => (
                  <option key={o.id} value={o.id} className="bg-white dark:bg-slate-950">
                    {o.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">活動類型</label>
                <select
                  value={actType}
                  onChange={e => setActType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                >
                  {activityTypes.map(t => (
                    <option key={t.id} value={t.name} className="bg-white dark:bg-slate-950">
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">預定執行/到期時間 *</label>
                <input
                  type="datetime-local"
                  required
                  value={actDueDate}
                  onChange={e => setActDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">活動紀錄內容 *</label>
              <textarea
                rows={4}
                required
                placeholder="記錄客戶需求、價格/預算回饋、技術 POC 進度或競品資訊（系統將自動預覽關鍵字標籤）..."
                value={actDesc}
                onChange={e => setActDesc(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={closeQuickCreate}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                取消
              </button>
              <button type="submit" className={`px-5 py-2 rounded-xl font-bold transition-colors ${theme.primaryBtn}`}>
                儲存活動
              </button>
            </div>
          </form>
        )}

        {tab === 'comp' && (
          <form onSubmit={handleCreateCompany} className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">客戶公司名稱 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：台達電子 (Delta)"
                  value={compName}
                  onChange={e => setCompName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1.5">所屬產業</label>
                <input
                  type="text"
                  placeholder="例如：自動化與電源"
                  value={compIndustry}
                  onChange={e => setCompIndustry(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <p className="font-bold text-slate-600 dark:text-slate-300">同時建立主要聯絡窗口 (選填)</p>
              <div className="grid grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="窗口姓名"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
                <input
                  type="tel"
                  placeholder="聯絡電話"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={closeQuickCreate}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                取消
              </button>
              <button type="submit" className={`px-5 py-2 rounded-xl font-bold transition-colors ${theme.primaryBtn}`}>
                建立客戶
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
