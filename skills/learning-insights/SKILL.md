---
name: learning-insights
description: "Query Prometheus's FTS5 memory store, view user profiles, search past conversations, and see what the system has learned."
metadata:
  prometheus:
    emoji: "🧠"
    group: "system"
    user-invocable: true
    aliases: ["memory", "recall", "profile", "search"]
---

# Learning Insights

Query the Prometheus LearningSystem's FTS5 full-text search memory, inspect user profiles, and review auto-created skills.

## Search past conversations

The FTS5 memory index stores every conversation turn. Search with SQLite FTS5 syntax:

```typescript
import { getLearningSystem } from "../src/fusion/index.js";

const ls = getLearningSystem();
const results = ls?.memory.search("deployment script", 10);
// Returns MemoryEntry[] with session_id, role, content, summary, timestamp
```

FTS5 supports:

- Simple terms: `deployment script`
- Prefix: `deploy*`
- Phrases: `"ci pipeline"`
- Boolean: `deploy NOT test`

## Get recent context for warm-start

```typescript
const recent = ls?.memory.getRecent(20);
```

Useful for restoring conversational context across sessions.

## View user profiles

The UserProfiler learns from each interaction:

```typescript
const profile = ls?.userProfiler.getProfile("user-abc");
// {
//   preferences: { language, formality, conciseness },
//   topics: ["deployment", "testing", "api"],
//   activeHours: { "9": 15, "10": 22, "14": 18, ... },
//   totalInteractions: 142
// }
```

## View auto-created skills

When the SkillCreator detects the same tool sequence ≥3 times, it creates a reusable skill:

```typescript
const skills = ls?.skillCreator.getAllSkills();
// [{ name: "auto_deploy_check", trigger: "bash", usageCount: 12, successRate: 0.92 }]
```

Each skill tracks `usageCount` and `successRate` for self-improvement.

## Review trajectory efficiency

Find the most token-efficient trajectories for fine-tuning:

```typescript
const efficient = ls?.trajectory.getTopEfficient(5);
// Turns sorted by tokens/output-length ratio
```

Export them for model fine-tuning:

```typescript
const trainingData = ls?.trajectory.exportForFineTuning();
// [{ messages: [...], tools_used: [...], metrics: {...} }]
```

## View session stats

```typescript
const stats = ls?.trajectory.getSessionStats();
// { totalTurns, totalTokens, totalCost, toolCallRate, avgLatencyMs, modelsUsed }
```

## List past sessions

```bash
ls ~/.prometheus/trajectories/*.jsonl 2>/dev/null | head -10
```

Each JSONL file contains one session's transcript in `metadata → turn → turn → ... → stats` format.
