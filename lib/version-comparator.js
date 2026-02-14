/**
 * Version Comparator - Compares local and remote schema versions
 * Part of the docs-rag ↔ config-validator sync mechanism
 */

const fs = require('fs').promises;
const path = require('path');

class VersionComparator {
  constructor(options = {}) {
    this.options = {
      localSchemaPath: options.localSchemaPath || './reference/openclaw-official-schema.json',
      ...options
    };
  }

  /**
   * Compare local and remote schemas
   * @param {object} localSchema - Current local schema
   * @param {object} remoteSchema - Schema extracted from docs-rag
   * @returns {DiffReport} Comparison result
   */
  compare(localSchema, remoteSchema) {
    const report = {
      hasChanges: false,
      version: {
        local: this.extractVersion(localSchema),
        remote: remoteSchema.version || 'unknown'
      },
      changes: {
        added: [],
        modified: [],
        removed: []
      },
      breaking: false,
      migrationEffort: 'low',
      details: {}
    };

    // Compare top-level nodes
    const localNodes = this.getNodeNames(localSchema);
    const remoteNodes = Object.keys(remoteSchema.nodes || {});

    // Find added nodes
    for (const node of remoteNodes) {
      if (!localNodes.includes(node)) {
        report.changes.added.push(`nodes.${node}`);
        report.hasChanges = true;
      }
    }

    // Find removed nodes
    for (const node of localNodes) {
      if (!remoteNodes.includes(node)) {
        report.changes.removed.push(`nodes.${node}`);
        report.hasChanges = true;
        report.breaking = true; // Removing a node is breaking
      }
    }

    // Compare common nodes for modifications
    const commonNodes = localNodes.filter(n => remoteNodes.includes(n));
    for (const node of commonNodes) {
      const nodeDiff = this.compareNode(
        localSchema.schema?.properties?.[node],
        remoteSchema.nodes?.[node]
      );
      
      if (nodeDiff.hasChanges) {
        report.changes.modified.push(`nodes.${node}`);
        report.hasChanges = true;
        report.details[node] = nodeDiff;

        // Check for breaking changes in node
        if (nodeDiff.breaking) {
          report.breaking = true;
        }
      }
    }

    // Compare enum values
    const enumDiff = this.compareEnums(
      this.extractEnums(localSchema),
      remoteSchema.enums || {}
    );
    
    if (enumDiff.hasChanges) {
      report.changes.added.push(...enumDiff.added.map(e => `enums.${e}`));
      report.changes.modified.push(...enumDiff.modified.map(e => `enums.${e}`));
      report.hasChanges = true;
      Object.assign(report.details, enumDiff.details);
    }

    // Calculate migration effort
    report.migrationEffort = this.calculateMigrationEffort(report);

    return report;
  }

  /**
   * Compare individual node definitions
   */
  compareNode(localNode, remoteNode) {
    const diff = {
      hasChanges: false,
      breaking: false,
      added: [],
      removed: [],
      modified: []
    };

    if (!localNode || !remoteNode) {
      diff.hasChanges = true;
      return diff;
    }

    // Compare properties
    const localProps = localNode.properties ? Object.keys(localNode.properties) : [];
    const remoteProps = remoteNode.properties ? Object.keys(remoteNode.properties) : [];

    // Check added properties
    for (const prop of remoteProps) {
      if (!localProps.includes(prop)) {
        diff.added.push(prop);
        diff.hasChanges = true;
      }
    }

    // Check removed properties (breaking)
    for (const prop of localProps) {
      if (!remoteProps.includes(prop)) {
        diff.removed.push(prop);
        diff.hasChanges = true;
        diff.breaking = true;
      }
    }

    // Check modified properties
    for (const prop of localProps) {
      if (remoteProps.includes(prop)) {
        const propDiff = this.compareProperty(
          localNode.properties[prop],
          remoteNode.properties?.[prop]
        );
        if (propDiff.hasChanges) {
          diff.modified.push(prop);
          diff.hasChanges = true;
          
          // Check if modification is breaking
          if (propDiff.breaking) {
            diff.breaking = true;
          }
        }
      }
    }

    return diff;
  }

