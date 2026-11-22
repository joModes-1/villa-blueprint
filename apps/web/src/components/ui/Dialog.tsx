'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

/** Native <dialog>: focus is trapped by the browser and Escape closes it. */
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
    }
    if (!open && el.open) {
      if (typeof el.close === 'function') el.close();
      else el.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="w-[min(92vw,520px)] rounded-card border border-border bg-white p-0 text-ink shadow-prompt"
    >
      {open ? (
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id="dialog-title" className="text-xl">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-primary-soft">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
