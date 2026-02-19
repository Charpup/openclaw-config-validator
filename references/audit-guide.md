# Audit Guide

External audit support for complex configuration changes requiring third-party validation.

## When to Use External Audit

- High-risk changes (🔴 nodes)
- Production environment modifications
- Multi-node configuration updates
- Breaking changes to critical systems

## Workflow

1. **Create Notion Page** with your proposal
2. **Share with Auditor** (e.g., Claude.ai)
3. **Auditor Follows AUDITOR_PROMPT.md**:
   - Read proposal from Notion
   - Execute Research Workflow
   - Validate against schema
   - Write audit results back to Notion

## Audit Checklist

### For Proposers
- [ ] Document current configuration
- [ ] Explain proposed changes
- [ ] List affected nodes
- [ ] Provide rollback plan
- [ ] Create Notion page and share

### For Auditors
- [ ] Read proposal thoroughly
- [ ] Execute Research Workflow (`audit-proposal.sh`)
- [ ] Validate against SCHEMA.md
- [ ] Check risk levels of affected nodes
- [ ] Verify no forbidden patterns
- [ ] Write findings to Notion

## Risk Assessment Template

```markdown
## Risk Assessment

| Node | Risk Level | Concerns | Recommendation |
|------|------------|----------|----------------|
| gateway | 🔴 | Critical system | Read-only, do not modify |
| models | 🟡 | API keys involved | Backup required |
| logging | 🟢 | Low impact | Safe to modify |

**Overall Risk**: 🟡 Medium
**Recommendation**: Proceed with backup
```

## Files

- **AUDITOR_PROMPT.md** - Complete guide for external auditors
- **reference/AGENT_PROMPT.md** - Internal Agent guide

## Notion Integration

Use the Notion skill to create structured audit pages:

```
Create Notion page:
- Title: "Config Audit: [Description]"
- Proposed changes
- Risk assessment
- Auditor findings section
```
