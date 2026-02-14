# OpenClaw Config Validator Skill

**ID**: `openclaw-config-validator`  
**Version**: 2.1.0  
**OpenClaw Version**: 2026.2.1+  

> **Research First, Act Second.**  
> A comprehensive configuration validation and audit skill with enforced Research Workflow.

---

## Overview

This skill prevents OpenClaw configuration errors by:
- **Enforcing Research Workflow** - Check official docs before any config change
- **Validating against complete schema** - 22 top-level nodes documented
- **Risk assessment** - 🟢🟡🔴 classification for all changes
- **External audit support** - Notion integration for third-party review
- **Automated Schema Sync** - Keep schema in sync with docs-rag (NEW in v2.1.0)

---

## 🎯 Core Principle

> **Schema is the boundary, not the permission.**  
> Know where the boundary is. Then check the docs to confirm.

---

## ✨ New in v2.1.0

### 🔄 Schema Sync Mechanism (NEW)
**Automated synchronization** between docs-rag (source of truth) and config-validator:

```bash
# Check for schema updates from docs-rag
node bin/schema-sync.js check

# Check with detailed diff
node bin/schema-sync.js check --verbose

# Apply updates (with confirmation)
node bin/schema-sync.js apply

# Force apply without confirmation
node bin/schema-sync.js apply --force

# Dry run - see what would change
node bin/schema-sync.js apply --dry-run

# Show sync status
node bin/schema-sync.js status
```

**Features**:
- ✅ Automatic version detection
- ✅ Diff report generation
- ✅ Breaking change detection
- ✅ Manual approval gate
- ✅ Automatic backup before update

---

## ✨ New in v2.0.0

### 🔍 Research Workflow (NEW)
**Mandatory Step 0** before any configuration modification:

```bash
# Execute Research Workflow for target node
./scripts/audit-proposal.sh --target-node <node_name>

# Example: Research gateway node before modification
./scripts/audit-proposal.sh --target-node gateway --search-issues
```

**Research Workflow Steps**:
1. **Local Reference** - Check schema-quick-ref.md for node overview
2. **Official Docs** - Fetch https://docs.openclaw.ai/gateway/configuration
3. **GitHub Issues** - Search for known problems
4. **ClawHub Skills** - Check for existing solutions
5. **Schema Validation** - Cross-check against SCHEMA.md

### 📝 External Audit via Notion (NEW)
For complex changes requiring third-party review:

- **AUDITOR_PROMPT.md** - Guide for external auditors (Claude.ai)
- **Notion Bridge** - Structured audit workflow via Notion pages
- **Risk Assessment** - 🟢🟡🔴 rating with specific recommendations

---

## File Structure

```
openclaw-config-validator/
├── SKILL.md                          # This file - unified entry point
├── SPEC.yaml                         # TDD+SDD specification
├── AUDITOR_PROMPT.md                 # External audit guide (NEW)
│
├── reference/
│   ├── SCHEMA.md                     # Complete schema reference (22 nodes)
│   ├── schema-quick-ref.md           # Quick reference for Research Workflow (NEW)
│   ├── AGENT_PROMPT.md               # Agent configuration guide (updated with Step 0)
│   ├── resources.md                  # Resource index for Research (NEW)
│   └── openclaw-official-schema.json # Official JSON Schema
│
└── scripts/
    ├── get-schema.sh                 # Runtime schema extractor
    ├── schema-validate.sh            # Configuration validator
    └── audit-proposal.sh             # Research Workflow script (NEW)
```

---

## Quick Start

### 1. Before Any Config Change
```bash
# Step 0: Execute Research Workflow
./scripts/audit-proposal.sh --target-node <node_name>

# Example
./scripts/audit-proposal.sh --target-node models
```

### 2. Validate Configuration
```bash
./scripts/schema-validate.sh
```

### 3. Read Agent Guide
```bash
# For internal Agent use (Galatea)
cat reference/AGENT_PROMPT.md

# For external audit use (Claude.ai)
cat AUDITOR_PROMPT.md
```

---

## Configuration Safety Rules

### ✅ DO
- [x] **Execute Research Workflow first** (`./scripts/audit-proposal.sh`)
- [x] Read SCHEMA.md before making changes
- [x] Backup config: `cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup.$(date +%s)`
- [x] Use `jq` for modifications, never direct edit
- [x] Run `openclaw doctor` before and after changes
- [x] Use `config.patch` (not `config.apply`) for partial updates

### ❌ DON'T
- [ ] Skip Research Workflow (Step 0)
- [ ] Create new top-level nodes not in SCHEMA.md
- [ ] Add `web.braveApiKey` or similar non-existent fields
- [ ] Modify `gateway` node (read-only)
- [ ] Skip the backup step
- [ ] Guess field names or formats

---

## Risk Levels

| Level | Icon | Nodes | Action Required |
|-------|------|-------|-----------------|
| **Low** | 🟢 | `logging`, `skills`, `talk`, `audio`, `browser` | Normal caution |
| **Medium** | 🟡 | `channels`, `models`, `agents`, `tools` | Backup before modify |
| **High** | 🔴 | `gateway`, `auth` | Read-only, don't modify without Master approval |

---

## Research Workflow

