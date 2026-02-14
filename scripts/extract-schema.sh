#!/bin/bash
# extract-schema.sh - Extract latest schema from OpenClaw GitHub
# Phase 1: Automatic Schema Sync Mechanism

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_RAW="https://raw.githubusercontent.com/openclaw/openclaw/main"
SCHEMA_DIR="$SCRIPT_DIR/../reference/schemas"
BACKUP_DIR="$SCHEMA_DIR/.backups"
CHANGES_LOG="$SCRIPT_DIR/../schema-changes.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create directories
mkdir -p "$SCHEMA_DIR" "$BACKUP_DIR"

log "Starting schema extraction..."

# Files to download
FILES=(
    "src/config/zod-schema.ts"
    "src/config/types.memory.ts"
    "src/config/schema.ts"
    "src/config/types.ts"
)

CHANGES_DETECTED=false

for file in "${FILES[@]}"; do
    filename=$(basename "$file")
    temp_file="$SCHEMA_DIR/$filename.new"
    target_file="$SCHEMA_DIR/$filename"
    
    log "Downloading $filename..."
    
    if curl -sL "$REPO_RAW/$file" -o "$temp_file"; then
        if [ -f "$target_file" ]; then
            if diff -q "$target_file" "$temp_file" > /dev/null 2>&1; then
                log "✓ $filename unchanged"
                rm "$temp_file"
            else
                warn "✗ $filename changed - backing up and updating"
                cp "$target_file" "$BACKUP_DIR/$filename.$(date +%Y%m%d_%H%M%S)"
                mv "$temp_file" "$target_file"
                CHANGES_DETECTED=true
                echo "$(date '+%Y-%m-%d %H:%M:%S') - CHANGED: $filename" >> "$CHANGES_LOG"
            fi
        else
            log "+ $filename downloaded (new)"
            mv "$temp_file" "$target_file"
            CHANGES_DETECTED=true
            echo "$(date '+%Y-%m-%d %H:%M:%S') - NEW: $filename" >> "$CHANGES_LOG"
        fi
    else
        error "Failed to download $file"
        rm -f "$temp_file"
    fi
done

if [ "$CHANGES_DETECTED" = true ]; then
    log "================================"
    log "Schema changes detected!"
    log "Changes logged to: $CHANGES_LOG"
    log "Next step: Run parse-schema.js to update JSON schema"
    log "================================"
    exit 2  # Special exit code for "changes detected"
else
    log "All schema files up to date"
fi

exit 0
