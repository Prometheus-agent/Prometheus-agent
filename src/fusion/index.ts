/**
 * Prometheus Fusion — integration layer between the agent loop and
 * TokenGovernor + LearningSystem + Worktree + EthicsGate + AgentLoop.
 *
 * Prometheus does NOT enforce hard budget limits. Only ethics/norms gate
 * behavior — everything else is ALLOWED by default.
 *
 * Features drawn from Claude Code:
 *   - JSONL transcript persistence (trajectory.ts)
 *   - Git worktree isolation (worktree.ts)
 *   - Background agent loop (agent-loop.ts)
 *   - Ethics/norms gate instead of permission modes (permissions.ts)
 */

import { LearningSystem } from "@prometheus/prometheus-learning";
import type { ConversationContext, Skill, TrajectoryTurn } from "@prometheus/prometheus-learning";
import { TokenGovernor } from "@prometheus/prometheus-token-governor";
import type {
  ProcessRequest,
  RouteResult,
  BudgetSnapshot,
} from "@prometheus/prometheus-token-governor";
import { getAgentLoop, AgentLoop } from "./agent-loop.js";
import { getEthicsGate, EthicsGate, type EthicsVerdict } from "./permissions.js";
import { WorktreeManager, type WorktreeInfo } from "./worktree.js";

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

let governor: TokenGovernor | null = null;
let learning: LearningSystem | null = null;
let worktreeMgr: WorktreeManager | null = null;
let turnCount = 0;
let fusionEnabled = false;

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export interface FusionConfig {
  memoryDbPath?: string;
  enabled?: boolean;
  worktreeRepoPath?: string;
  sessionId?: string;
}

/**
 * Initialize the Prometheus fusion systems. Call once at agent startup.
 * Enables: TokenGovernor, LearningSystem, WorktreeManager, EthicsGate, AgentLoop.
 */
export function initFusion(config?: FusionConfig): void {
  if (config?.enabled === false) {
    fusionEnabled = false;
    return;
  }

  // TokenGovernor — routing, compression, advisory budget
  governor = new TokenGovernor();

  // LearningSystem — memory, skills, profile, trajectory
  learning = new LearningSystem(config?.memoryDbPath, config?.sessionId);

  // WorktreeManager — git worktree isolation
  if (config?.worktreeRepoPath) {
    worktreeMgr = new WorktreeManager(config.worktreeRepoPath);
  }

  fusionEnabled = true;
}

// ---------------------------------------------------------------------------
// TokenGovernor hooks — called BEFORE LLM call
// ---------------------------------------------------------------------------

export interface GovernorHookResult {
  route: RouteResult;
  compressedMessages: Array<{ role: string; content: string }>;
  wasCompressed: boolean;
  estimatedTokens: number;
}

/**
 * Process a request through the TokenGovernor before sending to the LLM.
 * Always returns a result — budget is advisory, never blocking.
 *
 * Does: RTK compression + smart routing + token estimation
 * Does NOT: enforce budget limits, check permissions
 */
export function beforeLlmCall(
  messages: Array<{ role: string; content: string }>,
  priority?: "greeting" | "simple" | "standard" | "complex" | "deep",
  userId?: string,
  estimatedTokens?: number,
): GovernorHookResult {
  if (!fusionEnabled || !governor) {
    return {
      route: {
        endpoint: "",
        model: "",
        provider: "",
        tier: 0,
        maxTokens: 4096,
        reason: "fusion disabled",
      },
      compressedMessages: messages,
      wasCompressed: false,
      estimatedTokens: 0,
    };
  }

  const request: ProcessRequest = {
    messages,
    priority: priority ?? "standard",
    estimatedTokens:
      estimatedTokens ?? Math.ceil(messages.reduce((s, m) => s + m.content.length, 0) / 4),
    userId,
  };

  const result = governor.processRequest(request);

  return {
    route: result.route,
    compressedMessages: result.compressed.messages,
    wasCompressed:
      result.compressed.messages.length < messages.length ||
      result.compressed.messages.some((m, i) => m.content !== messages[i]?.content),
    estimatedTokens: result.route.maxTokens,
  };
}

