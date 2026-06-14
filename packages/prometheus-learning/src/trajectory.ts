import {
  appendFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import os from "node:os";
import { join } from "node:path";
import type { TrajectoryTurn, SessionStats } from "./types.js";

/**
 * JSONL transcript format — one JSON object per line, matching Claude Code's
 * session transcript convention. Each line is a self-describing event.
 *
 * Event types:
 *   {"type":"turn","turn":{...}}                    — a single trajectory turn
 *   {"type":"metadata","sessionId":"...",...}        — session start metadata
 *   {"type":"stats","totalTurns":5,"totalTokens":...} — aggregated session stats
 */

export class TrajectoryRecorder {
  private turns: TrajectoryTurn[] = [];
  private transcriptDir: string;
  private transcriptPath: string | null = null;
  private sessionId: string;

  constructor(sessionId?: string, transcriptDir?: string) {
    this.sessionId = sessionId ?? `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.transcriptDir = transcriptDir ?? join(os.homedir(), ".prometheus", "trajectories");
    this.ensureDir();
  }

  /** Ensure the transcript directory exists */
  private ensureDir(): void {
    if (!existsSync(this.transcriptDir)) {
      mkdirSync(this.transcriptDir, { recursive: true });
    }
  }

  /** Get the current transcript file path */
  private getTranscriptPath(): string {
    if (!this.transcriptPath) {
      this.transcriptPath = join(this.transcriptDir, `${this.sessionId}.jsonl`);
    }
    return this.transcriptPath;
  }

  /** Write session-start metadata line */
  beginSession(metadata?: Record<string, unknown>): void {
    const entry = {
      type: "metadata",
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      ...metadata,
    };
    appendFileSync(this.getTranscriptPath(), JSON.stringify(entry) + "\n", "utf8");
  }

  /** Record every turn (in-memory + JSONL) */
  record(turnData: TrajectoryTurn): void {
    this.turns.push(turnData);

    // Persist as JSONL
    const entry = {
      type: "turn",
      turn: turnData,
      timestamp: new Date().toISOString(),
    };
    appendFileSync(this.getTranscriptPath(), JSON.stringify(entry) + "\n", "utf8");
  }

  /** Export for fine-tuning (in Claude API format) */
  exportForFineTuning(): Array<{
    messages: Record<string, unknown>[];
    tools_used: string[];
    metrics: Record<string, number>;
  }> {
    return this.turns.map((turn) => ({
      messages: [
        { role: "user", content: turn.input },
        { role: "assistant", content: turn.output },
      ],
      tools_used: turn.toolsUsed,
      metrics: {
        tokens_total: turn.tokens,
        tokens_input: turn.tokensInput,
        tokens_output: turn.tokensOutput,
        latency_ms: turn.latencyMs,
        cost: turn.cost,
      },
    }));
  }

  /** Get session statistics */
  getSessionStats(): SessionStats {
    if (this.turns.length === 0) {
      return {
        totalTurns: 0,
        totalTokens: 0,
        totalCost: 0,
        toolCallRate: 0,
        avgLatencyMs: 0,
        modelsUsed: {},
      };
    }

    const modelsUsed: Record<string, number> = {};
    let toolCalls = 0;

    for (const turn of this.turns) {
      modelsUsed[turn.model] = (modelsUsed[turn.model] ?? 0) + 1;
      if (turn.toolsUsed.length > 0) toolCalls++;
    }

    const totalTurns = this.turns.length;
    const totalTokens = this.turns.reduce((s, t) => s + t.tokens, 0);
    const totalCost = this.turns.reduce((s, t) => s + t.cost, 0);
    const avgLatencyMs = this.turns.reduce((s, t) => s + t.latencyMs, 0) / totalTurns;

    return {
      totalTurns,
      totalTokens,
      totalCost,
      toolCallRate: toolCalls / totalTurns,
      avgLatencyMs,
      modelsUsed,
    };
  }

  /** Write final stats line and close transcript */
  finalize(): void {
    if (this.turns.length === 0) return;
    const stats = this.getSessionStats();
    const entry = {
      type: "stats",
      ...stats,
      timestamp: new Date().toISOString(),
    };
    appendFileSync(this.getTranscriptPath(), JSON.stringify(entry) + "\n", "utf8");
  }

  /** Get top N most token-efficient trajectories */
  getTopEfficient(n = 5): TrajectoryTurn[] {
    return [...this.turns]
      .sort(
        (a, b) => a.tokens / Math.max(a.output.length, 1) - b.tokens / Math.max(b.output.length, 1),
      )
      .slice(0, n);
  }

  // ---------------------------------------------------------------------------
  // Static helpers — list / replay past transcripts
  // ---------------------------------------------------------------------------

  /** List all past transcript sessions */
  static listSessions(transcriptDir?: string): { sessionId: string; path: string; size: number }[] {
    const dir = transcriptDir ?? join(os.homedir(), ".prometheus", "trajectories");
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => {
        const fullPath = join(dir, f);
        let sessionId = f.replace(".jsonl", "");
        let size = 0;
        try {
          const firstLine = readFileSync(fullPath, "utf8").split("\n")[0];
          const meta = JSON.parse(firstLine);
          if (meta.sessionId) sessionId = meta.sessionId;
          size = statSync(fullPath).size;
        } catch {
          // fallback to filename-derived sessionId
        }
        return { sessionId, path: fullPath, size };
      })
      .sort((a, b) => b.size - a.size);
  }
}
