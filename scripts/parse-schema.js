#!/usr/bin/env node
/**
 * parse-schema.js - Parse TypeScript schema to JSON
 * Phase 1: Convert OpenClaw TypeScript definitions to JSON Schema
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_DIR = path.join(__dirname, '../reference/schemas');
const OUTPUT_FILE = path.join(__dirname, '../reference/openclaw-schema.json');

// Simple TypeScript to JSON Schema converter
function parseTypeScriptToJSON(tsContent) {
    const schema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        title: "OpenClaw Configuration",
        type: "object",
        properties: {},
        required: [],
        description: "Auto-generated from OpenClaw source",
        generatedAt: new Date().toISOString()
    };

    // Extract interface definitions
    const interfaceRegex = /interface\s+(\w+)\s*\{([^}]+)\}/gs;
    
    let match;
    
    // Parse interfaces
    while ((match = interfaceRegex.exec(tsContent)) !== null) {
        const name = match[1];
        const body = match[2];
        
        schema.properties[name] = {
            type: "object",
            properties: parseInterfaceBody(body),
            description: `Extracted from ${name}`
        };
    }

    return schema;
}

function parseInterfaceBody(body) {
    const properties = {};
    const lines = body.split('\n');
    
    for (const line of lines) {
        // Match property definitions: name: type;
        const propMatch = line.match(/(\w+)\??\s*:\s*([^;]+)/);
        if (propMatch) {
            const name = propMatch[1];
            const type = propMatch[2].trim();
            
            properties[name] = tsTypeToJSONSchema(type);
        }
    }
    
    return properties;
}

function tsTypeToJSONSchema(tsType) {
    // Basic type mappings
    const typeMap = {
        'string': { type: 'string' },
        'number': { type: 'number' },
        'boolean': { type: 'boolean' },
        'any': {},
        'unknown': {}
    };

    // Check for arrays
    if (tsType.endsWith('[]')) {
        const itemType = tsType.slice(0, -2);
        return {
            type: 'array',
            items: tsTypeToJSONSchema(itemType)
        };
    }

    // Check for unions (simplified)
    if (tsType.includes('|')) {
        return {
            oneOf: tsType.split('|').map(t => tsTypeToJSONSchema(t.trim()))
        };
    }

    // Check for optional
    if (tsType.endsWith('?')) {
        return tsTypeToJSONSchema(tsType.slice(0, -1));
    }

    // Return mapped type or reference
    return typeMap[tsType] || { $ref: `#/definitions/${tsType}` };
}

// Main execution
function main() {
    console.log('[parse-schema] Starting schema parsing...\n');

    const files = [
        'zod-schema.ts',
        'types.memory.ts',
        'schema.ts'
    ];

    let combinedContent = '';
    let foundFiles = 0;

    for (const file of files) {
        const filePath = path.join(SCHEMA_DIR, file);
        if (fs.existsSync(filePath)) {
            console.log(`[parse-schema] Reading ${file}...`);
            combinedContent += fs.readFileSync(filePath, 'utf-8') + '\n\n';
            foundFiles++;
        } else {
            console.warn(`[parse-schema] Warning: ${file} not found`);
        }
    }

    if (foundFiles === 0) {
        console.error('[parse-schema] Error: No schema files found!');
        console.error('[parse-schema] Run extract-schema.sh first');
        process.exit(1);
    }

    console.log(`[parse-schema] Parsed ${foundFiles} files\n`);

    const jsonSchema = parseTypeScriptToJSON(combinedContent);
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    
    // Write output
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(jsonSchema, null, 2));
    
    console.log(`[parse-schema] ✓ Generated: ${OUTPUT_FILE}`);
    console.log(`[parse-schema] Generated at: ${jsonSchema.generatedAt}`);
}

main();
