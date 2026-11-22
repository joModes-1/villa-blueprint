import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { Button } from './Button';

export function Card({ children, className = '', as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'li' }) {
  return <Tag className={`rounded-card border border-border bg-surface p-5 shadow-card ${className}`}>{children}</Tag>;
}

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'sky';

const TONES: Record<Tone, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary-soft text-primary-hover',
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  sky: 'bg-sky-soft text-sky-ink',
};

export function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-medium ${TONES[tone]} ${className}`}>{children}</span>;
}

const BANNER: Record<'info' | 'success' | 'warning' | 'danger', { cls: string; Icon: typeof Info }> = {
  info: { cls: 'border-sky/40 bg-sky-soft text-sky-ink', Icon: Info },
  success: { cls: 'border-success/40 bg-success-soft text-success-ink', Icon: CheckCircle2 },
  warning: { cls: 'border-amber/50 bg-amber-soft text-amber-ink', Icon: AlertTriangle },
  danger: { cls: 'border-danger/40 bg-danger-soft text-danger-ink', Icon: XCircle },
};

export function Banner({
  tone = 'info',
  children,
  action,
  sticky,
}: {
  tone?: keyof typeof BANNER;
  children: ReactNode;
  action?: ReactNode;
  sticky?: boolean;
}) {
  const { cls, Icon } = BANNER[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex flex-wrap items-center gap-3 rounded-card border px-4 py-3 text-sm font-medium ${cls} ${sticky ? 'sticky top-2 z-20 shadow-card' : ''}`}>
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Banner tone="danger" action={onRetry ? <Button variant="secondary" onClick={onRetry}>Retry</Button> : undefined}>
      {message}
    </Banner>
  );
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-primary/30 bg-white/70 px-6 py-10 text-center">
      {icon}
      <h3 className="text-lg">{title}</h3>
      {text ? <p className="max-w-md text-muted">{text}</p> : null}
      {action}
    </div>
  );
}

export function Skeleton({ className = 'h-16' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function LoadingList({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} />
      ))}
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label ?? 'Progress'} className="h-3 w-full overflow-hidden rounded-full bg-primary-soft">
      <div className="brand-gradient h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
