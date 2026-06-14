---
name: agent-status
description: "Dashboard for Prometheus system health: worktrees, background agent jobs, component versions, and diagnostics."
metadata:
  prometheus:
    emoji: "📊"
    group: "system"
    user-invocable: true
    aliases: ["status", "health", "dashboard", "ps", "info"]
---

# Agent Status

Full system dashboard for Prometheus: inspect all running components, worktrees, background jobs, and perform health checks.

## Show all worktrees

```typescript
import { listWorktrees } from "../src/fusion/index.js";

const worktrees = listWorktrees();
// [{ path: "/path", branch: "prometheus/wt/task-...", commit: "abc1234" }]
```

Worktrees are isolated git copies for safe agent execution. Created with:

```bash
prometheus --worktree my-task
```

## Show background agent jobs

```typescript
import { listAgentJobs } from "../src/fusion/index.js";

const jobs = listAgentJobs();
// [{ name, running, intervalMs, iterations, lastRunAt, nextRunAt }]
```

Background jobs run skills on a recurring interval:

```bash
prometheus agents run check-deploy --interval 5m
prometheus agents ls
prometheus agents stop check-deploy
```

## Budget status (informational)

Prometheus does NOT enforce budget limits — this is advisory only:

```typescript
import { getBudgetStatus } from "../src/fusion/index.js";

const budget = getBudgetStatus();
console.log(`Daily: ${budget?.dailyUsed} / ${budget?.dailyLimit}`);
console.log(`Monthly: ${budget?.monthlyUsed} / ${budget?.monthlyLimit}`);
```

## Learning system status

```typescript
import { getLearningSystem } from "../src/fusion/index.js";

const ls = getLearningSystem();
console.log(`Evaluated turns: ${ls?.evaluatedTurns}`);
console.log(`Skills created: ${ls?.skillCreator.getAllSkills().length}`);
console.log(`Recent memories: ${ls?.memory.getRecent(5).length}`);
```

## Trajectory stats

```typescript
const stats = ls?.trajectory.getSessionStats();
console.log(`Total turns: ${stats?.totalTurns}`);
console.log(`Total tokens: ${stats?.totalTokens}`);
console.log(`Avg latency: ${stats?.avgLatencyMs}ms`);
console.log(`Tool call rate: ${(stats?.toolCallRate ?? 0) * 100}%`);
```

## Version info

```bash
node -e "
  const pkg = require('./package.json');
  console.log('Prometheus v' + pkg.version);
  console.log('License: ' + pkg.license);
  console.log('Homepage: ' + pkg.homepage);
"
```

## Full dashboard script

Run a comprehensive health check:

```bash
node --import tsx -e "
  import { initFusion, getBudgetStatus, getLearningSystem, listWorktrees, listAgentJobs, getPermissionPolicy } from './src/fusion/index.js';
  initFusion({ enabled: true });

  console.log('=== Prometheus Dashboard ===');
  console.log('');

  const budget = getBudgetStatus();
  console.log('Budget (advisory):', budget?.dailyUsed + '/' + budget?.dailyLimit + ' daily');

  const ls = getLearningSystem();
  console.log('Learning:', ls?.evaluatedTurns, 'turns evaluated,', ls?.skillCreator.getAllSkills().length, 'skills');

  const wts = listWorktrees();
  console.log('Worktrees:', wts.length, 'active');

  const jobs = listAgentJobs();
  console.log('Background jobs:', jobs.length, (jobs.length ? '(' + jobs.filter(j => j.running).length + ' running)' : ''));
"
```