### Why Research First?
OpenClaw agents have **high operational privileges but limited schema awareness**, frequently breaking their own configuration. Research Workflow enforces "check docs first" to prevent this.

### Workflow Priority
```
Step 1: Local Reference (30s)
  ├─ schema-quick-ref.md - Node overview and risk
  └─ resources.md - Resource index

Step 2: Official Docs (1-2min)
  ├─ docs.openclaw.ai/gateway/configuration
  ├─ docs.openclaw.ai/gateway/configuration-examples
  └─ docs.openclaw.ai/gateway/troubleshooting

Step 3: GitHub Search (1-2min, if needed)
  ├─ github.com/openclaw/openclaw/issues
  └─ github.com/openclaw/openclaw/discussions

Step 4: ClawHub Check (optional)
  └─ clawhub.ai/skills

Step 5: Schema Validation
  └─ Cross-check against SCHEMA.md
```

### Usage
```bash
# Basic usage
./scripts/audit-proposal.sh --target-node gateway

# With GitHub issue search
./scripts/audit-proposal.sh --target-node models --search-issues

# Audit a proposal file
./scripts/audit-proposal.sh --proposal-file ./my-proposal.md
```

---

## External Audit (Notion)

For complex configuration changes requiring third-party validation:

1. **Create Notion page** with your proposal
2. **Share with auditor** (Claude.ai)
3. **Auditor follows AUDITOR_PROMPT.md**:
   - Read proposal from Notion
   - Execute Research Workflow
   - Validate against schema
   - Write audit results back to Notion

See **AUDITOR_PROMPT.md** for complete workflow.

---

## Schema Coverage

### 22 Top-Level Nodes Documented

| Category | Nodes |
|----------|-------|
| **Core** | `gateway`, `agents`, `models`, `session` |
| **Channels** | `channels.discord`, `channels.telegram`, `channels.whatsapp`, `channels.feishu`, `channels.slack`, `channels.signal`, `channels.imessage`, `channels.mattermost`, `channels.googlechat` |
| **Tools** | `tools`, `browser`, `commands` |
| **Messaging** | `messages`, `bindings`, `hooks` |
| **Media** | `talk`, `audio` |
| **System** | `skills`, `plugins`, `cron`, `logging`, `diagnostics`, `update`, `env`, `auth`, `ui`, `wizard` |

### Complete Reference
- **SCHEMA.md** - Full documentation with examples
- **schema-quick-ref.md** - Quick reference for Research Workflow

---

## Validation Tools

### audit-proposal.sh (NEW)
Research Workflow automation:
```bash
# Check a node before modification
./scripts/audit-proposal.sh --target-node <node>

# Search for related issues
./scripts/audit-proposal.sh --target-node <node> --search-issues
```

### schema-validate.sh
Configuration validation:
```bash
# Basic validation
./scripts/schema-validate.sh

# Detailed report
./scripts/schema-validate.sh --verbose
```

### get-schema.sh
Runtime schema extraction:
```bash
# Extract from current config
./scripts/get-schema.sh
```

---

## Troubleshooting

### Research Workflow Issues
```bash
# If audit-proposal.sh fails
# 1. Check you're in skill directory
# 2. Verify reference files exist
ls reference/*.md

# 3. Run manually
cat reference/schema-quick-ref.md | grep "your-node"
```

### Configuration Validation Failed
```bash
# 1. Check specific errors
openclaw doctor

# 2. Restore from backup
LATEST=$(ls -t ~/.openclaw/openclaw.json.backup.* | head -1)
cp "$LATEST" ~/.openclaw/openclaw.json

# 3. Restart gateway
openclaw gateway restart
```

### Gateway Won't Start
```bash
# Check config syntax
jq '.' ~/.openclaw/openclaw.json

# If invalid, restore default
mv ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.broken
# Then re-run: openclaw onboard
```

---

## References

### Official
- **Config Docs**: https://docs.openclaw.ai/gateway/configuration
- **Examples**: https://docs.openclaw.ai/gateway/configuration-examples
- **Troubleshooting**: https://docs.openclaw.ai/gateway/troubleshooting
- **GitHub**: https://github.com/openclaw/openclaw

### Community
- **Discord**: https://discord.gg/clawd
- **ClawHub**: https://clawhub.ai/skills
- **Awesome List**: https://github.com/VoltAgent/awesome-openclaw-skills

---

## Changelog

### v2.0.0 (2026-02-09)
- **NEW**: Research Workflow enforcement (`audit-proposal.sh`)
- **NEW**: External audit support (`AUDITOR_PROMPT.md`)
- **NEW**: Resource index (`resources.md`)
- **NEW**: Schema quick reference (`schema-quick-ref.md`)
- **UPDATE**: AGENT_PROMPT.md with Step 0 Research Workflow
- **INTEGRATION**: Merged auditor skill capabilities

### v1.0.0 (2026-02-04)
- Initial release
- Complete OpenClaw 2026.2.1 schema documentation
- Official JSON Schema integration
- Validation scripts
- Safety guidelines and checklists

---

## License

MIT - See OpenClaw project for details.

---

**"Schema is the boundary, not the permission. Know where the boundary is."**

*Created by Galatea 🜁*  
*Updated: 2026-02-09 - Research Workflow Integration*
