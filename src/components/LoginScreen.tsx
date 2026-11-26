import React from 'react';
import { Building2, LogIn, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { authStatus, firebaseEmail, authError, signInWithGoogle, signOutUser } = useAuth();
  const isUnauthorized = authStatus === 'unauthorized';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-outfit">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
            <Building2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              EzCRM
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              B2B Sales Pipeline & Analytics
            </p>
          </div>
        </div>

        {isUnauthorized ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                <p className="font-extrabold text-sm">此帳號尚未取得系統授權</p>
                <p>
                  您目前登入的 Google 帳號{' '}
                  <span className="font-mono font-bold underline break-all">
                    {firebaseEmail}
                  </span>{' '}
                  尚未列入 EzCRM 白名單。
                </p>
                <p className="text-amber-800/90 dark:text-amber-300/90">
                  請聯繫系統管理員至「系統設定 → 人員帳號管理」新增此 Email 後再重新登入。
                </p>
              </div>
            </div>

            {authError && (
              <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {authError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={signInWithGoogle}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>切換其他帳號</span>
              </button>
              <button
                type="button"
                onClick={signOutUser}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>登出</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                歡迎登入 EzCRM 銷售工作台
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                請使用經管理員授權的 Google 企業或個人帳號登入，以同步您的商機管線、客戶資料與管理指標。
              </p>
            </div>

            {authError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs font-semibold text-rose-700 dark:text-rose-300"
              >
                {authError}
              </div>
            )}

            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-blue-600/20 transition-colors"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>使用 Google 帳號登入</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
