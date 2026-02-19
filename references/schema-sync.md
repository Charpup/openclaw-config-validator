# Schema Sync Mechanism

Automated synchronization between docs-rag (source of truth) and config-validator.

## Commands

```bash
# Check for schema updates
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

## Features

- ✅ Automatic version detection
- ✅ Diff report generation
- ✅ Breaking change detection
- ✅ Manual approval gate
- ✅ Automatic backup before update

## How It Works

1. **Extract**: Pull schema from docs-rag chunks
2. **Compare**: Diff against local `openclaw-official-schema.json`
3. **Report**: Show changes with risk assessment
4. **Confirm**: Manual approval for safety
5. **Apply**: Update schema files with backup
6. **Document**: Regenerate SCHEMA.md reference

## Workflow

```
docs-rag (source of truth)
    ↓
SchemaExtractor (lib/schema-extractor.js)
    ↓
VersionComparator (lib/version-comparator.js)
    ↓
Diff Report → Manual Approval
    ↓
Update Files + Backup
    ↓
SCHEMA.md regenerated
```

## Safety

- Always creates backup before applying
- Auto-restore on failure
- Breaking changes require explicit `--force`
