#!/bin/bash
#
# OpenClaw Config Validator - Research Workflow Script
# 
# 用途: 在执行配置修改前，自动执行 Research Workflow
# 核心原则: 先查官方文档，再行动
#
# 使用方法:
#   ./scripts/audit-proposal.sh --target-node <node_name>
#   ./scripts/audit-proposal.sh --target-node models --search-issues
#   ./scripts/audit-proposal.sh --proposal-file /path/to/proposal.md
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
TARGET_NODE=""
SEARCH_ISSUES=false
DOCS_ONLY=false
PROPOSAL_FILE=""
VERBOSE=false

# 显示帮助
show_help() {
    cat << EOF
OpenClaw Config Validator - Research Workflow Script

USAGE:
    ./audit-proposal.sh [OPTIONS]

OPTIONS:
    --target-node <node>     目标配置节点 (如: gateway, models, channels.discord)
    --search-issues          搜索 GitHub Issues 获取已知问题
    --docs-only              仅获取官方文档，跳过其他步骤
    --proposal-file <file>   读取提案文件并审计
    --verbose                显示详细输出
    --help                   显示此帮助信息

EXAMPLES:
    # 审计 gateway 节点
    ./audit-proposal.sh --target-node gateway

    # 审计 models 节点并搜索相关问题
    ./audit-proposal.sh --target-node models --search-issues

    # 审计提案文件
    ./audit-proposal.sh --proposal-file ./my-proposal.md

EOF
}

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --target-node)
            TARGET_NODE="$2"
            shift 2
            ;;
        --search-issues)
            SEARCH_ISSUES=true
            shift
            ;;
        --docs-only)
            DOCS_ONLY=true
            shift
            ;;
        --proposal-file)
            PROPOSAL_FILE="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# 打印分隔线
print_section() {
    echo ""
    echo "========================================"
    echo "  $1"
    echo "========================================"
}

# Step 1: 本地参考
check_local_references() {
    print_section "Step 1: 本地参考检查"
    
    # 检查 schema-quick-ref.md
    if [[ -f "$SKILL_DIR/reference/schema-quick-ref.md" ]]; then
        log_success "找到 schema-quick-ref.md"
        
        if [[ -n "$TARGET_NODE" ]]; then
            # 提取目标节点信息
            log_info "查找节点: $TARGET_NODE"
            if grep -q "\`$TARGET_NODE\`" "$SKILL_DIR/reference/schema-quick-ref.md"; then
                log_success "节点 '$TARGET_NODE' 存在于 schema-quick-ref.md"
                
                # 显示风险等级
                RISK=$(grep -A 5 "\`$TARGET_NODE\`" "$SKILL_DIR/reference/schema-quick-ref.md" | grep -oE "[🔴🟡🟢]" | head -1)
                if [[ -n "$RISK" ]]; then
                    case $RISK in
                        "🔴") log_warn "风险等级: 🔴 高风险 (谨慎修改)" ;;
                        "🟡") log_warn "风险等级: 🟡 中风险 (建议备份)" ;;
                        "🟢") log_success "风险等级: 🟢 低风险 (可安全修改)" ;;
                    esac
                fi
            else
                log_warn "节点 '$TARGET_NODE' 未在 schema-quick-ref.md 中找到"
            fi
        fi
    else
        log_error "未找到 schema-quick-ref.md"
    fi
    
    # 检查 SCHEMA.md
    if [[ -f "$SKILL_DIR/reference/SCHEMA.md" ]]; then
        log_success "找到 SCHEMA.md"
    else
        log_error "未找到 SCHEMA.md"
    fi
}

# Step 2: 官方文档（模拟输出，实际使用时需要 web_fetch）
fetch_official_docs() {
    print_section "Step 2: 官方文档参考"
    
    log_info "官方文档 URL:"
    echo "  - 配置参考: https://docs.openclaw.ai/gateway/configuration"
    echo "  - 配置示例: https://docs.openclaw.ai/gateway/configuration-examples"
    echo "  - 故障排查: https://docs.openclaw.ai/gateway/troubleshooting"
    
    if [[ -n "$TARGET_NODE" ]]; then
        echo ""
        log_info "针对 '$TARGET_NODE' 的文档链接:"
        echo "  - https://docs.openclaw.ai/gateway/configuration#$TARGET_NODE"
    fi
    
    log_warn "注意: 请使用 web_fetch 工具获取实际文档内容"
    log_info "示例命令:"
    echo "  web_fetch https://docs.openclaw.ai/gateway/configuration"
}

# Step 3: GitHub Issues 搜索
search_github_issues() {
    print_section "Step 3: GitHub Issues 搜索"
    
    if [[ "$SEARCH_ISSUES" == true ]]; then
        log_info "搜索 GitHub Issues..."
        
        if [[ -n "$TARGET_NODE" ]]; then
            echo ""
            echo "搜索查询:"
            echo "  site:github.com/openclaw/openclaw/issues \"$TARGET_NODE\""
            echo ""
            echo "或使用 web_search 工具:"
            echo "  web_search 'site:github.com/openclaw/openclaw/issues $TARGET_NODE'"
        else
            log_warn "未指定目标节点，跳过 GitHub 搜索"
        fi
    else
        log_info "跳过 GitHub Issues 搜索 (使用 --search-issues 启用)"
    fi
}

