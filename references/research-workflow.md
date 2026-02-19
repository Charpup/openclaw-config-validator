# Research Workflow

**Mandatory Step 0** before any configuration modification.

## Why Research First?

OpenClaw agents have high operational privileges but limited schema awareness. Research Workflow enforces "check docs first" to prevent configuration errors.

## Workflow Steps

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

## Usage

```bash
# Basic usage
./scripts/audit-proposal.sh --target-node gateway

# With GitHub issue search
./scripts/audit-proposal.sh --target-node models --search-issues

# Audit a proposal file
./scripts/audit-proposal.sh --proposal-file ./my-proposal.md
```

## Risk Assessment

During research, check risk levels:

| Risk | Action Required |
|------|-----------------|
| 🟢 Low | Normal caution |
| 🟡 Medium | Backup before modify |
| 🔴 High | Read-only without approval |

## Resources

### Official
- Config Docs: https://docs.openclaw.ai/gateway/configuration
- Examples: https://docs.openclaw.ai/gateway/configuration-examples
- Troubleshooting: https://docs.openclaw.ai/gateway/troubleshooting

### Community
- GitHub: https://github.com/openclaw/openclaw
- Discord: https://discord.gg/clawd
- ClawHub: https://clawhub.ai/skills
