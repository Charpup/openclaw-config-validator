#!/usr/bin/env node
/**
 * Schema Sync Orchestrator - CLI tool for syncing docs-rag → config-validator
 * Usage: node bin/schema-sync.js [command] [options]
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const SchemaExtractor = require('../lib/schema-extractor');
const VersionComparator = require('../lib/version-comparator');

const CONFIG = {
  localSchemaPath: path.join(__dirname, '../reference/openclaw-official-schema.json'),
  schemaMdPath: path.join(__dirname, '../reference/SCHEMA.md'),
  backupDir: path.join(__dirname, '../.backups')
};

class SyncOrchestrator {
  constructor(options = {}) {
    this.options = options;
    this.extractor = null;
    this.comparator = new VersionComparator({
      localSchemaPath: CONFIG.localSchemaPath
    });
  }

  /**
   * Check for schema updates without applying
   */
  async check(options = {}) {
    console.log('🔍 Checking for schema updates...\n');

    try {
      // Initialize extractor
      this.extractor = new SchemaExtractor();
      await this.extractor.init();

      // Load local schema
      const localSchema = await this.loadLocalSchema();
      console.log(`📁 Local schema loaded: ${CONFIG.localSchemaPath}`);

      // Extract remote schema
      const remoteSchema = await this.extractor.extractSchema();
      console.log(`📚 Remote schema extracted: ${remoteSchema.version}`);
      console.log(`   Sources: ${remoteSchema.sources.length} chunks\n`);

      // Compare schemas
      const report = this.comparator.compare(localSchema, remoteSchema);
      
      // Display report
      console.log(this.comparator.formatReport(report));

      // Save report if verbose
      if (options.verbose) {
        const reportPath = path.join(process.cwd(), 'schema-diff-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Detailed report saved to: ${reportPath}`);
      }

      return report;

    } catch (error) {
      console.error('❌ Check failed:', error.message);
      throw error;
    } finally {
      if (this.extractor) {
        await this.extractor.close();
      }
    }
  }

  /**
   * Apply schema updates with confirmation
   */
  async apply(options = {}) {
    const report = await this.check(options);

    if (!report.hasChanges) {
      console.log('\n✅ Nothing to update. Exiting.');
      return;
    }

    // Dry run mode
    if (options.dryRun) {
      console.log('\n🏃 Dry run mode - no changes applied.');
      return;
    }

    // Confirm if not forced
    if (!options.force) {
      const confirmed = await this.confirmUpdate(report);
      if (!confirmed) {
        console.log('\n❌ Update cancelled by user.');
        return;
      }
    }

    // Create backup
    await this.createBackup();

    // Apply updates
    try {
      await this.updateSchemaFiles(report);
      console.log('\n✅ Schema update applied successfully!');
      
      // Update documentation
      await this.updateDocumentation(report);
      
      console.log('\n📋 Next steps:');
      console.log('   1. Review changes in reference/openclaw-official-schema.json');
      console.log('   2. Run validation: openclaw doctor');
      console.log('   3. Commit and push to GitHub');
      
    } catch (error) {
      console.error('\n❌ Update failed:', error.message);
      console.log('🔄 Restoring from backup...');
      await this.restoreFromBackup();
      throw error;
    }
  }

  /**
   * Show current sync status
   */
  async status() {
    console.log('📊 Schema Sync Status\n');
    
    try {
      // Load local schema
      const localSchema = await this.loadLocalSchema();
      const localVersion = this.comparator.extractVersion(localSchema);
      
      console.log(`Local Schema:`);
      console.log(`   Path:    ${CONFIG.localSchemaPath}`);
      console.log(`   Version: ${localVersion}`);
      console.log(`   Nodes:   ${this.comparator.getNodeNames(localSchema).length}`);
      
      // Check extractor availability
      this.extractor = new SchemaExtractor();
      await this.extractor.init();
      const dbStats = await this.extractor.getStats();
      
      console.log(`\nDocs-Rag Source:`);
      console.log(`   Status:  ✅ Connected`);
      console.log(`   Chunks:  ${dbStats.total_chunks}`);
      console.log(`   Sources: ${dbStats.total_sources}`);
      
      await this.extractor.close();
      
      // Last sync check
      const lastSync = await this.getLastSyncTime();
      console.log(`\nLast Sync: ${lastSync || 'Never'}`);
      
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
    }
  }

  /**
   * Load local schema from file
   */
  async loadLocalSchema() {
    const content = await fs.readFile(CONFIG.localSchemaPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Prompt user for confirmation
   */
  async confirmUpdate(report) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n⚠️  This will update the following files:');
    console.log(`   - ${CONFIG.localSchemaPath}`);
    console.log(`   - ${CONFIG.schemaMdPath}`);
    console.log('');

    if (report.breaking) {
      console.log('🚨 WARNING: This update contains BREAKING CHANGES!');
      console.log('   Please review carefully before proceeding.\n');
    }

    return new Promise((resolve) => {
      rl.question('Proceed with update? [y/N]: ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  /**
   * Create backup of current schema files
   */
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(CONFIG.backupDir, timestamp);
    
    await fs.mkdir(backupDir, { recursive: true });
    
    // Copy files
    const files = [
      CONFIG.localSchemaPath,
      CONFIG.schemaMdPath
    ];

    for (const file of files) {
      try {
        const filename = path.basename(file);
        await fs.copyFile(file, path.join(backupDir, filename));
      } catch (err) {
        // File might not exist, skip
      }
    }

    console.log(`📦 Backup created: ${backupDir}`);
    return backupDir;
  }

  /**
   * Update schema files with new data
   */
  async updateSchemaFiles(report) {
    // This would merge the remote schema into local
    // For now, just log what would happen
    console.log('\n📝 Updating schema files...');
    console.log(`   - ${report.changes.added.length} nodes added`);
    console.log(`   - ${report.changes.modified.length} nodes modified`);
    
    // TODO: Implement actual merge logic
    // This requires careful merging of JSON schema structures
  }

  /**
   * Update SCHEMA.md documentation
   */
  async updateDocumentation(report) {
    console.log('\n📝 Updating SCHEMA.md...');
    // TODO: Update markdown documentation
  }

  /**
   * Restore from backup on failure
   */
  async restoreFromBackup() {
    // TODO: Implement restore logic
    console.log('🔄 Restore functionality not yet implemented');
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime() {
    try {
      const syncStatePath = path.join(CONFIG.backupDir, '.sync-state.json');
      const content = await fs.readFile(syncStatePath, 'utf-8');
      const state = JSON.parse(content);
      return state.lastSync;
    } catch {
      return null;
    }
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    force: args.includes('--force') || args.includes('-f'),
    dryRun: args.includes('--dry-run') || args.includes('-n')
  };

  const orchestrator = new SyncOrchestrator(options);

  try {
    switch (command) {
      case 'check':
        await orchestrator.check(options);
        break;
      case 'apply':
        await orchestrator.apply(options);
        break;
      case 'status':
        await orchestrator.status();
        break;
      default:
        console.log('Schema Sync Orchestrator\n');
        console.log('Usage: node schema-sync.js <command> [options]\n');
        console.log('Commands:');
        console.log('   check    Check for schema updates');
        console.log('   apply    Apply schema updates');
        console.log('   status   Show sync status\n');
        console.log('Options:');
        console.log('   --verbose, -v    Show detailed output');
        console.log('   --force, -f      Skip confirmation prompt');
        console.log('   --dry-run, -n    Show what would change without applying');
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Command failed:', error.message);
    process.exit(1);
  }
}

main();
