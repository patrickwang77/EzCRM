import React, { createContext, useContext, useState, useCallback, useRef, useId, useEffect } from 'react';
import { ModalDialog } from '../components/ModalDialog';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
}

interface FeedbackContextValue {
  notify: (message: string, tone?: ToastTone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const confirmResolverRef = useRef<((accepted: boolean) => void) | null>(null);
  const toastPopoverRef = useRef<HTMLDivElement>(null);
  const confirmTitleId = useId();
  const confirmDescId = useId();

  // Promote toast stack into the native top-layer via popover="manual" so toasts appear above open <dialog> modals
  useEffect(() => {
    const el = toastPopoverRef.current as (HTMLDivElement & {
      showPopover?: () => void;
      hidePopover?: () => void;
    }) | null;
    if (!el || typeof el.showPopover !== 'function') return;
    try {
      if (toasts.length > 0) {
        if (!el.matches(':popover-open')) el.showPopover();
      } else if (el.matches(':popover-open')) {
        el.hidePopover?.();
      }
    } catch {
      // Ignore if browser rejects top-layer transition while unmounting
    }
  }, [toasts.length]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts(prev => [...prev.slice(-3), { id, message, tone }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, tone === 'error' ? 5000 : 3500);
    },
    [dismissToast]
  );

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      confirmResolverRef.current = resolve;
      setConfirmState(options);
    });
  }, []);

  const settleConfirm = (accepted: boolean) => {
    const resolver = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setConfirmState(null);
    resolver?.(accepted);
  };

  return (
    <FeedbackContext.Provider value={{ notify, confirm }}>
      {children}

      {/* Centralized accessible live-region toast stack (popover="manual" keeps toasts above top-layer <dialog>s) */}
      <div
        ref={toastPopoverRef}
        {...({ popover: 'manual' } as Record<string, string>)}
        aria-live="polite"
        aria-atomic="false"
        className="fixed inset-auto bottom-4 right-4 m-0 p-0 border-0 bg-transparent overflow-visible z-[60] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none"
      >
        {toasts.map(t => {
          const styles =
            t.tone === 'error'
              ? 'bg-rose-600 text-white border-rose-700'
              : t.tone === 'warning'
              ? 'bg-amber-500 text-slate-950 border-amber-600'
              : t.tone === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700';

          const Icon =
            t.tone === 'error' || t.tone === 'warning'
              ? AlertTriangle
              : t.tone === 'success'
              ? CheckCircle2
              : Info;

          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-bold ${styles}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="flex-1 leading-relaxed">{t.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="關閉通知"
                className="opacity-80 hover:opacity-100 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Native <dialog> Confirmation Modal (safe Cancel button receives initial autofocus) */}
      <ModalDialog
        open={Boolean(confirmState)}
        onClose={() => settleConfirm(false)}
        ariaLabelledBy={confirmTitleId}
        lightDismiss
        className="max-w-md"
      >
        {confirmState && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-800 dark:text-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl flex-shrink-0 ${
                  confirmState.tone === 'danger'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                }`}
              >
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 id={confirmTitleId} className="text-base font-extrabold">
                  {confirmState.title}
                </h1>
                <p
                  id={confirmDescId}
                  className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed"
                >
                  {confirmState.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                autoFocus
                onClick={() => settleConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              >
                {confirmState.cancelLabel || '取消'}
              </button>
              <button
                type="button"
                aria-describedby={confirmDescId}
                onClick={() => settleConfirm(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition ${
                  confirmState.tone === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmState.confirmLabel || '確定'}
              </button>
            </div>
          </div>
        )}
      </ModalDialog>
    </FeedbackContext.Provider>
  );
};

export const useFeedback = (): FeedbackContextValue => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return ctx;
};
