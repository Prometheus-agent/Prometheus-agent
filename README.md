<div align="center">
  <h1>🔥 Prometheus</h1>
  <p><em>The self-improving AI agent. Local-first, token-optimized, everywhere.</em></p>
  <p>
    <a href="https://github.com/Prometheus-agent/Prometheus-agent/releases"><img src="https://img.shields.io/github/v/release/Prometheus-agent/Prometheus-agent?style=for-the-badge" alt="Release"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
    <a href="NOTICE.md"><img src="https://img.shields.io/badge/Powered%20By-OpenClaw%20%7C%20Hermes%20%7C%209router-orange?style=for-the-badge" alt="Powered By"></a>
  </p>
</div>

**Prometheus** is a fusion of three open-source AI agent projects — combining their strengths into something greater than the sum of its parts. Named for the titan who stole fire from the gods and gave it to humanity.

> 🚀 **80-95% less token cost** vs standalone alternatives through RTK compression, smart routing, and self-learning efficiency.

---

## 🔥 Fusion Map

| Project                                                      | Role            | Features                                                                                 |
| ------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------- |
| [OpenClaw](https://github.com/openclaw/openclaw)             | Base Gateway    | 20+ messaging channels, 143 extensions, native apps (macOS/Win/iOS/Android), tool system |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | Learning System | Self-improving loop, FTS5 cross-session memory, auto skill creation, user profiling      |
| [9router](https://github.com/decolua/9router)                | Token Governor  | RTK token compression, smart provider routing, auto-fallback, quota tracking             |

---

## ✨ What Makes Prometheus Different

### 🧠 Self-Improving Learning System

- **FTS5 full-text memory** — every conversation is indexed and searchable across sessions
- **Auto skill creation** — detects repeated tool sequences (≥3×) and creates reusable skills
- **User profiling** — learns language, formality, topics, and active hours from interactions
- **Trajectory recording** — logs every turn for fine-tuning and efficiency analysis (JSONL format)

### ⚡ Token Governor

- **RTK compression** — tool results compressed up to 80% via dedup, trimming, and smart truncation
- **4-tier smart routing** — Local ($0) → Free/Kiro ($0) → Cheap/DeepSeek → Subscription/Anthropic
- **Advisory budget tracking** — monitors usage without blocking (only ethics gates behavior)

### 🛡️ Ethics-Only Gating

Prometheus does **not** enforce hard budget limits or permission tiers. The only gate is ethics:

- Blocks destructive commands (`rm -rf /`, `DROP TABLE`, `mkfs /dev/...`)
- Blocks privacy violations
- **Everything else is allowed by default**

### 📦 Built-in Skills

| Skill                    | Purpose                                          |
| ------------------------ | ------------------------------------------------ |
| `prometheus-marketplace` | Browse, search, install, and manage skills       |
| `token-doctor`           | Diagnose token usage and RTK compression         |
| `learning-insights`      | Query FTS5 memory and user profiles              |
| `self-improve`           | Trigger skill creation and efficiency analysis   |
| `budget-manager`         | View advisory token budgets                      |
| `agent-status`           | Dashboard for worktrees, jobs, and system health |

### 🛠️ Developer Features

- **Worktree isolation** — run agents in isolated git worktrees
- **Background agent loop** — recurring skill execution on intervals
- **JSONL transcripts** — Claude Code-compatible session logging at `~/.prometheus/trajectories/`
- **Marketplace catalog** — auto-scanned registry of all skills with emoji and metadata

---

## 🚀 Quick Start

```bash
# Install
npm install -g prometheus@latest

# Run
prometheus --help
```

> **Note:** Prometheus extends OpenClaw. See the [OpenClaw docs](https://docs.openclaw.ai) for gateway setup, channel pairing, and provider configuration.

### Run Without Build (Development)

```bash
npx tsx src/entry.ts
```

### Build From Source

```bash
pnpm install
pnpm build
```

---

## 🧪 Verify Installation

```bash
prometheus --version
# → Prometheus 0.1.0

prometheus doctor
# → Checks all components
```

---

## 🏪 Skill Marketplace

Browse available skills:

```bash
ls skills/ | grep -v pyproject.toml
```

Re-scan the marketplace catalog:

```bash
node skills/prometheus-marketplace/scripts/scan-skills.mjs
```

---

## 🏗️ Architecture

```
┌─ User Input ──────────────────────────────────────────────┐
│                                                            │
│  1. ethics.checkCommand()     ← ETHICS GATE (only gate)   │
│     → Blocks destructive patterns                          │
│     → Everything else ALLOWED by default                   │
│                                                            │
│  2. governor.processRequest() ← TOKEN GOVERNOR             │
│     → RTK-compress tool results                            │
│     → Smart route to best model tier                       │
│     → Advisory budget tracking (never blocks)              │
│                                                            │
│  3. LLM call with compressed context + optimized model      │
│                                                            │
│  4. learning.evaluate()        ← LEARNING (every 5 turns)  │
│     → Store in FTS5 memory                                 │
│     → Learn user preferences                                │
│     → Detect skill patterns                                 │
│                                                            │
│  5. trajectory.record()        ← PERSISTENCE               │
│     → Append JSONL to ~/.prometheus/trajectories/          │
└────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
prometheus/
├── prometheus.mjs              # CLI entry point
├── package.json                # name: "prometheus"
├── NOTICE.md                   # Credits to upstream projects
├── src/                        # OpenClaw engine (rebranded)
│   └── fusion/                 # NEW: Prometheus integration layer
│       ├── index.ts            # Hooks: beforeLlmCall, afterTurn, etc.
│       ├── permissions.ts      # EthicsGate — the only gate
│       ├── worktree.ts         # Git worktree isolation
│       ├── agent-loop.ts       # Background agent scheduler
│       └── README.md           # Integration guide
├── packages/
│   ├── prometheus-learning/    # NEW: Hermes agent port
│   │   └── src/
│   │       ├── memory.ts        # FTS5 SQLite store
│   │       ├── skill-creator.ts # Auto-create skills
│   │       ├── user-profile.ts  # Learn user preferences
│   │       └── trajectory.ts    # JSONL recording
│   └── prometheus-token-governor/ # NEW: 9router port
│       └── src/
│           ├── router.ts        # 4-tier smart routing
│           ├── rtk.ts           # Token compression
│           └── budget.ts        # Advisory tracking
├── skills/
│   ├── prometheus-marketplace/ # NEW: Skill hub
│   ├── token-doctor/           # NEW: Token diagnostics
│   ├── learning-insights/      # NEW: Memory querying
│   ├── self-improve/           # NEW: Optimization cycle
│   ├── budget-manager/         # NEW: Budget dashboard
│   ├── agent-status/           # NEW: System dashboard
│   └── ... (57 OpenClaw skills)
└── extensions/                 # 131 OpenClaw extensions
```

---

## 📜 License & Credits

Prometheus is **MIT licensed**. See [LICENSE](LICENSE).

This project is a fusion of three open-source projects — see [NOTICE.md](NOTICE.md) for full credits:

- **OpenClaw** (MIT) — Multi-channel AI gateway
- **Hermes Agent** (MIT) — Self-improving agent loop
- **9router** (MIT) — Token optimization engine
