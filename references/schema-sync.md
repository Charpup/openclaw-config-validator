# Schema Sync Mechanism

Automated synchronization between docs-rag (source of truth) and config-validator.

## Architecture Update (v2.0)

**Updated for docs-rag v4.0**: The schema extractor now uses real-time llms.txt-based retrieval instead of PostgreSQL vector search.

### What's New
- Real-time retrieval: No database required, fetches from docs.openclaw.ai/llms.txt
- Dual mode support: Auto-detects docs-rag v4.0, falls back to legacy PostgreSQL mode
- Improved extraction: Better JSON5 parsing, 24 configuration nodes, 86+ enum values
- Retry logic: Exponential backoff for network resilience
- 5-minute TTL cache: Leverages docs-rag v4.0 caching for performance

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
- ✅ Docs-rag v4.0 integration (real-time)
- ✅ Backward compatibility (legacy PostgreSQL mode)

## How It Works

### v4.0 Mode (Default)
```
docs.openclaw.ai/llms.txt
    ↓
DocsRAG v4.0 (real-time fetch)
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

### Legacy Mode (Fallback)
If docs-rag v4.0 is unavailable, automatically falls back to PostgreSQL-based extraction.

## Safety

- Always creates backup before applying
- Auto-restore on failure
- Breaking changes require explicit --force
- Graceful degradation if docs-rag v4.0 unavailable

## Migration Notes

### From v1.x (PostgreSQL only)
No action required. The extractor auto-detects available mode:
- If ../../docs-rag/src/index exists → Uses v4.0
- Otherwise → Falls back to legacy PostgreSQL

### Environment Variables
Legacy mode still supports:
- PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD

v4.0 mode requires no additional configuration.
