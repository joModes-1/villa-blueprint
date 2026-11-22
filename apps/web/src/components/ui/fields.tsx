import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const BASE =
  'w-full rounded-control border border-primary/25 bg-white px-3 py-2.5 text-base text-ink placeholder:text-muted focus:border-primary disabled:opacity-60 aria-[invalid=true]:border-danger';

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  hideLabel?: boolean;
}

function Wrap({ id, label, error, hint, hideLabel, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-[13px] font-medium'}>
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-[13px] font-medium text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: ReactNode): string | undefined =>
  [error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(function Input(
  { label, error, hint, hideLabel, className = '', ...rest },
  ref,
) {
  const id = useId();
  return (
    <Wrap id={id} label={label} error={error} hint={hint} hideLabel={hideLabel}>
      <input ref={ref} id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} className={`${BASE} ${className}`} {...rest} />
    </Wrap>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(function Textarea(
  { label, error, hint, hideLabel, className = '', ...rest },
  ref,
) {
  const id = useId();
  return (
    <Wrap id={id} label={label} error={error} hint={hint} hideLabel={hideLabel}>
      <textarea ref={ref} id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} className={`${BASE} ${className}`} {...rest} />
    </Wrap>
  );
});

export function Select({
  label,
  error,
  hint,
  hideLabel,
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  const id = useId();
  return (
    <Wrap id={id} label={label} error={error} hint={hint} hideLabel={hideLabel}>
      <select id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} className={`${BASE} ${className}`} {...rest}>
        {children}
      </select>
    </Wrap>
  );
}
