# Prometheus Fusion Integration

This directory contains the glue layer that integrates Prometheus's systems
into the OpenClaw-based agent loop.

## Philosophy

**Prometheus does NOT enforce hard budget limits.** Budget tracking is purely
advisory — it shows you what you've used so you can make informed decisions.

**The only gate is ethics/norms:** Prometheus blocks commands that would cause
destruction, violate privacy, or enable illegal activity. Everything else is
ALLOWED by default.

## Architecture

```
┌─ User Input ──────────────────────────────────────────────┐
│                                                            │
│  1. ethics.checkCommand()     ← ETHICS GATE (only gate)   │
│     → Blocks destructive patterns (rm -rf /, DROP TABLE)  │
│     → Everything else ALLOWED by default                   │
│                                                            │
│  2. governor.processRequest() ← TOKEN GOVERNOR             │
│     → RTK-compress tool results (dedup, trim, truncate)    │
│     → Smart route to best model tier                       │
│     → Budget tracking is advisory only, never blocks       │
│                                                            │
│  3. LLM call with compressed context + optimized model      │
│                                                            │
│  4. governor.track()           ← ADVISORY TRACKING         │
│     → Updates counters for informational dashboard         │
│                                                            │
│  5. learning.evaluate()        ← LEARNING (every 5)        │
│     → Store in FTS5 memory                                 │
│     → Learn user preferences                                │
│     → Detect skill patterns                                 │
│                                                            │
│  6. trajectory.record()        ← PERSISTENCE               │
│     → Append JSONL to ~/.prometheus/trajectories/          │
└────────────────────────────────────────────────────────────┘
```

## Components

| Component       | File                                    | Purpose                                            |
| --------------- | --------------------------------------- | -------------------------------------------------- |
| TokenGovernor   | `@prometheus/prometheus-token-governor` | Routing, compression, advisory budget              |
| LearningSystem  | `@prometheus/prometheus-learning`       | FTS5 memory, skills, profiles, trajectories        |
| EthicsGate      | `permissions.ts`                        | **Only gate** — blocks destructive/illegal actions |
| WorktreeManager | `worktree.ts`                           | Git worktree isolation for agent execution         |
| AgentLoop       | `agent-loop.ts`                         | Background recurring skill execution               |

## Ethics Gate (the ONLY gate)

```typescript
import { checkEthics, checkToolEthics } from "../../fusion/index.js";

// Before running a command:
const verdict = checkEthics("rm -rf /");
if (!verdict.allowed) {
  console.error(verdict.reason); // ⛛ Ethical gate blocked: ...
  return;
}

// Everything else passes:
checkEthics("rm -rf ./temp/logs"); // { allowed: true }
checkToolEthics("Bash", "curl https://api.example.com"); // { allowed: true }
checkToolEthics("Write", "file.txt"); // { allowed: true }
```

## Integration Points

### BEFORE LLM call

```typescript
import { beforeLlmCall, afterLlmCall } from "../../fusion/index.js";

// TokenGovernor compresses messages + routes to best model
const result = beforeLlmCall(messages, "standard", userId);
// Use result.compressedMessages, result.route for the LLM call

// After LLM call:
afterLlmCall(response.tokensUsed);
```

### AFTER turn

```typescript
import { afterTurn, shouldRunLearning, recordTrajectory } from "../../fusion/index.js";

recordTrajectory(turnData);

// Every 5 turns:
if (shouldRunLearning(5)) {
  const ctx = { messages, userId, sessionId };
  const newSkill = afterTurn(ctx);
}
```

## Enabling

```typescript
import { initFusion } from "../../fusion/index.js";

initFusion({
  enabled: true,
  memoryDbPath: "~/.prometheus/memory.db",
  worktreeRepoPath: process.cwd(),
});
```
