import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { db } from '../services/db';
import type { Opportunity, Company, User, Stage, Activity, Contact, ActivityTypeConfig } from '../services/db';
import { inferPreviewTags, getTagToneClass } from '../utils/aiTagPreview';
import { Sparkles, X, Building2, User as UserIcon, Plus, Phone, Mail, CheckCircle2, Circle } from 'lucide-react';

export const CopilotPanel: React.FC<{ onGoToPipeline?: (companyId: string) => void }> = ({ onGoToPipeline }) => {
  const { currentUser } = useAuth();
  const { copilotOppId, setCopilotOppId, setIsCopilotOpen, dataVersion, bumpDataVersion, theme } = useLayout();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [actTypes, setActTypes] = useState<ActivityTypeConfig[]>([]);

  const [quickDesc, setQuickDesc] = useState('');
  const [quickType, setQuickType] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      const [opps, comps, usrs, stgs, acts, conts, types] = await Promise.all([
        db.getOpportunities(currentUser.role, currentUser.id),
        db.getCompanies(),
        db.getUsers(),
        db.getStages(true),
        db.getActivities(),
        db.getContacts(),
        db.getActivityTypes(),
      ]);
      setOpportunities(opps);
      setCompanies(comps);
      setUsers(usrs);
      setStages(stgs);
      setActivities(acts);
      setContacts(conts);
      setActTypes(types);
      if (types.length > 0 && !quickType) setQuickType(types[0].name);
      if (!copilotOppId && opps.length > 0) {
        setCopilotOppId(opps[0].id);
      }
    };
    load();
  }, [currentUser, dataVersion]);

  const selectedOpp = opportunities.find(o => o.id === copilotOppId) || opportunities[0] || null;
  const company = selectedOpp ? companies.find(c => c.id === selectedOpp.companyId) : null;
  const owner = selectedOpp ? users.find(u => u.id === selectedOpp.userId) : null;
  const stage = selectedOpp ? stages.find(s => s.id === selectedOpp.stageId) : null;
  const oppActivities = selectedOpp
    ? activities.filter(a => a.opportunityId === selectedOpp.id).sort((a, b) => b.dueDate.localeCompare(a.dueDate))
    : [];
  const companyContacts = company ? contacts.filter(c => c.companyId === company.id) : [];

  const aiTags = selectedOpp
    ? inferPreviewTags([selectedOpp.title, ...oppActivities.map(a => a.description)], selectedOpp.tags)
    : [];

  const handleQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp || !quickDesc.trim()) return;
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    await db.saveActivity({
      id: `act-${Date.now()}`,
      opportunityId: selectedOpp.id,
      userId: selectedOpp.userId,
      type: quickType || '待辦任務',
      description: quickDesc.trim(),
      dueDate: tomorrow.toISOString().slice(0, 16).replace('T', ' '),
      isCompleted: false,
    });
    setQuickDesc('');
    bumpDataVersion();
  };

  const toggleActivity = async (act: Activity) => {
    await db.saveActivity({ ...act, isCompleted: !act.isCompleted });
    bumpDataVersion();
  };

  return (
    <aside className="hidden xl:flex w-80 2xl:w-96 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className={`w-4 h-4 flex-shrink-0 ${theme.accentText}`} />
          <span className="text-xs font-extrabold text-slate-800 dark:text-white truncate">
            情境詳情 & AI 副駕
          </span>
        </div>
        <button
          onClick={() => setIsCopilotOpen(false)}
          className="p-1 rounded-lg text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200"
          title="收合右側面板（全螢幕檢視）"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selector */}
      {opportunities.length > 0 && (
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
          <select
            value={selectedOpp?.id || ''}
            onChange={e => setCopilotOppId(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            {opportunities.map(o => (
              <option key={o.id} value={o.id} className="bg-white dark:bg-slate-950">
                {o.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {!selectedOpp ? (
          <div className="py-12 text-center text-slate-400">
            目前無商機資料，請點擊上方「+ 快速建立」新增。
          </div>
        ) : (
          <>
            {/* Deal Overview */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white leading-snug">
                  {selectedOpp.title}
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0 ${theme.accentSoftBg} ${theme.accentText}`}>
                  {stage?.name} · {selectedOpp.winProbability}%
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <button
                  onClick={() => company && onGoToPipeline?.(company.id)}
                  className="inline-flex items-center gap-1 hover:underline font-semibold"
                >
                  <Building2 className="w-3 h-3" /> {company?.name || '未知客戶'}
                </button>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <UserIcon className="w-3 h-3" /> {owner?.name?.split(' ')[0] || '未指派'}
                </span>
                <span>·</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                  NT$ {(selectedOpp.amount / 10000).toFixed(0)} 萬/月
                </span>
              </div>
            </div>

            {/* AI Auto-Tag & Context Card (Extensibility Preview) */}
            <div className={`p-3 rounded-xl border ${theme.accentSoftBg} ${theme.accentBorder} space-y-2`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-extrabold flex items-center gap-1 ${theme.accentText}`}>
                  <Sparkles className="w-3.5 h-3.5" /> AI 活動標籤預覽 (LLM 預留位)
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  分析 {oppActivities.length} 筆紀錄
                </span>
              </div>
              {aiTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {aiTags.map(t => (
                    <span
                      key={t.label}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getTagToneClass(t.tone)}`}
                    >
                      ✦ #{t.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  尚無足夠活動關鍵字，持續記錄後未來可由 LLM 自動提取風險與商機標籤。
                </p>
              )}
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {oppActivities.length === 0
                  ? '建議儘速記錄首次接觸或需求確認進度，以利追蹤後續排程。'
                  : `最近互動（${oppActivities[0].dueDate.slice(0, 10)}）：${oppActivities[0].description.slice(0, 60)}${oppActivities[0].description.length > 60 ? '...' : ''}`}
              </p>
            </div>

            {/* Milestones */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">階段目標排程</div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 space-y-2">
                {stages.slice(0, -1).map(st => {
                  const isCur = selectedOpp.stageId === st.id;
                  return (
                    <div key={st.id} className="flex items-center justify-between text-[11px]">
                      <span className={isCur ? `font-extrabold ${theme.accentText}` : 'text-slate-600 dark:text-slate-300'}>
                        {isCur ? '● ' : '○ '}{st.name}
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {selectedOpp.schedules?.[st.id] || '未定'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Activity Log */}
            <form onSubmit={handleQuickLog} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">快速登記活動</div>
              <input
                type="text"
                required
                placeholder="輸入拜訪摘要、報價或 POC 進度..."
                value={quickDesc}
                onChange={e => setQuickDesc(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs"
              />
              <div className="flex gap-2">
                <select
                  value={quickType}
                  onChange={e => setQuickType(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs"
                >
                  {actTypes.map(t => (
                    <option key={t.id} value={t.name} className="bg-white dark:bg-slate-950">
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 ${theme.primaryBtn}`}
                >
                  <Plus className="w-3.5 h-3.5" /> 登記
                </button>
              </div>
            </form>

            {/* Recent Activities */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">活動紀錄 ({oppActivities.length})</div>
              <div className="space-y-2">
                {oppActivities.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-2">尚無活動紀錄</p>
                ) : (
                  oppActivities.slice(0, 6).map(act => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 flex items-start gap-2"
                    >
                      <button
                        onClick={() => toggleActivity(act)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-500 flex-shrink-0"
                        title="切換完成狀態"
                      >
                        {act.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[11px] leading-snug ${act.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200 font-medium'}`}>
                          {act.description}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span>{act.type}</span>
                          <span className="font-mono">{act.dueDate.slice(0, 10)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Contacts Quick List */}
            {companyContacts.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">客戶窗口 ({companyContacts.length})</div>
                <div className="space-y-1.5">
                  {companyContacts.map(c => (
                    <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800 text-[11px]">
                      <div className="font-bold text-slate-700 dark:text-slate-200">{c.name}</div>
                      <div className="flex flex-col gap-0.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {c.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                        {c.email && <span className="inline-flex items-center gap-1 truncate"><Mail className="w-3 h-3" /> {c.email}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
