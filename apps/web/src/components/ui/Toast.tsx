'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type ToastTone = 'success' | 'danger' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  text: string;
}

const ToastContext = createContext<{ toast: (text: string, tone?: ToastTone) => void }>({ toast: () => undefined });

export function useToast(): { toast: (text: string, tone?: ToastTone) => void } {
  return useContext(ToastContext);
}

const TONE: Record<ToastTone, string> = {
  success: 'border-success bg-success-soft text-success-ink',
  danger: 'border-danger bg-danger-soft text-danger-ink',
  info: 'border-sky bg-sky-soft text-sky-ink',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((text: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setItems((cur) => [...cur, { id, tone, text }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 6000);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex w-[min(92vw,380px)] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} role="status" className={`slide-in rounded-card border px-4 py-3 text-sm font-medium shadow-card ${TONE[t.tone]}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
