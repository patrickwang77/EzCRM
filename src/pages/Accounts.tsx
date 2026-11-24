import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { db, getEligibleSalesReps, getVisibleOrgsForUser } from '../services/db';
import type { Company, Contact, Opportunity, Activity, Stage, Organization, User } from '../services/db';
import { exportToCsv } from '../utils/exportCsv';
import { getLocalTodayIso } from '../utils/dateUtils';
import { inferPreviewTags, getTagToneClass } from '../utils/aiTagPreview';
import {
  Building2,
  Users,
  Briefcase,
  Search,
  Download,
  Plus,
  ArrowRight,
  Phone,
  Mail,
  Sparkles,
  CheckCircle2,
  FolderTree,
  User as UserIcon,
} from 'lucide-react';

interface AccountsProps {
  setActiveTab: (tab: string) => void;
}

export const Accounts: React.FC<AccountsProps> = ({ setActiveTab }) => {
  const { currentUser } = useAuth();
  const { theme, openQuickCreate, dataVersion, bumpDataVersion } = useLayout();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Slicers (Org + Conditional Sales Rep + Search)
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Quick inline add contact for selected company
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');

  useEffect(() => {
    const loadBase = async () => {
      const [orgs, usrs] = await Promise.all([db.getOrganizations(), db.getUsers()]);
      setOrganizations(orgs);
      setUsers(usrs);
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
    const load = async () => {
      const filters = {
        orgId: selectedOrgId || undefined,
        userId: selectedUserId || undefined,
      };
      const [comps, conts, opps, acts, stgs] = await Promise.all([
        db.getCompanies(),
        db.getContacts(),
        db.getOpportunities(currentUser.role, currentUser.id, filters),
        db.getActivities(),
        db.getStages(true),
      ]);
      setCompanies(comps);
      setContacts(conts);
      setOpportunities(opps);
      setActivities(acts);
      setStages(stgs);
      if (!selectedCompanyId && comps.length > 0) {
        setSelectedCompanyId(comps[0].id);
      }
    };
    load();
  }, [currentUser, selectedOrgId, selectedUserId, dataVersion]);

  const stageMap = useMemo(() => new Map(stages.map(s => [s.id, s])), [stages]);

  const getCompanyMetrics = (companyId: string) => {
    const compOpps = opportunities.filter(o => o.companyId === companyId);
    const activeOpps = compOpps.filter(o => stageMap.get(o.stageId)?.outcome !== 'LOST');
    const totalAmt = activeOpps.reduce((s, o) => s + o.amount, 0);
    const weightedAmt = activeOpps.reduce((s, o) => s + o.amount * (o.winProbability / 100), 0);
    const oppIds = new Set(compOpps.map(o => o.id));
    const compActs = activities
      .filter(a => oppIds.has(a.opportunityId))
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    const compContacts = contacts.filter(c => c.companyId === companyId);
    const tags = inferPreviewTags([
      ...compOpps.map(o => o.title),
      ...compActs.map(a => a.description),
    ]);
    return { compOpps, activeOpps, totalAmt, weightedAmt, compActs, compContacts, tags };
  };

  // 預設依潛在商機總額由高到低排行
  const filteredCompanies = companies
    .filter(
      c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.industry.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => getCompanyMetrics(b.id).totalAmt - getCompanyMetrics(a.id).totalAmt);

  const selectedCompany =
    filteredCompanies.find(c => c.id === selectedCompanyId) || filteredCompanies[0] || null;

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

  const formatCompact = (val: number) =>
    val >= 10000 ? `NT$ ${(val / 10000).toFixed(0)} 萬` : `NT$ ${val.toLocaleString()}`;

  const handleExportAccounts = () => {
    const headers = ['客戶公司', '產業別', '聯絡人數', '活躍商機數', '月估總金額(NTD)', '加權預估金額(NTD)', '活動總數', 'AI關鍵字預覽標籤'];
    const rows = filteredCompanies.map(c => {
      const m = getCompanyMetrics(c.id);
      return [
        c.name,
        c.industry,
        m.compContacts.length,
        m.activeOpps.length,
        m.totalAmt,
        Math.round(m.weightedAmt),
        m.compActs.length,
        m.tags.map(t => `#${t.label}`).join(' '),
      ];
    });
    exportToCsv(`CRM_客戶總覽_${getLocalTodayIso()}.csv`, headers, rows);
  };

  const handleGoToPipeline = (companyId: string) => {
    sessionStorage.setItem('autofocus_company_id', companyId);
    setActiveTab('pipeline');
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !newContactName.trim()) return;
    await db.saveContact({
      id: `cont-${Date.now()}`,
      companyId: selectedCompany.id,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      email: newContactEmail.trim(),
    });
    setNewContactName('');
    setNewContactPhone('');
    setNewContactEmail('');
    bumpDataVersion();
  };

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Building2 className={`w-5 h-5 ${theme.accentText}`} />
            <span>客戶總覽 360° (Accounts)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            彙整客戶商機、聯絡窗口與跨案活動時間軸，並預留「by 客戶 LLM 商機提取與分析」專屬區
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser?.role !== 'AM' && (
            <div className="flex items-center gap-1.5">
              <FolderTree className={`w-4 h-4 ${theme.accentText}`} />
              <select
                value={selectedOrgId}
                onChange={e => setSelectedOrgId(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="" className="bg-white dark:bg-slate-950">所有部門</option>
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
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-200"
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

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋公司名稱或產業..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 w-44 sm:w-52"
            />
          </div>
          <button
            onClick={handleExportAccounts}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出 CSV</span>
          </button>
          <button
            onClick={() => openQuickCreate('comp')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold ${theme.primaryBtn}`}
          >
            <Plus className="w-4 h-4" />
            <span>新增客戶</span>
          </button>
        </div>
      </div>

      {/* Master-Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List */}
        <div className="lg:col-span-4 space-y-2.5">
          {filteredCompanies.map(comp => {
            const m = getCompanyMetrics(comp.id);
            const isSelected = selectedCompany?.id === comp.id;
            return (
              <button
                key={comp.id}
                onClick={() => setSelectedCompanyId(comp.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? `bg-white dark:bg-slate-900 ${theme.accentBorder} ring-2 ring-inset ring-current/15 shadow-sm`
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className={`text-sm font-extrabold truncate ${isSelected ? theme.accentText : 'text-slate-800 dark:text-white'}`}>
                      {comp.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {comp.industry} · {m.compContacts.length} 位窗口
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-extrabold font-mono text-slate-800 dark:text-slate-100">
                      {formatCompact(m.totalAmt)}
                    </div>
                    <div className="text-[10px] text-slate-400">{m.activeOpps.length} 筆活躍商機</div>
                  </div>
                </div>
                {m.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {m.tags.map(t => (
                      <span
                        key={t.label}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${getTagToneClass(t.tone)}`}
                      >
                        ✦ #{t.label}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
          {filteredCompanies.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              找不到符合條件的客戶公司
            </div>
          )}
        </div>

        {/* Right 360 Detail Panel */}
        <div className="lg:col-span-8">
          {selectedCompany ? (() => {
            const m = getCompanyMetrics(selectedCompany.id);
            return (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-xs">
                {/* Account Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">{selectedCompany.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {selectedCompany.industry}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">建檔日期：{selectedCompany.createdAt}</p>
                  </div>
                  <button
                    onClick={() => handleGoToPipeline(selectedCompany.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold ${theme.primaryBtn}`}
                  >
                    <span>在 Pipeline 檢視此客戶</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* KPI Mini Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400">活躍商機總額 / 月</div>
                    <div className="text-base font-extrabold text-slate-800 dark:text-white mt-1 font-mono">
                      {formatCompact(m.totalAmt)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400">加權預估業績</div>
                    <div className={`text-base font-extrabold mt-1 font-mono ${theme.accentText}`}>
                      {formatCompact(m.weightedAmt)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400">累積活動紀錄</div>
                    <div className="text-base font-extrabold text-slate-800 dark:text-white mt-1">
                      {m.compActs.length} 筆
                    </div>
                  </div>
                </div>

                {/* AI Account Extraction & Analysis Slot (Future LLM Hook) */}
                <div className={`p-4 rounded-2xl border ${theme.accentSoftBg} ${theme.accentBorder} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-extrabold flex items-center gap-1.5 ${theme.accentText}`}>
                      <Sparkles className="w-4 h-4" /> AI 客戶商機提取與分析（LLM 擴充預留區）
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      已彙整 {m.compOpps.length} 商機 · {m.compActs.length} 活動
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    {m.compOpps.length === 0
                      ? '此客戶尚未建立商機，建議由窗口訪談紀錄切入開發首筆案件。'
                      : `目前共追蹤 ${m.activeOpps.length} 筆活躍商機（月估 ${formatCompact(m.totalAmt)}）。${
                          m.tags.length > 0
                            ? `從活動文字偵測到關鍵訊號：${m.tags.map(t => `#${t.label}`).join('、')}。`
                            : '持續累積活動紀錄後，未來可由此一鍵生成客戶健康度與交叉銷售分析報告。'
                        }`}
                  </p>
                </div>

                {/* Opportunities List */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> 關聯商機列表 ({m.compOpps.length})
                  </h4>
                  <div className="space-y-2">
                    {m.compOpps.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">尚無關聯商機</p>
                    ) : (
                      m.compOpps.map(o => {
                        const st = stages.find(s => s.id === o.stageId);
                        return (
                          <div
                            key={o.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{o.title}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                階段：{st?.name || '未知'} · 預計結案：{o.expectedCloseDate}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-mono font-bold text-slate-800 dark:text-slate-100">
                                {formatCompact(o.amount)}
                              </div>
                              <div className={`text-[10px] font-bold ${theme.accentText}`}>贏率 {o.winProbability}%</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Contacts + Quick Inline Add Contact */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> 聯絡窗口名冊 ({m.compContacts.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {m.compContacts.map(c => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 text-xs"
                      >
                        <div className="font-extrabold text-slate-800 dark:text-slate-100">{c.name}</div>
                        <div className="flex flex-col gap-1 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {c.phone && <span className="inline-flex items-center gap-1.5"><Phone className="w-3 h-3" /> {c.phone}</span>}
                          {c.email && <span className="inline-flex items-center gap-1.5 truncate"><Mail className="w-3 h-3" /> {c.email}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddContact} className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <input
                      type="text"
                      required
                      placeholder="新增窗口姓名 *"
                      value={newContactName}
                      onChange={e => setNewContactName(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                    />
                    <input
                      type="tel"
                      placeholder="電話"
                      value={newContactPhone}
                      onChange={e => setNewContactPhone(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newContactEmail}
                      onChange={e => setNewContactEmail(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                    />
                    <button type="submit" className={`px-3 py-1.5 rounded-lg font-bold ${theme.primaryBtn}`}>
                      + 加入窗口
                    </button>
                  </form>
                </div>

                {/* Recent Cross-Deal Activities */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 跨商機活動歷程 ({m.compActs.length})
                  </h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {m.compActs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">尚無活動紀錄</p>
                    ) : (
                      m.compActs.map(act => (
                        <div
                          key={act.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 text-xs flex items-start justify-between gap-3"
                        >
                          <div>
                            <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 mr-2">
                              {act.type}
                            </span>
                            <span className="text-slate-700 dark:text-slate-200">{act.description}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                            {act.dueDate.slice(0, 10)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })() : null}
        </div>
      </div>
    </div>
  );
};
