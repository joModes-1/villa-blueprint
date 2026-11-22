import { Loader2 } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5', label }: { className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} aria-label={label} className="inline-flex">
      <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />
    </span>
  );
}
