---
name: token-doctor
description: "Analyze Prometheus token usage, budget status, RTK compression ratio, and per-model cost breakdown."
metadata:
  prometheus:
    emoji: "💊"
    group: "system"
    user-invocable: true
    aliases: ["tokens", "usage", "cost", "analyze"]
---

# Token Doctor

Diagnose and analyze Prometheus's token consumption and optimization opportunities.

**Note: Prometheus does NOT enforce hard budget limits.** Budget is advisory —
it shows you what you've used, but never blocks. The only gate is ethics.

## Check current budget status

The TokenGovernor tracks usage informationally across session, daily, and monthly scopes:

Call the budget status API:

```typescript
import { getBudgetStatus } from "../src/fusion/index.js";

const status = getBudgetStatus();
// {
//   dailyUsed, dailyLimit, monthlyUsed, monthlyLimit,
//   sessionUsed, sessionLimit, remaining, tier
// }
```

## Analyze RTK compression

The Real-Time Token Killer compresses tool results before sending them to the LLM:

- Max 800 tokens per tool result (configurable)
- Lines trimmed: first N/2 + last 10
- Stack traces: `Error: message` + last 10 frames only
- Large JSON arrays: keep first 10 items
- Dedup cache: tool results cached by content hash, re-sends blocked

```typescript
import { getTokenGovernor } from "../src/fusion/index.js";

const governor = getTokenGovernor();
const hitRate = governor?.compressor.cacheHitRate ?? 0;
console.log(`RTK cache hit rate: ${(hitRate * 100).toFixed(1)}%`);
```

## Per-model cost breakdown

The SmartRouter uses a 4-tier model hierarchy. Check routing decisions:

| Tier | Provider         | Cost/1M input | Use case                |
| ---- | ---------------- | ------------- | ----------------------- |
| 0    | Ollama (local)   | $0            | Greetings, simple tasks |
| 1    | Kiro AI (free)   | $0            | Simple queries          |
| 2    | DeepSeek         | $0.50         | Standard tasks          |
| 3    | Anthropic/OpenAI | $2.50-$3.00   | Complex/deep work       |

## Suggested optimizations

1. **Increase RTK max tokens** if complex tool results are getting truncated: adjust in `TokenGovernor` constructor
2. **Review routing tiers** — move frequent tasks to cheaper models by adjusting `TaskPriority`
3. **Check cache hit rate** — low hit rate means tool results are too diverse to deduplicate
