# Task Plan - Config Validator Phase 2 (Change Detection & Notification)

## Phase 2: Schema Change Detection

### Goal
Implement automatic detection of schema changes from OpenClaw upstream and notify stakeholders of breaking changes.

### Implementation Steps

#### Step 1: Diff Algorithm
**File**: `scripts/diff-schema.js` ✅

Implemented:
- Compare old vs new JSON schemas
- Detect added/removed/modified fields
- Generate markdown report
- Exit code 2 for breaking changes

#### Step 2: Weekly Sync Cron
**Status**: ✅ Configured

```json
{
  "name": "config-validator-schema-sync",
  "schedule": { "kind": "cron", "expr": "0 3 * * 0", "tz": "Asia/Shanghai" },
  "payload": {
    "kind": "agentTurn",
    "message": "Config Validator weekly schema sync: cd ~/.openclaw/workspace/skills/openclaw-config-validator && ./scripts/extract-schema.sh && node scripts/parse-schema.js"
  }
}
```

Runs every Sunday at 3:00 AM CST.

#### Step 3: Change Notification
**Status**: ✅ Implemented in diff-schema.js

Reports include:
- 🟢 Added fields (non-breaking)
- 🟡 Modified fields (review needed)
- 🔴 Removed fields (BREAKING)

#### Step 4: Integration with Config Validator
**Next Steps**:
- [ ] Update `validate-config.js` to use synced schema
- [ ] Add schema freshness check
- [ ] Warn if schema is > 7 days old

### Deliverables ✅
- [x] `scripts/diff-schema.js` - Change detection with report generation
- [x] `scripts/parse-schema.js` - TypeScript to JSON parser
- [x] `scripts/extract-schema.sh` - GitHub schema downloader
- [x] Weekly cron job configured
- [x] SPEC.yaml updated with SchemaSync interface

### Timeline
- ✅ Day 1: Diff algorithm implementation
- ✅ Day 2: Cron configuration and testing
- [ ] Day 3-4: Integration with validation logic
- [ ] Day 5: Documentation and GitHub update

### Risk Assessment
🟢 **Low Risk** - Read-only operations, no config changes

---

## Phase 3: Integration & Validation (Upcoming)

### Goals
1. Use synced schema in validation workflows
2. Add schema freshness warnings
3. Auto-trigger Research Workflow on breaking changes

### Next Actions
1. Update `validate-config.js` to load from `reference/openclaw-schema.json`
2. Add `--check-freshness` flag to validator
3. Integrate with Notion for change notifications

---

*Last updated: 2026-02-10*
