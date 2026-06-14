/**
 * Prometheus Worktree Manager — git worktree isolation for agent execution.
 *
 * Inspired by Claude Code's --worktree flag. Creates an isolated git worktree
 * so agent tool calls operate in a sandboxed copy without affecting the main
 * working tree.
 *
 * Usage:
 *   const wt = new WorktreeManager(repoPath);
 *   const { path, branch } = await wt.create("my-task");
 *   // ... run agent in `path` ...
 *   await wt.remove(path);
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

export interface WorktreeInfo {
  path: string;
  branch: string;
  commit?: string;
}

export interface WorktreeManagerConfig {
  /** Base directory for worktrees (default: .claude/worktrees) */
  baseDir?: string;
  /** Whether to auto-create base dir */
  autoCreate?: boolean;
}

export class WorktreeManager {
  private repoPath: string;
  private config: Required<WorktreeManagerConfig>;
  private activeWorktrees: Map<string, WorktreeInfo> = new Map();

  constructor(repoPath: string, config?: WorktreeManagerConfig) {
    this.repoPath = resolve(repoPath);
    this.config = {
      baseDir: config?.baseDir ?? join(this.repoPath, ".claude", "worktrees"),
      autoCreate: config?.autoCreate ?? true,
    };
    if (this.config.autoCreate && !existsSync(this.config.baseDir)) {
      mkdirSync(this.config.baseDir, { recursive: true });
    }
  }

  /**
   * Create a new isolated worktree on a fresh branch.
   * Returns the worktree path and branch name.
   */
  async create(name?: string): Promise<WorktreeInfo> {
    const branch = name
      ? `prometheus/wt/${name}-${Date.now()}`
      : `prometheus/wt/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const worktreePath = join(this.config.baseDir, branch.replace(/[/:]/g, "-"));

    // Get the default branch to base from
    const defaultBranch = this.exec(
      `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo "main"`,
    )
      .replace("refs/remotes/origin/", "")
      .trim();

    // Create a new branch from origin/default
    this.exec(`git branch ${branch} origin/${defaultBranch} 2>/dev/null`);

    // Create the worktree
    this.exec(`git worktree add "${worktreePath}" ${branch}`);

    const info: WorktreeInfo = {
      path: worktreePath,
      branch,
      commit: this.exec(`git rev-parse --short ${branch}`).trim(),
    };
    this.activeWorktrees.set(worktreePath, info);
    return info;
  }

  /**
   * Remove a worktree and its branch.
   */
  async remove(worktreePath: string): Promise<void> {
    const info = this.activeWorktrees.get(worktreePath);
    const branch = info?.branch ?? this.findBranchForWorktree(worktreePath);
    if (branch) {
      this.exec(`git worktree remove "${worktreePath}" 2>/dev/null || true`);
      this.exec(`git branch -D ${branch} 2>/dev/null || true`);
    }
    this.activeWorktrees.delete(worktreePath);
  }

  /**
   * List all active worktrees.
   */
  list(): WorktreeInfo[] {
    const output = this.exec("git worktree list --porcelain");
    const trees: WorktreeInfo[] = [];
    let current: Partial<WorktreeInfo> = {};
    for (const line of output.split("\n")) {
      if (line.startsWith("worktree ")) {
        if (current.path) {
          trees.push(current as WorktreeInfo);
        }
        current = { path: line.slice(9) };
      } else if (line.startsWith("branch ")) {
        current.branch = line.slice(7).replace("refs/heads/", "");
      } else if (line.startsWith("HEAD ")) {
        current.commit = line.slice(5);
      }
    }
    if (current.path) trees.push(current as WorktreeInfo);
    return trees;
  }

  /** Check if a worktree has uncommitted changes */
  hasChanges(worktreePath: string): boolean {
    try {
      const status = execSync(`cd "${worktreePath}" && git status --porcelain`, {
        encoding: "utf8",
        stdio: "pipe",
      }).trim();
      return status.length > 0;
    } catch {
      return false;
    }
  }

  private exec(command: string): string {
    try {
      return execSync(command, { cwd: this.repoPath, encoding: "utf8", stdio: "pipe" }).trim();
    } catch {
      return "";
    }
  }

  private findBranchForWorktree(worktreePath: string): string | null {
    const resolved = resolve(worktreePath);
    for (const wt of this.list()) {
      if (resolve(wt.path) === resolved) {
        return wt.branch;
      }
    }
    return null;
  }
}
