# Configuration Reference

Complete documentation for OpenClaw 2026.2.1 configuration nodes.

## Config File

- **Path**: `~/.openclaw/openclaw.json` (JSON5, supports comments and trailing commas)
- **Validation**: Zod schema (`OpenClawSchema`), strict mode
- **Recovery**: `openclaw doctor` → `openclaw doctor --fix`

## Top-Level Nodes (22 total)

| Node | Risk | Purpose |
|------|------|---------|
| `agents` | 🟡 | Agent defaults, per-agent overrides, identity, workspace, sandbox, tools |
| `models` | 🟡 | Provider configs, custom base URLs, API keys (use env vars) |
| `session` | 🟡 | Session scoping, history limits, context behavior |
| `commands` | 🟢 | Chat command handling |
| `channels.whatsapp` | 🟡 | WhatsApp: allowFrom, dmPolicy, groups, accounts, readReceipts |
| `channels.telegram` | 🟡 | Telegram: botToken, accounts, groups, allowFrom |
| `channels.discord` | 🟡 | Discord: botToken, accounts, guilds |
| `channels.slack` | 🟡 | Slack: socket mode config |
| `channels.feishu` | 🟡 | Feishu/Lark integration |
| `channels.googlechat` | 🟡 | Google Chat: webhook config |
| `channels.signal` | 🟡 | Signal: signal-cli integration |
| `channels.imessage` | 🟡 | iMessage: imsg CLI |
| `channels.mattermost` | 🟡 | Mattermost: bot token |
| `messages` | 🟢 | Prefixes, ack reactions, TTS, queue, inbound settings |
| `tools` | 🟡 | Tool policies, agentToAgent, exec settings |
| `browser` | 🟢 | Managed browser config |
| `hooks` | 🟡 | Gateway webhooks |
| `talk` | 🟢 | Voice mode (macOS/iOS/Android) |
| `skills` | 🟢 | Skills directory config |
| `plugins` | 🟡 | Extension plugins |
| `bindings` | 🟡 | Multi-agent message routing |
| `gateway` | 🔴 | Server bind, port, auth, reload — RARELY modify |
| `logging` | 🟢 | Log level, file path, console style, redaction |
| `env` | 🟢 | Env vars, shellEnv opt-in |
| `auth` | 🔴 | Auth profiles, provider order — sensitive |
| `wizard` | 🟢 | Metadata from CLI wizards (auto-managed) |
| `ui` | 🟢 | Appearance settings |
| `cron` | 🟡 | Scheduled jobs and wake events |
| `discovery` | 🟡 | mDNS/Bonjour broadcast, wide-area DNS-SD |
| `canvasHost` | 🟢 | LAN Canvas file server |

## Config Modification Methods

| Method | Scope | Risk | Use when |
|--------|-------|------|----------|
| `config.patch` | Partial merge | 🟡 | Changing specific keys (**PREFERRED**) |
| `config.apply` | Full replace | 🔴 | Complete config rewrite (**DANGEROUS**) |
| `openclaw config set` | Single key | 🟢 | Quick single-value change |
| `openclaw configure` | Interactive wizard | 🟢 | Guided section-by-section update |
| Manual JSON edit | Full file | 🟡 | Complex changes with backup |

## Critical Pitfalls

### Forbidden Patterns
- Adding non-existent fields (e.g., `web.braveApiKey` — doesn't exist)
- Modifying `gateway.port` without understanding implications
- Using `config.apply` when `config.patch` suffices
- Putting `token` instead of `botToken` for Telegram/Discord accounts
- Mixing up channel-level vs account-level settings

### Pre-Modification Checklist
1. **Backup**: `cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak.$(date +%s)`
2. **Read current config**: `openclaw gateway call config.get --params '{}'`
3. **Validate proposed changes against schema**
4. **Use `config.patch`** (not `config.apply`) for partial changes
5. **Include `baseHash`** from config.get in patch/apply calls
6. **After change**: `openclaw doctor` to verify
7. **Check logs**: `grep -i error /tmp/openclaw/openclaw-gateway.log | tail -20`

## Environment Variables

Config supports `${VAR_NAME}` syntax (uppercase only, resolved at load time).  
Missing vars cause load failure. Escape with `$${VAR}` for literals.

## Config Includes

`$include` directive for splitting configs:

```json
{
  "$include": "./base-config.json",
  "models": { "$include": "./models.json" }
}
```

## Complete Reference

See [SCHEMA.md](../reference/SCHEMA.md) for full node documentation with examples.
