/**
 * Schema Extractor - Extracts schema information from docs-rag database
 * Part of the docs-rag ↔ config-validator sync mechanism
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class SchemaExtractor {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.PGHOST || 'localhost',
      port: config.port || process.env.PGPORT || 5432,
      database: config.database || process.env.PGDATABASE || 'memu_db',
      user: config.user || process.env.PGUSER || 'memu',
      password: config.password || process.env.MEMU_DB_PASSWORD || 'memu_secure_password',
      tableName: config.tableName || 'openclaw_docs_chunks',
      ...config
    };
    this.pool = null;
  }

  /**
   * Initialize database connection
   */
  async init() {
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password
    });

    // Test connection
    const client = await this.pool.connect();
    try {
      await client.query('SELECT NOW()');
      console.log('✅ Database connection established');
    } finally {
      client.release();
    }
  }

  /**
   * Query docs-rag for configuration-related documentation
   */
  async queryConfigDocs() {
    const query = `
      SELECT id, text, source, title, heading, metadata
      FROM ${this.config.tableName}
      WHERE (
        text ILIKE '%configuration%' 
        OR text ILIKE '%schema%'
        OR text ILIKE '%gateway%'
        OR text ILIKE '%agents%'
        OR source LIKE '%/gateway/configuration%'
        OR source LIKE '%/concepts/%'
      )
      AND source LIKE '%docs.openclaw.ai%'
      ORDER BY 
        CASE 
          WHEN source LIKE '%/gateway/configuration%' THEN 1
          WHEN source LIKE '%/concepts/%' THEN 2
          ELSE 3
        END,
        created_at DESC
      LIMIT 100
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Extract schema structure from documentation chunks
   */
  async extractSchema() {
    const docs = await this.queryConfigDocs();
    console.log(`📚 Found ${docs.length} relevant documentation chunks`);

    const schema = {
      version: await this.extractVersion(),
      timestamp: new Date().toISOString(),
      nodes: {},
      enums: {},
      sources: []
    };

    // Process each documentation chunk
    for (const doc of docs) {
      schema.sources.push({
        id: doc.id,
        source: doc.source,
        title: doc.title,
        heading: doc.heading
      });

      // Extract node definitions
      const nodeMatches = this.extractNodeDefinitions(doc.text);
      Object.assign(schema.nodes, nodeMatches);

      // Extract enum values
      const enumMatches = this.extractEnumValues(doc.text);
      Object.assign(schema.enums, enumMatches);
    }

    return schema;
  }

  /**
   * Extract node definitions from text
   */
  extractNodeDefinitions(text) {
    const nodes = {};
    
    // Pattern: "nodeName": { ... }
    const nodePattern = /"(\w+)":\s*\{[\s\S]*?\}(?=,|\s*\})/g;
    let match;
    
    while ((match = nodePattern.exec(text)) !== null) {
      const nodeName = match[1];
      if (this.isValidNodeName(nodeName)) {
        nodes[nodeName] = this.parseNodeStructure(match[0]);
      }
    }

    return nodes;
  }

  /**
   * Extract enum values from text
   */
  extractEnumValues(text) {
    const enums = {};
    
    // Pattern: "field": "value1" | "value2" | "value3"
    const enumPattern = /"(\w+)":\s*(?:"(\w+)"\s*\|\s*)+(?:"(\w+)")/g;
    let match;
    
    while ((match = enumPattern.exec(text)) !== null) {
      const fieldName = match[1];
      const values = match[0]
        .match(/"(\w+)"/g)
        .map(v => v.replace(/"/g, ''));
      
      enums[fieldName] = values;
    }

    // Pattern: enum: ["value1", "value2"]
    const arrayEnumPattern = /"(\w+)":\s*\[("[^"]+",?\s*)+\]/g;
    while ((match = arrayEnumPattern.exec(text)) !== null) {
      const fieldName = match[1];
      const values = JSON.parse(match[0].split(':')[1].trim());
      enums[fieldName] = values;
    }

    return enums;
  }

  /**
   * Extract version information from docs
   */
  async extractVersion() {
    const query = `
      SELECT text
      FROM ${this.config.tableName}
      WHERE text ILIKE '%version%' 
        AND text ILIKE '%2026%'
        AND source LIKE '%docs.openclaw.ai%'
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    const result = await this.pool.query(query);
    
    // Look for version pattern like "2026.2.1"
    for (const row of result.rows) {
      const versionMatch = row.text.match(/(\d{4}\.\d+\.\d+)/);
      if (versionMatch) {
        return versionMatch[1];
      }
    }
    
    return 'unknown';
  }

  /**
   * Check if node name is valid (matches known OpenClaw config nodes)
   */
  isValidNodeName(name) {
    const validNodes = [
      'agents', 'audio', 'auth', 'bindings', 'browser', 'channels',
      'commands', 'cron', 'diagnostics', 'gateway', 'hooks', 'logging',
      'messages', 'meta', 'models', 'plugins', 'session', 'skills',
      'talk', 'tools', 'update', 'web'
    ];
    return validNodes.includes(name);
  }

  /**
   * Parse node structure from text snippet
   */
  parseNodeStructure(text) {
    // Simplified parsing - in production would use proper JSON parser
    const structure = {
      type: 'object',
      properties: {},
      raw: text.substring(0, 500) // First 500 chars for reference
    };

    // Extract property names
    const propPattern = /"(\w+)":\s*\{/g;
    let match;
    while ((match = propPattern.exec(text)) !== null) {
      structure.properties[match[1]] = { type: 'object' };
    }

    return structure;
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_chunks,
        COUNT(DISTINCT source) as total_sources
      FROM ${this.config.tableName}
    `;
    
    const result = await this.pool.query(query);
    return result.rows[0];
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('✅ Database connection closed');
    }
  }
}

// CLI usage
if (require.main === module) {
  const extractor = new SchemaExtractor();
  
  (async () => {
    try {
      await extractor.init();
      
      const stats = await extractor.getStats();
      console.log(`📊 Database stats: ${stats.total_chunks} chunks, ${stats.total_sources} sources`);
      
      const schema = await extractor.extractSchema();
      
      // Save to file
      const outputPath = path.join(process.cwd(), 'extracted-schema.json');
      await fs.writeFile(outputPath, JSON.stringify(schema, null, 2));
      console.log(`✅ Schema extracted to ${outputPath}`);
      console.log(`   Version: ${schema.version}`);
      console.log(`   Nodes: ${Object.keys(schema.nodes).length}`);
      console.log(`   Enums: ${Object.keys(schema.enums).length}`);
      
    } catch (error) {
      console.error('❌ Extraction failed:', error.message);
      process.exit(1);
    } finally {
      await extractor.close();
    }
  })();
}

module.exports = SchemaExtractor;
