import React, { createContext, useCallback, useContext, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 1;

const TOAST_STYLES: Record<ToastType, { border: string; labelColor: string; defaultTitle: string }> = {
  success: {
    border: 'border-l-4 border-l-emerald-700 border-[#E6E0D6]',
    labelColor: 'text-emerald-800',
    defaultTitle: 'Hoàn tất',
  },
  error: {
    border: 'border-l-4 border-l-[#A63429] border-[#E6E0D6]',
    labelColor: 'text-[#A63429]',
    defaultTitle: 'Có lỗi xảy ra',
  },
  warning: {
    border: 'border-l-4 border-l-[#B8925A] border-[#E6E0D6]',
    labelColor: 'text-[#946421]',
    defaultTitle: 'Lưu ý',
  },
  info: {
    border: 'border-l-4 border-l-[#181615] border-[#E6E0D6]',
    labelColor: 'text-[#181615]',
    defaultTitle: 'Thông báo',
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = nextToastId++;
      setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]);
      window.setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const success = useCallback((m: string, t?: string) => showToast(m, 'success', t), [showToast]);
  const error = useCallback((m: string, t?: string) => showToast(m, 'error', t), [showToast]);
  const info = useCallback((m: string, t?: string) => showToast(m, 'info', t), [showToast]);
  const warning = useCallback((m: string, t?: string) => showToast(m, 'warning', t), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <div
        aria-live="polite"
        className="no-print fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto animate-toast-in bg-white border rounded-xl shadow-xl p-4 flex items-start justify-between gap-3 ${style.border}`}
            >
              <div className="min-w-0">
                <p className={`text-[11px] font-bold uppercase tracking-[0.15em] ${style.labelColor}`}>
                  {toast.title || style.defaultTitle}
                </p>
                <p className="text-xs text-[#181615] mt-1 leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-[11px] font-semibold text-[#8B847C] hover:text-[#181615] cursor-pointer shrink-0"
              >
                Đóng
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside AuthProvider/ToastProvider');
  return ctx;
}
