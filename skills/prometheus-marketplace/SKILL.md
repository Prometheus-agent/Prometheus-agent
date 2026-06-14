---
name: prometheus-marketplace
description: "Browse, search, discover, install, and manage Prometheus skills. The central hub for finding new capabilities."
metadata:
  prometheus:
    emoji: "🏪"
    group: "system"
    user-invocable: true
    aliases: ["marketplace", "skills", "install", "discover"]
---

# Prometheus Skill Marketplace

The marketplace is the central registry for discovering, installing, and managing Prometheus skills. Skills are compact triggerable workflows stored in `skills/`.

## Browse available skills

List all installed skills and their status:

```bash
ls skills/ | grep -v pyproject.toml
```

Each skill directory contains a `SKILL.md` with YAML frontmatter:

```yaml
name: <short-name>
description: "<one-line trigger description>"
metadata:
  prometheus:
    emoji: "🎯"
    group: "system|productivity|devtools|media|communication"
    user-invocable: true|false
    requires: { bins: ["tool-name"] }
    install:
      - { id: "brew", kind: "brew", formula: "pkg", bins: ["bin"] }
```

## Search skills by keyword

```bash
grep -l "keyword" skills/*/SKILL.md
grep -r "^name:" skills/*/SKILL.md  # list all skill names
```

## Skill anatomy

```
skill-name/
  SKILL.md          # Frontmatter + instructions (required)
  scripts/          # Optional helper scripts
  references/       # Optional docs, loaded only when needed
  assets/           # Optional output resources/templates
```

## Install a skill from the marketplace

When the marketplace catalog is published at a registry URL:

```
# Planned: prometheus marketplace install <name>
# Planned: prometheus marketplace search <query>
# Planned: prometheus marketplace update --all
```

## Create a new skill

Use `self-improve` or the `skill-creator` skill to auto-create skills when
repeated patterns are detected. Or manually:

1. Create `skills/<name>/SKILL.md`
2. Add YAML frontmatter with `name`, `description`
3. Write the skill body as markdown instructions
4. The LearningSystem will auto-discover it on next scan

## Installed skills

| Skill                  | Description                                               |
| ---------------------- | --------------------------------------------------------- |
| token-doctor           | Analyze token usage, budget, and optimization             |
| learning-insights      | Query FTS5 memory and see what Prometheus has learned     |
| self-improve           | Trigger skill creation and trajectory efficiency analysis |
| budget-manager         | Check/adjust token budgets, view spending trends          |
| agent-status           | Dashboard for worktrees, background jobs, system health   |
| prometheus-marketplace | **This skill** — browse and manage skills                 |