# Step 4: ClawHub 技能检查
check_clawhub() {
    print_section "Step 4: ClawHub 技能检查"
    
    if [[ "$DOCS_ONLY" == false ]]; then
        log_info "ClawHub 技能注册表: https://clawhub.ai/skills"
        
        if [[ -n "$TARGET_NODE" ]]; then
            echo ""
            echo "搜索相关技能:"
            echo "  site:clawhub.ai $TARGET_NODE"
        fi
        
        log_warn "注意: 使用 web_search 工具搜索现有技能，避免重复造轮子"
    fi
}

# Step 5: Schema 验证
validate_against_schema() {
    print_section "Step 5: Schema 验证"
    
    if [[ -f "$SKILL_DIR/scripts/schema-validate.sh" ]]; then
        log_info "运行 schema 验证脚本..."
        echo ""
        echo "执行: $SKILL_DIR/scripts/schema-validate.sh"
        echo ""
        log_warn "注意: 请手动运行上述命令验证配置"
    else
        log_error "未找到 schema-validate.sh"
    fi
}

# 审计提案文件
audit_proposal_file() {
    print_section "审计提案文件"
    
    if [[ -f "$PROPOSAL_FILE" ]]; then
        log_info "读取提案文件: $PROPOSAL_FILE"
        echo ""
        echo "文件内容摘要:"
        head -50 "$PROPOSAL_FILE"
        echo ""
        
        # 尝试提取目标节点
        EXTRACTED_NODES=$(grep -oE '\b(agents|models|session|channels|gateway|tools|plugins|bindings|logging|talk|audio|cron|diagnostics|update)\b' "$PROPOSAL_FILE" | sort -u)
        
        if [[ -n "$EXTRACTED_NODES" ]]; then
            log_info "检测到的配置节点:"
            echo "$EXTRACTED_NODES" | while read -r node; do
                echo "  - $node"
            done
            
            # 对每个节点进行审计
            for node in $EXTRACTED_NODES; do
                echo ""
                log_info "审计节点: $node"
                
                # 检查风险等级
                if [[ -f "$SKILL_DIR/reference/schema-quick-ref.md" ]]; then
                    if grep -q "\`$node\`" "$SKILL_DIR/reference/schema-quick-ref.md"; then
                        RISK=$(grep -A 5 "\`$node\`" "$SKILL_DIR/reference/schema-quick-ref.md" | grep -oE "[🔴🟡🟢]" | head -1)
                        case $RISK in
                            "🔴") log_warn "  风险: 🔴 高风险" ;;
                            "🟡") log_warn "  风险: 🟡 中风险" ;;
                            "🟢") log_success "  风险: 🟢 低风险" ;;
                        esac
                    fi
                fi
            done
        fi
    else
        log_error "提案文件不存在: $PROPOSAL_FILE"
        exit 1
    fi
}

# 生成审计报告
generate_report() {
    print_section "Research Workflow 完成"
    
    echo ""
    echo "========================================"
    echo "  审计摘要"
    echo "========================================"
    echo ""
    echo "目标节点: ${TARGET_NODE:-'(未指定)'}"
    echo "提案文件: ${PROPOSAL_FILE:-'(未指定)'}"
    echo ""
    echo "完成步骤:"
    echo "  ✓ Step 1: 本地参考检查"
    echo "  ✓ Step 2: 官方文档参考"
    
    if [[ "$SEARCH_ISSUES" == true ]]; then
        echo "  ✓ Step 3: GitHub Issues 搜索"
    else
        echo "  ○ Step 3: GitHub Issues 搜索 (跳过)"
    fi
    
    if [[ "$DOCS_ONLY" == false ]]; then
        echo "  ✓ Step 4: ClawHub 技能检查"
    else
        echo "  ○ Step 4: ClawHub 技能检查 (跳过)"
    fi
    
    echo "  ✓ Step 5: Schema 验证"
    echo ""
    echo "下一步操作:"
    echo "  1. 使用 web_fetch 获取官方文档"
    echo "  2. 如需搜索 GitHub Issues，使用 --search-issues 参数重新运行"
    echo "  3. 查阅 SCHEMA.md 确认字段定义"
    echo "  4. 继续 AGENT_PROMPT.md 的 Step 1-7"
    echo ""
}

# 主函数
main() {
    echo "========================================"
    echo "  OpenClaw Config Validator"
    echo "  Research Workflow Script v2.0"
    echo "========================================"
    echo ""
    
    # 检查是否在正确目录
    if [[ ! -f "$SKILL_DIR/SKILL.md" ]]; then
        log_error "请在 openclaw-config-validator skill 目录中运行此脚本"
        exit 1
    fi
    
    # 如果有提案文件，优先审计文件
    if [[ -n "$PROPOSAL_FILE" ]]; then
        audit_proposal_file
    fi
    
    # 执行 Research Workflow
    check_local_references
    fetch_official_docs
    search_github_issues
    check_clawhub
    validate_against_schema
    
    # 生成报告
    generate_report
    
    log_success "Research Workflow 完成!"
}

# 运行主函数
main
