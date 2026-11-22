import { UnprocessableError } from '../errors';

export class BudgetExceededError extends UnprocessableError {
  constructor(used: number, max: number) {
    super('BUDGET_EXCEEDED', `Token budget reached (${used} of ${max} tokens used for this project).`);
  }
}

/** Throws when the tokens already used are at or over the project's budget. A budget of 0 (or less) means no limit. */
export function assertBudget(usedTokens: number, maxTokens: number): void {
  if (maxTokens <= 0) return;
  if (usedTokens >= maxTokens) throw new BudgetExceededError(usedTokens, maxTokens);
}
