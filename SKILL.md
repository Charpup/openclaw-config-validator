---
name: openclaw-config-validator
description: Validate and safely modify OpenClaw configuration (openclaw.json) against its 22-node schema. Enforces Research Workflow before any change; uses config.patch (not config.apply) for partial updates. Triggers on "config validation", "schema check", "openclaw.json", "config.patch", "gateway configuration". Risk levels: green/yellow/red.
version: 1.0.0
---

# OpenClaw Config Validator

> **Research First, Act Second.**  
> Configuration validation with enforced Research Workflow.

## Quick Start

```bash
# Before ANY config change - Run Research Workflow
./scripts/audit-proposal.sh --target-node <node_name>

# Validate current configuration
./scripts/schema-validate.sh

# Check for schema updates
node bin/schema-sync.js check
```

## Core Commands

| Command | Purpose |
|---------|---------|
| `audit-proposal.sh --target-node <node>` | Research Workflow for target node |
| `schema-validate.sh` | Validate configuration against schema |
| `schema-sync.js check` | Check for docs-rag schema updates |
| `schema-sync.js apply` | Apply schema updates (with confirmation) |
| `get-schema.sh` | Extract runtime schema from current config |

## Risk Levels

| Level | Icon | Example Nodes | Action |
|-------|------|---------------|--------|
| Low | 🟢 | `logging`, `skills`, `talk` | Normal caution |
| Medium | 🟡 | `channels`, `models`, `agents` | Backup before modify |
| High | 🔴 | `gateway`, `auth` | Read-only without approval |

## Safety Rules

### ✅ DO
- Execute Research Workflow first (`audit-proposal.sh`)
- Backup: `cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup.$(date +%s)`
- Use `jq` for modifications, never direct edit
- Run `openclaw doctor` before and after changes
- Use `config.patch` (not `config.apply`) for partial updates

### ❌ DON'T
- Skip Research Workflow
- Create new top-level nodes not in schema
- Add non-existent fields (e.g., `web.braveApiKey`)
- Modify `gateway` node without approval

## References

- [Schema Sync](./references/schema-sync.md) - Automated docs-rag synchronization
- [Research Workflow](./references/research-workflow.md) - Pre-modification research steps
- [Audit Guide](./references/audit-guide.md) - External audit via Notion
- [Configuration](./references/configuration.md) - Complete node documentation
- [Troubleshooting](./references/troubleshooting.md) - Common issues and fixes
- [SCHEMA.md](./reference/SCHEMA.md) - 22 top-level nodes (authoritative)
- [AGENT_PROMPT.md](./reference/AGENT_PROMPT.md) - Internal Agent guide

## Schema Coverage

22 top-level nodes: `gateway`, `agents`, `models`, `session`, `channels.*`, `tools`, `browser`, `commands`, `messages`, `bindings`, `hooks`, `talk`, `audio`, `skills`, `plugins`, `cron`, `logging`, `diagnostics`, `update`, `env`, `auth`, `ui`, `wizard`

---

**"Schema is the boundary, not the permission."**
