#!/usr/bin/env node
/**
 * diff-schema.js - Compare schema versions and report changes
 * Phase 2: Change Detection & Notification
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_DIR = path.join(__dirname, '../reference/schemas');
const CHANGES_FILE = path.join(__dirname, '../schema-changes.json');
const REPORT_FILE = path.join(__dirname, '../schema-change-report.md');

function loadSchema(file) {
    const filePath = path.join(SCHEMA_DIR, file);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function detectChanges(oldSchema, newSchema) {
    const changes = {
        added: [],
        removed: [],
        modified: [],
        timestamp: new Date().toISOString()
    };

    const oldProps = oldSchema.properties || {};
    const newProps = newSchema.properties || {};

    // Detect added fields
    for (const key of Object.keys(newProps)) {
        if (!oldProps[key]) {
            changes.added.push({
                field: key,
                type: newProps[key].type,
                description: newProps[key].description
            });
        } else if (JSON.stringify(oldProps[key]) !== JSON.stringify(newProps[key])) {
            changes.modified.push({
                field: key,
                oldType: oldProps[key].type,
                newType: newProps[key].type,
                oldDesc: oldProps[key].description,
                newDesc: newProps[key].description
            });
        }
    }

    // Detect removed fields
    for (const key of Object.keys(oldProps)) {
        if (!newProps[key]) {
            changes.removed.push({
                field: key,
                type: oldProps[key].type
            });
        }
    }

    return changes;
}

function generateReport(changes) {
    let report = `# Schema Change Report\n\n`;
    report += `**Generated:** ${changes.timestamp}\n\n`;

    if (changes.added.length > 0) {
        report += `## 🟢 Added Fields (${changes.added.length})\n\n`;
        for (const item of changes.added) {
            report += `- **${item.field}** (${item.type})\n`;
            if (item.description) report += `  - ${item.description}\n`;
        }
        report += '\n';
    }

    if (changes.modified.length > 0) {
        report += `## 🟡 Modified Fields (${changes.modified.length})\n\n`;
        for (const item of changes.modified) {
            report += `- **${item.field}**\n`;
            report += `  - Type: ${item.oldType} → ${item.newType}\n`;
        }
        report += '\n';
    }

    if (changes.removed.length > 0) {
        report += `## 🔴 Removed Fields (${changes.removed.length})\n\n**BREAKING CHANGES** - These may break existing configurations!\n\n`;
        for (const item of changes.removed) {
            report += `- **${item.field}** (${item.type})\n`;
        }
        report += '\n';
    }

    if (changes.added.length === 0 && 
        changes.modified.length === 0 && 
        changes.removed.length === 0) {
        report += `*No changes detected.*\n`;
    }

    return report;
}

function main() {
    console.log('[diff-schema] Checking for schema changes...\n');

    const currentFile = path.join(SCHEMA_DIR, 'schema.json');
    const previousFile = path.join(SCHEMA_DIR, '.previous', 'schema.json');

    if (!fs.existsSync(currentFile)) {
        console.error('[diff-schema] Error: Current schema not found');
        process.exit(1);
    }

    const current = loadSchema('schema.json');
    
    if (!fs.existsSync(previousFile)) {
        console.log('[diff-schema] No previous schema found - creating baseline');
        fs.mkdirSync(path.dirname(previousFile), { recursive: true });
        fs.writeFileSync(previousFile, JSON.stringify(current, null, 2));
        fs.writeFileSync(CHANGES_FILE, JSON.stringify({
            firstRun: true,
            timestamp: new Date().toISOString()
        }, null, 2));
        return;
    }

    const previous = JSON.parse(fs.readFileSync(previousFile, 'utf-8'));
    const changes = detectChanges(previous, current);

    // Save changes
    fs.writeFileSync(CHANGES_FILE, JSON.stringify(changes, null, 2));

    // Generate report
    const report = generateReport(changes);
    fs.writeFileSync(REPORT_FILE, report);

    // Update previous
    fs.writeFileSync(previousFile, JSON.stringify(current, null, 2));

    // Output summary
    console.log(`[diff-schema] Changes detected:`);
    console.log(`  Added: ${changes.added.length}`);
    console.log(`  Modified: ${changes.modified.length}`);
    console.log(`  Removed: ${changes.removed.length}`);
    console.log(`\n[diff-schema] Report saved: ${REPORT_FILE}`);

    // Exit with special code if breaking changes
    if (changes.removed.length > 0) {
        process.exit(2);
    }
}

main();
