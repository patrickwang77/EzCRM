import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { db } from '../services/db';
import type { Company, Organization, Activity, Opportunity, User, ActivityTypeConfig, Contact } from '../services/db';
import { exportToCsv } from '../utils/exportCsv';
import { inferPreviewTags, getTagToneClass } from '../utils/aiTagPreview';
import { 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square,
  Video, 
  AlertCircle,
  FileText,
  X,
  CheckCircle2,
  Calendar,
  Briefcase,
  Building2,
  FolderTree,
  Coffee,
  MessageSquare,
  Coins,
  Gift,
  Download
} from 'lucide-react';

export const Activities: React.FC<{ setActiveTab?: (tab: string) => void }> = ({ setActiveTab }) => {
  const { currentUser } = useAuth();
  const { theme, dataVersion } = useLayout();
  
  // Slicers State
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Dropdown Options
  const [companies, setCompanies] = useState<Company[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  
  // Data States
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Activity[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeConfig[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAct, setEditingAct] = useState<Activity | null>(null);

  // 新增詳情 Modal States
  const [selectedDetailActivity, setSelectedDetailActivity] = useState<Activity | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCompanyContacts, setSelectedCompanyContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const loadDetailContacts = async () => {
      if (!selectedDetailActivity) {
        setSelectedCompanyContacts([]);
        return;
      }
      try {
        const opp = opportunities.find(o => o.id === selectedDetailActivity.opportunityId);
        if (opp) {
          const allContacts = await db.getContacts();
          const filtered = allContacts.filter(c => c.companyId === opp.companyId);
          setSelectedCompanyContacts(filtered);
        } else {
          setSelectedCompanyContacts([]);
        }
      } catch (err) {
        console.error('Failed to load detail contacts', err);
      }
    };
    loadDetailContacts();
  }, [selectedDetailActivity, opportunities]);

  // Form fields
  const [opportunityId, setOpportunityId] = useState('');
  const [type, setType] = useState('待辦任務');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [assignedUserId, setAssignedUserId] = useState('');

  // Load Slicer & Type options
  useEffect(() => {
    const loadOptions = async () => {
      const compRes = await db.getCompanies();
      const orgRes = await db.getOrganizations();
      const typeRes = await db.getActivityTypes();
      setCompanies(compRes);
      setOrganizations(orgRes);
      setActivityTypes(typeRes);
    };
    loadOptions();
  }, []);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      const filters = {
        orgId: selectedOrgId || undefined,
        companyId: selectedCompanyId || undefined
      };

      const allOpps = await db.getOpportunities(currentUser.role, currentUser.id, filters);
      const usrs = await db.getUsers();
      const pending = await db.getPendingTasks(currentUser.id, currentUser.role, filters);
      
      const allActs = await db.getActivities();
      // AM 只能看自己指派或關聯商機的活動；管理員可視全部
      const oppIds = allOpps.map(o => o.id);
      const filteredActs = currentUser.role === 'AM'
        ? allActs.filter(a => oppIds.includes(a.opportunityId) || a.userId === currentUser.id)
        : allActs.filter(a => oppIds.includes(a.opportunityId)); // 過濾出篩選後商機的活動

      const sortedActs = filteredActs.sort((a, b) => b.dueDate.localeCompare(a.dueDate));

      setOpportunities(allOpps);
      setUsers(usrs);
      setPendingTasks(pending);
      setActivities(sortedActs);
    } catch (err) {
      console.error('Failed to load activity data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, selectedOrgId, selectedCompanyId, dataVersion]);

  // 打開新增/編輯 Modal
  const openModal = (act: Activity | null = null) => {
    if (act) {
      setEditingAct(act);
      setOpportunityId(act.opportunityId);
      setType(act.type);
      setDescription(act.description);
      setDueDate(act.dueDate.replace(' ', 'T'));
      setIsCompleted(act.isCompleted);
      setAssignedUserId(act.userId);
    } else {
      setEditingAct(null);
      setOpportunityId(opportunities[0]?.id || '');
      setType(activityTypes[0]?.name || '待辦任務');
      setDescription('');
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
      setDueDate(tomorrow.toISOString().slice(0, 16));
      setIsCompleted(false);
      setAssignedUserId(currentUser?.id || '');
    }
    setIsModalOpen(true);
  };

  // 儲存活動
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !opportunityId || !description || !dueDate) {
      alert('請填寫所有必要欄位');
      return;
    }

    const formattedDueDate = dueDate.replace('T', ' ');

    const actData: Activity = {
      id: editingAct ? editingAct.id : `act-${Date.now()}`,
      opportunityId,
      userId: assignedUserId || currentUser.id,
      type,
      description,
      dueDate: formattedDueDate,
      isCompleted,
    };

    try {
      await db.saveActivity(actData);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to save activity', err);
    }
  };

  // 快速完成任務
  const handleToggleComplete = async (act: Activity) => {
    const updated = { ...act, isCompleted: !act.isCompleted };
    try {
      await db.saveActivity(updated);
      loadData();
    } catch (err) {
      console.error('Failed to toggle task completion', err);
    }
  };

  // 刪除活動
  const handleDeleteActivity = async (id: string) => {
    if (!window.confirm('確定要刪除此筆活動紀錄嗎？')) return;
    try {
      await db.deleteActivity(id);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to delete activity', err);
    }
  };

  // 取得動態活動圖示與樣式
  const getActivityStyle = (actType: string) => {
    const config = activityTypes.find(t => t.name === actType);
    if (!config) {
      return { icon: FileText, color: 'text-slate-500 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800' };
    }

    let IconComponent = FileText;
    switch (config.icon) {
      case 'CheckSquare': IconComponent = CheckSquare; break;
      case 'Video': IconComponent = Video; break;
      case 'FileText': IconComponent = FileText; break;
      case 'Calendar': IconComponent = Calendar; break;
      case 'Coffee': IconComponent = Coffee; break;
      case 'MessageSquare': IconComponent = MessageSquare; break;
      case 'Coins': IconComponent = Coins; break;
      case 'Gift': IconComponent = Gift; break;
      default: IconComponent = FileText; break;
    }

    let colorClass = '';
    switch (config.color) {
      case 'blue': colorClass = 'text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50'; break;
      case 'purple': colorClass = 'text-purple-500 bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/50'; break;
      case 'emerald': colorClass = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50'; break;
      case 'amber': colorClass = 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50'; break;
      case 'rose': colorClass = 'text-rose-500 bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50'; break;
      default: colorClass = 'text-slate-500 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800';
    }

    return { icon: IconComponent, color: colorClass };
  };

  const isDueSoon = (dateStr: string) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const taskDate = new Date(dateStr.replace(' ', 'T'));
    return taskDate <= today;
  };

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

  const handleExportActivities = () => {
    const headers = ['活動類型', '狀態', '關聯商機', '負責業務', '執行/到期時間', '活動內容', 'AI關鍵字預覽'];
    const rows = activities.map(a => {
      const opp = opportunities.find(o => o.id === a.opportunityId);
      const usr = users.find(u => u.id === a.userId);
      const tags = inferPreviewTags([a.description], a.tags);
      return [
        a.type,
        a.isCompleted ? '已完成' : '待處理',
        opp?.title || '',
        usr?.name || '',
        a.dueDate,
        a.description,
        tags.map(t => `#${t.label}`).join(' '),
      ];
    });
    exportToCsv(`CRM_任務活動歷程_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      
      {/* Slicers 篩選面板 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 dark:text-white">客戶互動與待辦任務 (Activities)</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            追蹤與客戶的聯繫歷程。即將到期的任務將優先顯示於待辦清單中，並自動預覽 AI 關鍵字標籤。
          </p>
        </div>

        {/* Slicer Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          
          {/* 組織 Slicer (限 ADMIN/BU head) */}
          {currentUser?.role !== 'AM' && (
            <div className="flex items-center gap-1.5">
              <FolderTree className={`w-4 h-4 ${theme.accentText}`} />
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="" className="bg-white dark:bg-slate-950">(所有部門)</option>
                {renderOrgOptions(null)}
              </select>
            </div>
          )}

          {/* 客戶 Slicer */}
          <div className="flex items-center gap-1.5">
            <Building2 className={`w-4 h-4 ${theme.accentText}`} />
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="" className="bg-white dark:bg-slate-950">(所有客戶公司)</option>
              {companies.map(c => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-950">{c.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportActivities}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出</span>
          </button>

          <button
            onClick={() => openModal(null)}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 font-bold rounded-xl transition-all text-xs ${theme.primaryBtn}`}
          >
            <Plus className="w-4 h-4" />
            <span>新增活動</span>
          </button>
        </div>
      </div>

      {/* 待辦事項推送面板 (Due Soon & Pending) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <h3 className="text-md font-extrabold text-slate-800 dark:text-white">待辦任務提醒 (Pending Tasks)</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            {pendingTasks.length} 筆待處理
          </span>
        </div>

        {pendingTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingTasks.map((task) => {
              const opp = opportunities.find(o => o.id === task.opportunityId);
              const assigned = users.find(u => u.id === task.userId);
              const isUrgent = isDueSoon(task.dueDate);

              return (
                <div 
                  key={task.id}
                  onClick={() => {
                    setSelectedDetailActivity(task);
                    setIsDetailModalOpen(true);
                  }}
                  className={`
                    p-4 rounded-2xl border flex items-start gap-3 transition-all hover:shadow-sm cursor-pointer hover:border-slate-300 dark:hover:border-slate-700
                    ${isUrgent 
                      ? 'bg-rose-50/30 dark:bg-rose-955/25 border-rose-200 dark:border-rose-900/60' 
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-150 dark:border-slate-800/80'}
                  `}
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleComplete(task);
                    }}
                    className="mt-0.5 text-slate-400 hover:text-sky-600 transition-colors"
                    title="標記為已完成"
                  >
                    <Square className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold line-clamp-2 ${isUrgent ? 'text-rose-950 dark:text-rose-100' : 'text-slate-800 dark:text-slate-100'}`}>
                      {task.description}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-[11px] text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[120px] dark:text-slate-400">{opp?.title || '未知商機'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-rose-400 dark:text-rose-500" />
                        <span className={isUrgent ? 'text-rose-600 dark:text-rose-400 font-bold' : 'dark:text-slate-400'}>期限: {task.dueDate}</span>
                      </span>
                      {currentUser?.role !== 'AM' && (
                        <span className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-500 dark:text-slate-350">
                          {assigned?.name.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isUrgent && (
                    <span className="text-[10px] px-2 py-0.5 font-extrabold rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-wider animate-pulse flex-shrink-0">
                      今日到期
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
            <p className="text-sm font-semibold">太棒了！目前沒有到期未完成的任務</p>
          </div>
        )}
      </div>

      {/* 活動歷程列表 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h3 className="text-md font-extrabold text-slate-800 dark:text-white mb-6">全部客戶聯繫與活動歷程 (Activity Logs)</h3>
        
        <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 space-y-6">
          {activities.length > 0 ? (
            activities.map((act) => {
              const opp = opportunities.find(o => o.id === act.opportunityId);
              const assigned = users.find(u => u.id === act.userId);
              const { icon: Icon, color: colorClasses } = getActivityStyle(act.type);

              return (
                <div key={act.id} className="relative pl-7 group">
                  <div className={`absolute -left-4 top-0.5 w-8 h-8 rounded-full border flex items-center justify-center transition-transform group-hover:scale-110 z-10 ${colorClasses}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div 
                    onClick={() => {
                      setSelectedDetailActivity(act);
                      setIsDetailModalOpen(true);
                    }}
                    className="bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-850 hover:border-slate-250 dark:hover:border-slate-700/85 p-4 rounded-2xl transition-all cursor-pointer hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {act.type}
                          </span>
                          
                          {act.isCompleted ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              已完成
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleComplete(act);
                              }}
                              className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-emerald-500 hover:text-white hover:border-transparent transition-all"
                            >
                              待處理 (點擊完成)
                            </button>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {act.description}
                        </p>

                        {(() => {
                          const tags = inferPreviewTags([act.description], act.tags);
                          if (tags.length === 0) return null;
                          return (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {tags.map(t => (
                                <span
                                  key={t.label}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getTagToneClass(t.tone)}`}
                                >
                                  ✦ #{t.label}
                                </span>
                              ))}
                            </div>
                          );
                        })()}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[150px]">{opp?.title || '未知商機'}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>日期: {act.dueDate}</span>
                          </span>
                          <span>•</span>
                          <span className="bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            負責人: {assigned?.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(act);
                          }}
                          className="p-1 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850"
                          title="編輯"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteActivity(act.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850"
                          title="刪除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">目前此篩選條件下無任何活動歷史紀錄。</p>
          )}
        </div>
      </div>

      {/* 新增/編輯活動 Modal */}
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
              {editingAct ? '修改活動/任務紀錄' : '記錄客戶互動或指派任務'}
            </h3>

            <form onSubmit={handleSaveActivity} className="space-y-4">
              
              {/* 關聯商機 */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">關聯商機 *</label>
                <select
                  value={opportunityId}
                  onChange={(e) => setOpportunityId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                >
                  {opportunities.map(o => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                  {opportunities.length === 0 && (
                    <option value="">(無可用商機，請先至商機看板新增)</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 互動類型 (動態資料庫資料) */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">互動類型 *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                  >
                    {activityTypes.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* 負責人 */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">負責人員 *</label>
                  <select
                    value={assignedUserId}
                    onChange={(e) => setAssignedUserId(e.target.value)}
                    disabled={currentUser?.role === 'AM'}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 disabled:opacity-60"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 執行/到期日期 */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  活動/任務日期與時間 *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2"
                />
              </div>

              {/* 活動描述 */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">活動內容描述 *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="請填寫具體的聯繫內容或待辦事項..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>

              {/* 狀態 */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isCompletedCheck"
                  checked={isCompleted}
                  onChange={(e) => setIsCompleted(e.target.checked)}
                  className="w-4.5 h-4.5 border-slate-300 rounded text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="isCompletedCheck" className="text-sm font-semibold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                  此活動或任務已完成
                </label>
              </div>

              {/* 按鈕組 */}
              <div className="flex items-center justify-between pt-6 mt-2 border-t border-slate-100 dark:border-slate-800">
                {editingAct ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteActivity(editingAct.id)}
                    className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 font-bold border border-rose-200 hover:border-rose-300 dark:border-rose-950 px-3.5 py-2 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>刪除紀錄</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition-colors"
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

      {/* 活動關聯詳情 Modal */}
      {isDetailModalOpen && selectedDetailActivity && (() => {
        const opp = opportunities.find(o => o.id === selectedDetailActivity.opportunityId);
        const assigned = users.find(u => u.id === selectedDetailActivity.userId);
        const company = companies.find(c => c.id === opp?.companyId);

        const handleGoToPipeline = () => {
          if (opp) {
            sessionStorage.setItem('autofocus_company_id', opp.companyId);
            setActiveTab?.('pipeline');
            setIsDetailModalOpen(false);
          }
        };

        return (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsDetailModalOpen(false)}
            />
            {/* Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-50 w-[550px] max-w-full flex flex-col relative animate-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 border border-indigo-100 dark:border-indigo-900/30">
                    {selectedDetailActivity.type}
                  </span>
                  {selectedDetailActivity.isCompleted ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      已完成
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      待處理
                    </span>
                  )}
                </div>
                <h3 className="text-[15px] font-black text-slate-800 dark:text-slate-100 mt-2.5 leading-snug">
                  活動紀錄詳情
                </h3>
              </div>

              {/* Content Body */}
              <div className="space-y-5 flex-1 overflow-y-auto max-h-[420px] pr-1">
                {/* 1. 完整內容描述 */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">活動描述備忘</span>
                  <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {selectedDetailActivity.description}
                  </div>
                </div>

                {/* 2. 時間與人員 */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="border border-slate-100 dark:border-slate-800 p-3 rounded-xl bg-slate-50/20">
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">預定執行日期</span>
                    <p className="font-bold text-slate-700 dark:text-slate-200 mt-1">{selectedDetailActivity.dueDate}</p>
                  </div>
                  <div className="border border-slate-100 dark:border-slate-800 p-3 rounded-xl bg-slate-50/20">
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">負責業務人員</span>
                    <p className="font-bold text-slate-700 dark:text-slate-200 mt-1">{assigned?.name || '未指派'}</p>
                  </div>
                </div>

                {/* 3. 關聯商機與一鍵跳轉 */}
                {opp && (
                  <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-2xl bg-indigo-50/30 dark:bg-indigo-900/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> 關聯商機
                      </span>
                      <button 
                        onClick={handleGoToPipeline}
                        className="text-[10px] font-black text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                      >
                        前往管線看板 &rarr;
                      </button>
                    </div>
                    <div className="text-xs">
                      <p className="font-extrabold text-slate-800 dark:text-slate-200 truncate">{opp.title}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                        <span>預估金額: <span className="font-bold text-slate-700 dark:text-slate-300">{opp.amount.toLocaleString()} NTD</span></span>
                        <span>贏率: <span className="font-bold text-slate-700 dark:text-slate-300">{opp.winProbability}%</span></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. 客戶公司窗口聯絡人名單 */}
                {company && (
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-sky-500" /> 客戶聯絡窗口 ({company.name})
                    </span>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedCompanyContacts.length > 0 ? (
                        selectedCompanyContacts.map(c => (
                          <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-slate-700 dark:text-slate-200">{c.name}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{c.phone}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{c.email}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2 pl-1">此客戶公司目前無聯絡窗口資料</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
