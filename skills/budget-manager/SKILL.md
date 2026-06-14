---
name: budget-manager
description: "View and manage Prometheus token budgets across session, daily, monthly, and per-user limits. Adjust allocation and review spending trends."
metadata:
  prometheus:
    emoji: "💰"
    group: "system"
    user-invocable: true
    aliases: ["budget", "limits", "spending", "usage"]
---

# Budget Manager

Monitor Prometheus's token consumption. **Advisory only — Prometheus does not enforce hard budget limits.** Budget tracking is informational to help you make decisions. The only gate is ethics.

## Current budget status

```typescript
import { getBudgetStatus } from "../src/fusion/index.js";

const status = getBudgetStatus();
```

Returns:

| Field          | Description                            |
| -------------- | -------------------------------------- |
| `dailyUsed`    | Tokens consumed today                  |
| `dailyLimit`   | Maximum tokens per day                 |
| `monthlyUsed`  | Tokens consumed this month             |
| `monthlyLimit` | Maximum tokens per month               |
| `sessionUsed`  | Tokens in current session              |
| `sessionLimit` | Maximum per session                    |
| `remaining`    | Remaining daily tokens (informational) |

## Default limits (informational only)

| Scope    | Limit      | Purpose         |
| -------- | ---------- | --------------- |
| Session  | 50,000     | Per-session cap |
| Daily    | 500,000    | Per-day cap     |
| Monthly  | 10,000,000 | Per-month cap   |
| Per-user | 200,000    | Per-user cap    |

Configurable via the `BudgetController` constructor:

```typescript
initFusion({
  governorLimits: {
    session: 100_000,
    daily: 1_000_000,
    monthly: 20_000_000,
    perUser: 500_000,
  },
});
```

## View spending trends

```bash
# Show daily usage trend from memory
node -e "
  const { initFusion, getBudgetStatus } = require('./src/fusion/index.js');
  initFusion({ enabled: true });
  const s = getBudgetStatus();
  console.log('Budget Report:');
  console.log('  Daily:      ' + s?.dailyUsed + ' / ' + s?.dailyLimit + ' (' + ((s?.dailyUsed/s?.dailyLimit)*100).toFixed(1) + '%)');
  console.log('  Monthly:    ' + s?.monthlyUsed + ' / ' + s?.monthlyLimit);
  console.log('  Session:    ' + s?.sessionUsed);
"
```

> **Note:** These are informational only — Prometheus never blocks based on token usage. Only ethics gates behavior.
