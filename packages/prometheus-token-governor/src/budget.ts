/**
 * Budget Controller — informational token tracking only.
 *
 * Prometheus does NOT enforce hard budget limits. Budgets are purely advisory:
 * they show you what you've used so you can make informed decisions.
 *
 * Only ethics and norms gate behavior — not token counts.
 */

export interface BudgetLimits {
  daily: number;
  monthly: number;
}

export interface BudgetSnapshot {
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  sessionUsed: number;
  remaining: number;
}

export class BudgetController {
  private sessionTokens = 0;
  private dailyTokens: Map<string, number> = new Map();
  private monthlyTokens: Map<string, number> = new Map();
  private limits: BudgetLimits;

  constructor(limits?: Partial<BudgetLimits>) {
    // Defaults are informational targets only — never enforced
    this.limits = {
      daily: limits?.daily ?? 500_000,
      monthly: limits?.monthly ?? 10_000_000,
    };
  }

  /** Track token usage (advisory only — never blocks) */
  track(usedTokens: number): void {
    const today = this.dateKey();
    const month = this.monthKey();

    this.sessionTokens += usedTokens;
    this.dailyTokens.set(today, (this.dailyTokens.get(today) ?? 0) + usedTokens);
    this.monthlyTokens.set(month, (this.monthlyTokens.get(month) ?? 0) + usedTokens);
  }

  /** Get current usage snapshot (informational) */
  getStatus(): BudgetSnapshot {
    const today = this.dateKey();
    const month = this.monthKey();
    const dailyUsed = this.dailyTokens.get(today) ?? 0;

    return {
      dailyUsed,
      dailyLimit: this.limits.daily,
      monthlyUsed: this.monthlyTokens.get(month) ?? 0,
      monthlyLimit: this.limits.monthly,
      sessionUsed: this.sessionTokens,
      remaining: Math.max(0, this.limits.daily - dailyUsed),
    };
  }

  private dateKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  private monthKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
}