  /**
   * Compare individual properties
   */
  compareProperty(localProp, remoteProp) {
    const diff = {
      hasChanges: false,
      breaking: false,
      changes: []
    };

    if (!localProp || !remoteProp) {
      diff.hasChanges = true;
      return diff;
    }

    // Compare type
    if (localProp.type !== remoteProp.type) {
      diff.changes.push('type');
      diff.hasChanges = true;
      diff.breaking = true; // Type change is breaking
    }

    // Compare enum values
    if (JSON.stringify(localProp.enum) !== JSON.stringify(remoteProp.enum)) {
      diff.changes.push('enum');
      diff.hasChanges = true;
    }

    // Compare default values
    if (JSON.stringify(localProp.default) !== JSON.stringify(remoteProp.default)) {
      diff.changes.push('default');
      diff.hasChanges = true;
    }

    // Compare required status
    if (localProp.required !== remoteProp.required) {
      diff.changes.push('required');
      diff.hasChanges = true;
      if (remoteProp.required && !localProp.required) {
        diff.breaking = true; // Making a field required is breaking
      }
    }

    return diff;
  }

  /**
   * Compare enum definitions
   */
  compareEnums(localEnums, remoteEnums) {
    const diff = {
      hasChanges: false,
      added: [],
      modified: [],
      removed: [],
      details: {}
    };

    const localKeys = Object.keys(localEnums);
    const remoteKeys = Object.keys(remoteEnums);

    // Added enums
    for (const key of remoteKeys) {
      if (!localKeys.includes(key)) {
        diff.added.push(key);
        diff.hasChanges = true;
      }
    }

    // Removed enums
    for (const key of localKeys) {
      if (!remoteKeys.includes(key)) {
        diff.removed.push(key);
        diff.hasChanges = true;
      }
    }

    // Modified enums
    for (const key of localKeys) {
      if (remoteKeys.includes(key)) {
        const localValues = localEnums[key];
        const remoteValues = remoteEnums[key];
        
        if (JSON.stringify(localValues) !== JSON.stringify(remoteValues)) {
          diff.modified.push(key);
          diff.hasChanges = true;
          diff.details[key] = {
            local: localValues,
            remote: remoteValues
          };
        }
      }
    }

    return diff;
  }

  /**
   * Calculate migration effort based on changes
   */
  calculateMigrationEffort(report) {
    const totalChanges = 
      report.changes.added.length + 
      report.changes.modified.length + 
      report.changes.removed.length;

    if (report.breaking) {
      return 'high';
    }
    if (totalChanges > 10) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Extract node names from schema
   */
  getNodeNames(schema) {
    if (schema.schema?.properties) {
      return Object.keys(schema.schema.properties);
    }
    if (schema.properties) {
      return Object.keys(schema.properties);
    }
    return [];
  }

  /**
   * Extract version from schema
   */
  extractVersion(schema) {
    // Try to find version in different locations
    if (schema.version) return schema.version;
    if (schema.meta?.lastTouchedVersion) return schema.meta.lastTouchedVersion;
    if (schema.$version) return schema.$version;
    return 'unknown';
  }

  /**
   * Extract enums from local schema
   */
  extractEnums(schema) {
    const enums = {};
    
    const traverse = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      if (obj.enum) {
        enums[path || 'root'] = obj.enum;
      }
      
      if (obj.properties) {
        for (const [key, value] of Object.entries(obj.properties)) {
          traverse(value, path ? `${path}.${key}` : key);
        }
      }
    };

    traverse(schema.schema || schema);
    return enums;
  }

  /**
   * Format diff report for display
   */
  formatReport(report) {
    const lines = [];
    
    lines.push('');
    lines.push('╔════════════════════════════════════════════════════════╗');
    lines.push('║           Schema Comparison Report                     ║');
    lines.push('╚════════════════════════════════════════════════════════╝');
    lines.push('');
    
    lines.push(`📊 Versions:`);
    lines.push(`   Local:  ${report.version.local}`);
    lines.push(`   Remote: ${report.version.remote}`);
    lines.push('');
    
    if (!report.hasChanges) {
      lines.push('✅ No changes detected. Schemas are in sync.');
      return lines.join('\n');
    }

    lines.push(`⚠️  Changes detected (Migration effort: ${report.migrationEffort.toUpperCase()})`);
    if (report.breaking) {
      lines.push('🚨 BREAKING CHANGES detected!');
    }
    lines.push('');

    if (report.changes.added.length > 0) {
      lines.push(`➕ Added (${report.changes.added.length}):`);
      for (const item of report.changes.added) {
        lines.push(`   + ${item}`);
      }
      lines.push('');
    }

    if (report.changes.modified.length > 0) {
      lines.push(`📝 Modified (${report.changes.modified.length}):`);
      for (const item of report.changes.modified) {
        lines.push(`   ~ ${item}`);
      }
      lines.push('');
    }

    if (report.changes.removed.length > 0) {
      lines.push(`➖ Removed (${report.changes.removed.length}):`);
      for (const item of report.changes.removed) {
        lines.push(`   - ${item}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

module.exports = VersionComparator;
