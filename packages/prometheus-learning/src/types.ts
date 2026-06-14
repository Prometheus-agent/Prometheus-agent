export interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: Array<{ name: string; arguments: Record<string, unknown> }>;
  tool_call_id?: string;
}

export interface ConversationContext {
  messages: Message[];
  skills?: Skill[];
  userId?: string;
  channel?: string;
  sessionId?: string;
  turnNumber?: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  trigger: string;
  instructions: string;
  version: number;
  usageCount: number;
  successRate: number;
  createdAt: Date;
  updatedAt: Date;
  toolSequence?: string[];
}

export interface MemoryEntry {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  summary: string;
  timestamp: number;
  userId?: string;
  channel?: string;
}

export interface UserProfile {
  userId: string;
  preferences: UserPreferences;
  topics: string[];
  activeHours: Map<string, number>;
  channels: string[];
  totalInteractions: number;
  firstSeen: Date;
  lastSeen: Date;
}

export interface UserPreferences {
  language?: string;
  formality?: "formal" | "casual" | "neutral";
  conciseness?: "brief" | "detailed" | "balanced";
  tone?: string[];
  preferredModel?: string;
}

export interface TrajectoryTurn {
  input: string;
  output: string;
  model: string;
  tokens: number;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  cost: number;
  toolsUsed: string[];
  timestamp: number;
}

export interface SessionStats {
  totalTurns: number;
  totalTokens: number;
  totalCost: number;
  toolCallRate: number;
  avgLatencyMs: number;
  modelsUsed: Record<string, number>;
}
