import { BudgetController } from "./budget.js";
import type { BudgetSnapshot } from "./budget.js";
import { SmartRouter } from "./router.js";
import { RTKCompressor } from "./rtk.js";
import type { ProcessRequest, RouteResult } from "./types.js";

export { SmartRouter, RTKCompressor, BudgetController };
export type { ProcessRequest, RouteResult, BudgetSnapshot };

export class TokenGovernor {
  public router: SmartRouter;
  public compressor: RTKCompressor;
  public budget: BudgetController;

  constructor() {
    this.router = new SmartRouter();
    this.compressor = new RTKCompressor(800);
    this.budget = new BudgetController();
  }

  /**
   * Process a request: compress tool results → smart route to best model.
   *
   * NOTE: Prometheus does NOT enforce budget limits. Budget tracking is
   * informational only. Only ethics/norms gate behavior — not token counts.
   */
  processRequest(req: ProcessRequest): {
    route: RouteResult;
    compressed: { messages: Array<{ role: string; content: string }> };
  } {
    // 1. RTK compress tool results (always — saves tokens without blocking)
    const compressed = this.compressor.compress(req);

    // 2. Smart route (always — picks best provider for the task)
    const route = this.router.route(req);

    return { route, compressed };
  }

  /** Track usage after LLM call (advisory only) */
  track(tokensUsed: number): void {
    this.budget.track(tokensUsed);
  }

  /** Get budget status snapshot (informational) */
  getBudgetStatus(): BudgetSnapshot {
    return this.budget.getStatus();
  }
}
