/**
 * Prometheus Background Agent Loop — runs a skill on a recurring interval.
 *
 * Inspired by Claude Code's `claude agents` command. Creates a persistent
 * background loop that repeatedly executes a skill and reports results.
 *
 * This is a lightweight scheduler integrated with the LearningSystem's
 * SkillCreator — it can run auto-discovered skills from FTS5 memory.
 *
 * Usage:
 *   const loop = new AgentLoop();
 *   loop.start("check-deploy", { intervalMs: 5 * 60 * 1000 });
 *   loop.stop("check-deploy");
 *   loop.list(); // Active jobs
 */

import type { Skill } from "@prometheus/prometheus-learning";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentJobConfig {
  /** Job name */
  name: string;
  /** How often to run (ms) */
  intervalMs: number;
  /** The skill or prompt to execute */
  skill?: Skill;
  /** Raw prompt (if no skill) */
  prompt?: string;
  /** Max iterations (0 = unlimited) */
  maxIterations?: number;
  /** Model tier for execution */
  modelTier?: number;
}

export interface AgentJobStatus {
  name: string;
  running: boolean;
  intervalMs: number;
  iterations: number;
  lastRunAt: Date | null;
  lastResult: string | null;
  lastError: string | null;
  nextRunAt: Date;
}

type JobState = "idle" | "running" | "stopped" | "error";

// ---------------------------------------------------------------------------
// AgentLoop
// ---------------------------------------------------------------------------

export class AgentLoop {
  private jobs: Map<string, AgentJobInternal> = new Map();

  constructor() {
    // Start a tick interval to check scheduled jobs
    setInterval(() => this.tick(), 5_000);
  }

  /**
   * Start a background agent job.
   */
  start(config: AgentJobConfig): void {
    if (this.jobs.has(config.name)) {
      throw new Error(`Agent job "${config.name}" already running`);
    }

    const job: AgentJobInternal = {
      config,
      state: "idle",
      iterations: 0,
      lastRunAt: null,
      lastResult: null,
      lastError: null,
      totalTokens: 0,
    };

    this.jobs.set(config.name, job);
  }

  /**
   * Stop a background agent job.
   */
  stop(name: string): boolean {
    const job = this.jobs.get(name);
    if (!job) return false;
    job.state = "stopped";
    return true;
  }

  /**
   * Remove a stopped job entirely.
   */
  remove(name: string): boolean {
    const job = this.jobs.get(name);
    if (!job || job.state === "running") return false;
    return this.jobs.delete(name);
  }

  /**
   * List all agent jobs and their status.
   */
  list(): AgentJobStatus[] {
    const now = Date.now();
    const statuses: AgentJobStatus[] = [];
    for (const [, job] of this.jobs) {
      statuses.push(this.toStatus(job, now));
    }
    return statuses.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get status of a single job.
   */
  getStatus(name: string): AgentJobStatus | null {
    const job = this.jobs.get(name);
    if (!job) return null;
    return this.toStatus(job, Date.now());
  }

  /**
   * Set the shared token budget across all background jobs.
   */
  setTokenBudget(budget: number): void {
    // Token budgets are advisory only — Prometheus does not enforce them
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private tick(): void {
    const now = Date.now();
    for (const [, job] of this.jobs) {
      if (job.state !== "idle") continue;

      const elapsed = job.lastRunAt ? now - job.lastRunAt.getTime() : Infinity;
      if (elapsed < job.config.intervalMs) continue;

      // Check iteration limit
      if (job.config.maxIterations && job.iterations >= job.config.maxIterations) {
        job.state = "stopped";
        continue;
      }

      // Execute
      this.executeJob(job);
    }
  }

  private async executeJob(job: AgentJobInternal): Promise<void> {
    job.state = "running";
    job.iterations++;
    job.lastRunAt = new Date();

    try {
      // In a full integration, this would call the agent harness.
      // For now, we simulate with the skill's own instructions.
      const result = await this.runSkill(job.config);
      job.lastResult = result;
      job.lastError = null;
      job.state = "idle";
    } catch (err) {
      job.lastError = err instanceof Error ? err.message : String(err);
      job.state = "error";
      // Auto-recover after interval
      setTimeout(() => {
        if (job.state === "error") job.state = "idle";
      }, job.config.intervalMs);
    }
  }

  private async runSkill(config: AgentJobConfig): Promise<string> {
    // TODO: In production, this would dispatch through the agent harness
    //       and return the assistant's response text.
    const prompt = config.skill?.instructions ?? config.prompt ?? "No prompt defined";
    return `[prometheus-agent] Executed: ${config.name}\nPrompt: ${prompt.slice(0, 100)}...`;
  }

  private toStatus(job: AgentJobInternal, now: number): AgentJobStatus {
    return {
      name: job.config.name,
      running: job.state === "running",
      intervalMs: job.config.intervalMs,
      iterations: job.iterations,
      lastRunAt: job.lastRunAt,
      lastResult: job.lastResult,
      lastError: job.lastError,
      nextRunAt: new Date(
        job.lastRunAt ? job.lastRunAt.getTime() + job.config.intervalMs : now + 5_000,
      ),
    };
  }
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface AgentJobInternal {
  config: AgentJobConfig;
  state: JobState;
  iterations: number;
  lastRunAt: Date | null;
  lastResult: string | null;
  lastError: string | null;
}

// Singleton
let agentLoop: AgentLoop | null = null;

export function getAgentLoop(): AgentLoop {
  if (!agentLoop) {
    agentLoop = new AgentLoop();
  }
  return agentLoop;
}
