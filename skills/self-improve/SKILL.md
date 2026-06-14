---
name: self-improve
description: "Trigger Prometheus's self-improvement cycle: analyze trajectories, detect skill patterns, optimize token usage, and propose improvements."
metadata:
  prometheus:
    emoji: "🔄"
    group: "system"
    user-invocable: true
    aliases: ["improve", "optimize", "skill-scan", "learn"]
---

# Self-Improve

Run Prometheus's self-improvement cycle. This scans past trajectories, detects reusable skill patterns, analyzes token efficiency, and proposes improvements to make Prometheus smarter and cheaper to run.

## 1. Scan for skill patterns

The SkillCreator detects repeated tool sequences. Running this triggers a full scan:

```typescript
import { getLearningSystem } from "../src/fusion/index.js";

const ls = getLearningSystem();
// Evaluate past conversations stored in FTS5 memory
const recentMemory = ls?.memory.getRecent(100);
```

The auto-creation threshold is **3 occurrences** of the same tool sequence. When detected, a skill is created with:

- Auto-generated name from tool names
- Trigger: the first tool in the sequence
- Instructions: the full tool sequence
- Version tracking, usage count, success rate

## 2. Analyze trajectory efficiency

Find the most and least efficient trajectories:

```typescript
const efficient = ls?.trajectory.getTopEfficient(10);
const stats = ls?.trajectory.getSessionStats();
```

Look for patterns where:

- **High token consumption, low value** → could be routed to cheaper model
- **High tool call frequency** → could be collapsed into a reusable skill
- **Long output with few tokens** → efficient trajectory, good for fine-tuning data

## 3. Check user adaptation

The UserProfiler has been tracking preferences:

```typescript
// Generate user context snippet for system prompts
const userCtx = ls?.userProfiler.buildUserContext("user-abc");
```

This context is automatically injected when it exists — it helps the model adapt its responses.

## 4. Review budget (advisory)

Prometheus does not enforce budget limits, but you can check usage trends:

```typescript
import { getBudgetStatus } from "../src/fusion/index.js";

const status = getBudgetStatus();
console.log(`Daily usage: ${status?.dailyUsed} / ${status?.dailyLimit} tokens`);
```

## 5. Export for fine-tuning

```bash
# Export all session trajectories as training data
node -e "
  const { getLearningSystem } = require('./src/fusion/index.js');
  const ls = getLearningSystem();
  const data = ls.trajectory.exportForFineTuning();
  require('fs').writeFileSync('training-data.json', JSON.stringify(data, null, 2));
  console.log('Exported', data.length, 'turns for fine-tuning');
"
```

This exports in Claude API message format — ready for supervised fine-tuning.

## Run the full improvement cycle

```bash
node --import tsx -e "
  import { initFusion, getLearningSystem, getBudgetStatus } from './src/fusion/index.js';
  initFusion({ enabled: true });
  const ls = getLearningSystem();

  // 1. Stats
  const stats = ls?.trajectory.getSessionStats();
  console.log('Session stats:', JSON.stringify(stats, null, 2));

  // 2. Efficient trajectories
  const top = ls?.trajectory.getTopEfficient(5);
  console.log('Efficient trajectories:', top?.length);

  // 3. Skills discovered
  const skills = ls?.skillCreator.getAllSkills();
  console.log('Auto-created skills:', skills?.length ?? 0);

  // 4. Budget status (advisory)
  const budget = getBudgetStatus();
  console.log('Budget:', budget?.dailyUsed + '/' + budget?.dailyLimit + ' daily');
"
```
