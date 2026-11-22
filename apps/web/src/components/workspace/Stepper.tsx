'use client';

import { Check } from 'lucide-react';
import { STEPS, type StepId } from './steps';

/** Seven steps, always visible. A step is clickable when its data exists. */
export function Stepper({ active, enabled, onSelect }: { active: StepId; enabled: (s: StepId) => boolean; onSelect: (s: StepId) => void }) {
  const activeIdx = STEPS.findIndex((s) => s.id === active);
  return (
    <nav aria-label="Project steps" className="overflow-x-auto">
      <ol className="flex min-w-max gap-1 rounded-card border border-border bg-white p-2">
        {STEPS.map((s, i) => {
          const on = enabled(s.id);
          const isActive = s.id === active;
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={!on}
                aria-current={isActive ? 'step' : undefined}
                onClick={() => onSelect(s.id)}
                className={`flex min-h-[44px] items-center gap-2 rounded-control px-3 text-sm font-semibold transition ${
                  isActive ? 'btn-gradient shadow-card' : on ? 'text-ink hover:bg-primary-soft' : 'cursor-not-allowed text-muted opacity-60'
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isActive ? 'bg-white/25' : i < activeIdx && on ? 'bg-success text-white' : 'bg-primary-soft text-primary-hover'}`}
                  aria-hidden="true"
                >
                  {i < activeIdx && on && !isActive ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
