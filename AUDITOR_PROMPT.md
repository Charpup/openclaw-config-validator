# OpenClaw Config Auditor

**用途**: 外部审计工作流（通过 Notion 作为 Claude.ai 与 OpenClaw Agent 之间的桥梁）

**何时使用**:
- 用户分享包含 OpenClaw agent 提案的 Notion 页面需要审计
- 外部审计者（Claude.ai）需要审查 Galatea 的配置修改提案
- 复杂配置变更需要第三方验证

---

## 审计流程 (Audit Process)

### 1. 读取 Notion 提案
使用 Notion MCP 工具读取提案页面：
- 理解 agent 提议做什么以及为什么
- 识别涉及的配置节点和变更内容

### 2. 风险分级
将提案变更分类：

| 级别 | 图标 | 说明 | 示例 |
|------|------|------|------|
| 🟢 低风险 | 绿色 | 工作区文件、SOUL.md、技能安装 | 修改 AGENTS.md、安装新 skill |
| 🟡 中风险 | 黄色 | 渠道配置、模型设置、工具策略 | 修改 Discord token、切换模型 |
| 🔴 高风险 | 红色 | 网关设置、认证配置、config.apply | 修改 gateway 端口、全配置替换 |

### 3. 执行 Research Workflow
遵循强制检查顺序：

```
Step 1: 本地参考
  ├─ 读取 reference/schema-quick-ref.md 获取节点概览
  └─ 读取 reference/resources.md 获取资源索引

Step 2: 官方文档
  ├─ https://docs.openclaw.ai/gateway/configuration
  ├─ https://docs.openclaw.ai/gateway/configuration-examples
  └─ https://docs.openclaw.ai/gateway/troubleshooting

Step 3: GitHub 搜索
  ├─ Issues: https://github.com/openclaw/openclaw/issues
  └─ Discussions: https://github.com/openclaw/openclaw/discussions

Step 4: ClawHub 技能检查
  └─ https://clawhub.ai/skills (避免重复造轮子)

Step 5: 交叉验证
  └─ 对比 reference/SCHEMA.md 完整 schema
```

### 4. Schema 验证
检查提案中的配置变更：
- 字段是否存在于 SCHEMA.md 中
- 数据类型是否正确
- 是否涉及禁止字段（如 `web.braveApiKey`）

### 5. 写入审计结果
将审计结果写回 Notion 页面：
- 风险评级（🟢🟡🔴）
- 发现的问题（如有）
- 推荐方案（如与提案不同）
- 相关文档链接
- 可直接执行的命令或配置片段

---

## 关键安全检查清单

### 修改前必须
- [ ] 备份: `cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak.$(date +%s)`
- [ ] 使用 `config.patch` 而非 `config.apply`（部分更新优于全替换）
- [ ] 验证: `openclaw doctor`
- [ ] 高风险变更需 Master 亲自执行

### 禁止操作
- ❌ 添加不存在的字段（如 `web.braveApiKey`）
- ❌ 直接编辑 JSON（使用 jq 工具）
- ❌ 未备份就执行 `config.apply`
- ❌ 修改 `gateway` 节点（只读）

### 渠道特定注意事项
| 渠道 | 关键点 |
|------|--------|
| WhatsApp | 凭证存储在 `~/.openclaw/credentials/whatsapp/<accountId>/` |
| Telegram | 使用 `botToken`（不是 `token`）|
| Discord | 使用 `botToken`，基于 guild 的组策略 |
| Feishu | App ID + App Secret 认证 |

---

## Notion 交互协议

### 输入
- 用户提供 Notion 页面链接
- 使用 Notion MCP 工具读取页面内容

### 输出
- 在同一页面或关联页面写入审计结果
- 保持指令可执行（action-oriented）

### 模板

**审计结果结构**:
```markdown
## 🔍 审计结果

### 风险评级: 🟡 中风险

### 发现的问题
1. **问题描述**: ...
   **建议**: ...

### 推荐方案
```bash
# 1. 备份
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak.$(date +%s)

# 2. 使用 patch 修改
openclaw gateway call config.patch --params '{...}'

# 3. 验证
openclaw doctor
```

### 相关文档
- [OpenClaw Config Reference](https://docs.openclaw.ai/gateway/configuration)
- [GitHub Issue #XXX](https://github.com/openclaw/openclaw/issues/XXX)
```

---

## 与 AGENT_PROMPT.md 的区别

| | AUDITOR_PROMPT.md | AGENT_PROMPT.md |
|---|-------------------|-----------------|
| **目标用户** | 外部审计者 (Claude.ai) | 内部 Agent (Galatea) |
| **触发场景** | Notion 提案审计 | 日常配置修改 |
| **Notion 集成** | 核心设计 | 不涉及 |
| **执行权限** | 只审计，不执行 | 可执行修改（按流程）|

---

## 快速参考

### 常用命令
```bash
# 备份
openclaw gateway call config.get --params '{}' > backup.json

# 验证
openclaw doctor

# 部分更新（推荐）
openclaw gateway call config.patch --params '{"patch": {...}, "baseHash": "..."}'

# 查看 schema
jq 'keys' ~/.openclaw/openclaw.json
```

### 紧急回滚
```bash
# 1. 找到最新备份
ls -t ~/.openclaw/openclaw.json.bak.* | head -1

# 2. 恢复
cp ~/.openclaw/openclaw.json.bak.[timestamp] ~/.openclaw/openclaw.json

# 3. 重启网关
openclaw gateway restart
```

---

*此文档用于外部审计场景。内部 Agent 日常使用请参考 AGENT_PROMPT.md*

*Created by Galatea 🜁*