/**
 * Track token usage after an LLM call completes (advisory only).
 */
export function afterLlmCall(tokensUsed: number): void {
  if (!fusionEnabled || !governor) return;
  governor.track(tokensUsed);
}

// ---------------------------------------------------------------------------
// Ethics Gate — the ONLY thing that blocks actions
// ---------------------------------------------------------------------------

/**
 * Check if a command violates ethical norms.
 * This is Prometheus's only gate — everything else is allowed by default.
 */
export function checkEthics(command: string): EthicsVerdict {
  if (!fusionEnabled) return { allowed: true, reason: "fusion disabled", category: "none" };
  return getEthicsGate().checkCommand(command);
}

/**
 * Check if a tool call is ethically permissible.
 */
export function checkToolEthics(toolName: string, args?: string): EthicsVerdict {
  if (!fusionEnabled) return { allowed: true, reason: "fusion disabled", category: "none" };
  return getEthicsGate().checkTool(toolName, args);
}

/**
 * Check if file access is ethically permissible.
 */
export function checkFileEthics(path: string, mode: "read" | "write" | "delete"): EthicsVerdict {
  if (!fusionEnabled) return { allowed: true, reason: "fusion disabled", category: "none" };
  return getEthicsGate().checkFileAccess(path, mode);
}

// ---------------------------------------------------------------------------
// LearningSystem hooks — called AFTER turn completion
// ---------------------------------------------------------------------------

/**
 * Process a completed turn through the LearningSystem.
 * Fire-and-forget: work completes synchronously but is lightweight.
 * Returns a newly created skill if one was detected, null otherwise.
 */
export function afterTurn(ctx: ConversationContext): Skill | null {
  if (!fusionEnabled || !learning) return null;
  turnCount++;
  return learning.evaluate(ctx);
}

/**
 * Record a trajectory turn (from the agent loop's raw turn data).
 */
export function recordTrajectory(turn: TrajectoryTurn): void {
  if (!fusionEnabled || !learning) return;
  learning.trajectory.record(turn);
}

/**
 * Finalize the trajectory transcript (write stats line, close).
 */
export function finalizeTrajectory(): void {
  if (!fusionEnabled || !learning) return;
  learning.trajectory.finalize();
}

/**
 * Check if learning should run this turn (every N turns).
 */
export function shouldRunLearning(turnInterval = 5): boolean {
  return turnCount > 0 && turnCount % turnInterval === 0;
}

// ---------------------------------------------------------------------------
// Worktree isolation
// ---------------------------------------------------------------------------

export async function createWorktree(name?: string): Promise<WorktreeInfo | null> {
  if (!worktreeMgr) return null;
  return worktreeMgr.create(name);
}

export async function removeWorktree(path: string): Promise<void> {
  if (!worktreeMgr) return;
  return worktreeMgr.remove(path);
}

export function listWorktrees(): WorktreeInfo[] {
  if (!worktreeMgr) return [];
  return worktreeMgr.list();
}

// ---------------------------------------------------------------------------
// Background Agent Loop
// ---------------------------------------------------------------------------

export function startAgentJob(config: {
  name: string;
  intervalMs: number;
  prompt?: string;
  maxIterations?: number;
}): void {
  getAgentLoop().start(config);
}

export function stopAgentJob(name: string): boolean {
  return getAgentLoop().stop(name);
}

export function listAgentJobs() {
  return getAgentLoop().list();
}

// ---------------------------------------------------------------------------
// Status / introspection
// ---------------------------------------------------------------------------

export function getBudgetStatus(): BudgetSnapshot | null {
  if (!governor) return null;
  return governor.getBudgetStatus();
}

export function getTurnCount(): number {
  return turnCount;
}

export function getLearningSystem(): LearningSystem | null {
  return learning;
}

export function getTokenGovernor(): TokenGovernor | null {
  return governor;
}

export function getWorktreeManager(): WorktreeManager | null {
  return worktreeMgr;
}
