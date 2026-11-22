import type { ProjectView } from '@blueprint/core/src/api-types';

export type Status = ProjectView['status'];

export const STATUS_LABEL: Record<Status, string> = {
  draft: 'Draft',
  processing: 'Analyzing',
  interviewing: 'Needs answers',
  ready_to_generate: 'Ready to build',
  generating: 'Building',
  gating: 'Checking',
  ready: 'Ready ✓',
  blocked: 'Needs review',
  stale: 'Out of date',
  failed: 'Failed',
};

export const STATUS_TONE: Record<Status, 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'sky'> = {
  draft: 'neutral',
  processing: 'sky',
  interviewing: 'primary',
  ready_to_generate: 'primary',
  generating: 'sky',
  gating: 'sky',
  ready: 'success',
  blocked: 'warning',
  stale: 'warning',
  failed: 'danger',
};

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
