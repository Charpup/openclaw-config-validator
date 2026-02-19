# Troubleshooting

Common configuration issues and solutions.

## Research Workflow Issues

### audit-proposal.sh fails
```bash
# 1. Check you're in skill directory
cd ~/.openclaw/skills/openclaw-config-validator

# 2. Verify reference files exist
ls reference/*.md

# 3. Run manually
cat reference/schema-quick-ref.md | grep "your-node"
```

## Configuration Validation Failed

```bash
# 1. Check specific errors
openclaw doctor

# 2. Restore from backup
LATEST=$(ls -t ~/.openclaw/openclaw.json.backup.* | head -1)
cp "$LATEST" ~/.openclaw/openclaw.json

# 3. Restart gateway
openclaw gateway restart
```

## Gateway Won't Start

```bash
# Check config syntax
jq '.' ~/.openclaw/openclaw.json

# If invalid, restore default
mv ~/.openopenclaw/openclaw.json ~/.openclaw/openclaw.json.broken
# Then re-run: openclaw onboard
```

## Schema Sync Issues

### Check command fails
```bash
# Verify docs-rag is accessible
node bin/schema-sync.js status

# Check local schema exists
ls reference/openclaw-official-schema.json
```

### Apply fails
```bash
# Check backup directory exists
mkdir -p .backups

# Restore from backup if needed
ls .backups/
```

## Common Mistakes

| Symptom | Cause | Solution |
|---------|-------|----------|
| `Unknown field` error | Added non-existent field | Remove field, check SCHEMA.md |
| Gateway won't start | Invalid JSON syntax | Validate with `jq`, restore backup |
| Changes not applied | Used `config.apply` instead of `config.patch` | Use `config.patch` for partial updates |
| API key not working | Wrong field name | Use `botToken` not `token` for Discord/Telegram |
| Channels not connecting | Wrong account structure | Check channel-specific examples in SCHEMA.md |

## Recovery Procedures

### Emergency Rollback
```bash
# Find latest backup
LATEST=$(ls -t ~/.openclaw/openclaw.json.backup.* | head -1)

# Restore
cp "$LATEST" ~/.openclaw/openclaw.json

# Verify
openclaw doctor

# Restart gateway
openclaw gateway restart
```

### Complete Reset
```bash
# Backup current config
mv ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.corrupted

# Re-run onboarding
openclaw onboard
```

## Getting Help

- **Official Docs**: https://docs.openclaw.ai/gateway/troubleshooting
- **GitHub Issues**: https://github.com/openclaw/openclaw/issues
- **Discord**: https://discord.gg/clawd
- **Run Diagnostics**: `openclaw doctor --verbose`
