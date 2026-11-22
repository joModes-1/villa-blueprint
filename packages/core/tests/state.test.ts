import { describe, expect, it } from 'vitest';
import {
  DECISION_EDIT_STATUSES,
  InvalidTransitionError,
  SOURCE_EDIT_STATUSES,
  transition,
  type ProjectEvent,
  type ProjectStatus,
} from '../src/pipeline/state';

const allowed: [ProjectStatus, ProjectEvent, ProjectStatus][] = [
  ['draft', 'analyze', 'processing'],
  ['interviewing', 'analyze', 'processing'],
  ['ready_to_generate', 'analyze', 'processing'],
  ['failed', 'analyze', 'processing'],
  ['processing', 'analysis_questions_open', 'interviewing'],
  ['processing', 'analysis_no_questions', 'ready_to_generate'],
  ['interviewing', 'interview_complete', 'ready_to_generate'],
  ['ready_to_generate', 'generate', 'generating'],
  ['stale', 'generate', 'generating'],
  ['ready', 'generate', 'generating'],
  ['blocked', 'generate', 'generating'],
  ['generating', 'docs_done', 'gating'],
  ['gating', 'gates_pass', 'ready'],
  ['gating', 'gates_blocked', 'blocked'],
  ['blocked', 'blockers_accepted', 'ready'],
  ['ready', 'ledger_edit_stale', 'stale'],
  ['blocked', 'ledger_edit_stale', 'stale'],
  ['processing', 'run_failed', 'failed'],
  ['generating', 'run_failed', 'failed'],
  ['gating', 'run_failed', 'failed'],
];

describe('transition()', () => {
  it.each(allowed)('%s --%s--> %s', (from, event, to) => {
    expect(transition(from, event, { sourceCount: 1 })).toBe(to);
  });

  it('retry returns to the stage that failed', () => {
    expect(transition('failed', 'retry', { failedStage: 'process' })).toBe('processing');
    expect(transition('failed', 'retry', { failedStage: 'analyze' })).toBe('processing');
    expect(transition('failed', 'retry', { failedStage: 'generate' })).toBe('generating');
    expect(transition('failed', 'retry', { failedStage: 'gate' })).toBe('gating');
  });

  it('rejects transitions that are not in the table', () => {
    expect(() => transition('draft', 'generate')).toThrow(InvalidTransitionError);
    expect(() => transition('ready', 'analyze')).toThrow(InvalidTransitionError);
    expect(() => transition('generating', 'ledger_edit_stale')).toThrow(InvalidTransitionError);
    expect(() => transition('ready', 'retry')).toThrow(InvalidTransitionError);
  });

  it('InvalidTransitionError maps to 409 INVALID_STATE', () => {
    try {
      transition('draft', 'docs_done');
      expect.unreachable();
    } catch (e) {
      const err = e as InvalidTransitionError;
      expect(err.status).toBe(409);
      expect(err.code).toBe('INVALID_STATE');
      expect(err.message).toContain('draft');
    }
  });

  it('analyze needs at least one source', () => {
    expect(() => transition('draft', 'analyze', { sourceCount: 0 })).toThrow();
  });

  it('exposes edit-state lists', () => {
    expect(SOURCE_EDIT_STATUSES).toContain('draft');
    expect(SOURCE_EDIT_STATUSES).not.toContain('generating');
    expect(DECISION_EDIT_STATUSES).toContain('ready');
    expect(DECISION_EDIT_STATUSES).not.toContain('processing');
  });
});
