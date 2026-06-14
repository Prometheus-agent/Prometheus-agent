import type { ProcessRequest, RouteResult, TaskPriority } from "./types.js";

interface ProviderConfig {
  name: string;
  tier: number;
  endpoint: string;
  model: string;
  costPer1MInput: number;
  costPer1MOutput: number;
  available: boolean;
}

export class SmartRouter {
  private providers: ProviderConfig[] = [
    {
      name: "ollama",
      tier: 0,
      endpoint: "http://localhost:11434",
      model: "llama3.2:3b",
      costPer1MInput: 0,
      costPer1MOutput: 0,
      available: true,
    },
    {
      name: "kiro",
      tier: 1,
      endpoint: "https://api.kiro.ai/v1",
      model: "claude-sonnet-4-6",
      costPer1MInput: 0,
      costPer1MOutput: 0,
      available: true,
    },
    {
      name: "deepseek",
      tier: 2,
      endpoint: "https://api.deepseek.com",
      model: "deepseek-chat",
      costPer1MInput: 0.5,
      costPer1MOutput: 2,
      available: true,
    },
    {
      name: "anthropic",
      tier: 3,
      endpoint: "https://api.anthropic.com/v1",
      model: "claude-sonnet-4-6",
      costPer1MInput: 3,
      costPer1MOutput: 15,
      available: true,
    },
    {
      name: "openai",
      tier: 3,
      endpoint: "https://api.openai.com/v1",
      model: "gpt-4o",
      costPer1MInput: 2.5,
      costPer1MOutput: 10,
      available: true,
    },
  ];

  private maxTokensByPriority: Record<TaskPriority, number> = {
    greeting: 50,
    simple: 200,
    standard: 2048,
    complex: 8192,
    deep: 32768,
  };

  /** Route a request to the best available model */
  route(request: ProcessRequest): RouteResult {
    const priority = request.priority;
    const preferredTier = this.selectTier(priority);

    // Try preferred tier first, then fall back
    for (let t = preferredTier; t >= 0; t--) {
      const available = this.providers.filter((p) => p.tier === t && p.available);
      if (available.length > 0) {
        const provider = available[0];
        return {
          endpoint: provider.endpoint,
          model: request.preferredModel ?? provider.model,
          provider: provider.name,
          tier: t,
          maxTokens: this.calcMaxTokens(request.messages, priority),
          reason: `routed to ${provider.name} (tier ${t}) for ${priority} priority`,
        };
      }
    }

    // Last resort fallback
    const fallback = this.providers[0];
    return {
      endpoint: fallback.endpoint,
      model: fallback.model,
      provider: fallback.name,
      tier: 0,
      maxTokens: this.calcMaxTokens(request.messages, priority),
      reason: "fallback: all higher tiers unavailable",
    };
  }

  /** Select tier based on priority */
  private selectTier(priority: TaskPriority): number {
    switch (priority) {
      case "greeting":
        return 0; // Local only
      case "simple":
        return 1; // Free tier
      case "standard":
        return 2; // Cheap tier
      case "complex":
        return 3; // Subscription tier
      case "deep":
        return 3; // Subscription tier
      default:
        return 1;
    }
  }

  /** Calculate max tokens based on input length and priority */
  calcMaxTokens(
    messages: Array<{ role: string; content: string }>,
    priority: TaskPriority,
  ): number {
    const inputChars = messages.reduce((s, m) => s + m.content.length, 0);
    const inputTokens = Math.ceil(inputChars / 4);
    const maxForPriority = this.maxTokensByPriority[priority];

    // Don't waste context window: output should be proportional to input
    const proportionalMax = Math.max(inputTokens, Math.min(maxForPriority, inputTokens * 4));
    return Math.min(proportionalMax, maxForPriority);
  }

  /** Health check — update provider availability */
  async checkAvailability(name: string): Promise<boolean> {
    const provider = this.providers.find((p) => p.name === name);
    if (!provider) return false;
    try {
      const resp = await fetch(`${provider.endpoint}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      provider.available = resp.ok;
      return provider.available;
    } catch {
      provider.available = false;
      return false;
    }
  }
}
