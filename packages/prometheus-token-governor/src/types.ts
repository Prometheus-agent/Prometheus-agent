export type TaskPriority = "greeting" | "simple" | "standard" | "complex" | "deep";

export interface ProcessRequest {
  messages: Array<{ role: string; content: string }>;
  tools?: Array<Record<string, unknown>>;
  priority: TaskPriority;
  estimatedTokens?: number;
  userId?: string;
  preferredModel?: string;
}

export interface RouteResult {
  endpoint: string;
  model: string;
  provider: string;
  tier: number;
  maxTokens: number;
  reason: string;
}
