/**
 * Schema Extractor v2.0 - Extracts schema information from docs-rag v4.0
 * 
 * Updated for docs-rag v4.0 real-time llms.txt-based retrieval.
 * Replaces PostgreSQL-based extraction with lightweight DocsRAG API.
 * 
 * Part of the docs-rag ↔ config-validator sync mechanism
 */

const fs = require('fs').promises;
const path = require('path');

// Try to import docs-rag v4.0, fallback to legacy mode if unavailable
let DocsRAG = null;
try {
  const docsRagModule = require('../../docs-rag/src/index');
  DocsRAG = docsRagModule.DocsRAG;
} catch (error) {
  console.log('[schema-extractor] DocsRAG v4.0 not available, will use fallback mode');
}

class SchemaExtractor {
  constructor(config = {}) {
    this.config = {
      // Legacy PostgreSQL config (for backward compatibility)
      host: config.host || process.env.PGHOST || '127.0.0.1',
      port: config.port || process.env.PGPORT || 5432,
      database: config.database || process.env.PGDATABASE || 'memu_db',
      user: config.user || process.env.PGUSER || 'memu',
      password: config.password || process.env.PGPASSWORD || process.env.MEMU_DB_PASSWORD || 'memu_secure_password',
      tableName: config.tableName || 'openclaw_docs_chunks',
      // New v4.0 config
      useLegacyMode: config.useLegacyMode || !DocsRAG,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };
    
    this.docsRAG = null;
    this.pool = null; // Legacy mode only
  }

  /**
   * Initialize extractor
   */
  async init() {
    if (!this.config.useLegacyMode && DocsRAG) {
      // Initialize docs-rag v4.0
      this.docsRAG = new DocsRAG();
      await this.docsRAG.init();
      console.log('✅ DocsRAG v4.0 initialized');
    } else {
      // Fallback to legacy PostgreSQL mode
      console.log('⚠️  Using legacy PostgreSQL mode');
      await this.initLegacy();
    }
  }

  /**
   * Initialize legacy PostgreSQL connection
   */
  async initLegacy() {
    const { Pool } = require('pg');
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
      console.log('✅ Legacy database connection established');
    } finally {
      client.release();
    }
  }

  /**
   * Query docs-rag for configuration-related documentation
   * Uses docs-rag v4.0 real-time query or legacy fallback
   */
  async queryConfigDocs() {
    if (!this.config.useLegacyMode && this.docsRAG) {
      return await this.queryConfigDocsV4();
    } else {
      return await this.queryConfigDocsLegacy();
    }
  }

  /**
   * Query using docs-rag v4.0 real-time retrieval
   */
  async queryConfigDocsV4() {
    const queries = [
      'OpenClaw configuration reference openclaw.json schema',
      'gateway configuration node settings',
      'agents models channels configuration',
      'cron jobs logging diagnostics configuration',
      'tools bindings hooks auth configuration'
    ];

    const allResults = [];
    const seenUrls = new Set();

    for (const query of queries) {
      try {
        const result = await this.retryOperation(
          () => this.docsRAG.query(query, { topK: 5 }),
          `Query: ${query}`
        );

        // Deduplicate by URL
        for (const item of result.results || []) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            allResults.push({
              id: item.url, // Use URL as ID
              source: item.url,
              title: item.title,
              category: item.category,
              content: item.content || '',
              score: item.score
            });
          }
        }
      } catch (error) {
        console.error(`[schema-extractor] Query failed: ${query}`, error.message);
        // Continue with other queries
      }
    }

    // Sort by relevance score
    allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    console.log(`📚 Found ${allResults.length} relevant documentation chunks via DocsRAG v4.0`);
    return allResults.slice(0, 50); // Limit to top 50
  }

  /**
   * Legacy PostgreSQL query method
   */
  async queryConfigDocsLegacy() {
    const query = `
      SELECT id, text, source, title, heading
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
    
    // Transform to common format
    return result.rows.map(row => ({
      id: row.id,
      source: row.source,
      title: row.title,
      category: row.heading || 'General',
      content: row.text,
      score: 1.0
    }));
  }

  /**
   * Extract schema structure from documentation
   */
  async extractSchema() {
    const docs = await this.queryConfigDocs();
    console.log(`📚 Processing ${docs.length} documentation chunks`);

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
        category: doc.category,
        score: doc.score
      });

      // Extract node definitions
      const nodeMatches = this.extractNodeDefinitions(doc.content);
      Object.assign(schema.nodes, nodeMatches);

      // Extract enum values
      const enumMatches = this.extractEnumValues(doc.content);
      Object.assign(schema.enums, enumMatches);
    }

    // Add known nodes from documentation analysis
    this.addKnownNodes(schema);

    return schema;
  }

  /**
   * Add known configuration nodes based on OpenClaw documentation
   */
  addKnownNodes(schema) {
    const knownNodes = {
      agents: {
        description: 'Agent configuration including models, workspace, and defaults',
        properties: ['defaults', 'models', 'model', 'workspace', 'heartbeat']
      },
      channels: {
        description: 'Channel configurations for WhatsApp, Telegram, Discord, etc.',
        properties: ['whatsapp', 'telegram', 'discord', 'slack', 'signal', 'imessage', 'defaults']
      },
      gateway: {
        description: 'Gateway server configuration',
        properties: ['host', 'port', 'tls', 'auth']
      },
      models: {
        description: 'Model provider configurations',
        properties: ['anthropic', 'openai', 'google', 'aliases']
      },
      tools: {
        description: 'Tool configurations including web search, browser, etc.',
        properties: ['web', 'browser', 'shell', 'code']
      },
      cron: {
        description: 'Scheduled task configuration',
        properties: ['jobs', 'enabled']
      },
      hooks: {
        description: 'Event hook configurations',
        properties: ['onMessage', 'onStart', 'onStop']
      },
      logging: {
        description: 'Logging configuration',
        properties: ['level', 'output', 'format']
      },
      diagnostics: {
        description: 'Diagnostic and health check settings',
        properties: ['enabled', 'interval']
      },
      bindings: {
        description: 'Key bindings and shortcuts',
        properties: []
      },
      browser: {
        description: 'Browser automation settings',
        properties: ['headless', 'timeout']
      },
      commands: {
        description: 'Custom command definitions',
        properties: []
      },
      messages: {
        description: 'Message handling configuration',
        properties: []
      },
      session: {
        description: 'Session management settings',
        properties: ['timeout', 'persist']
      },
      skills: {
        description: 'Skill loading and configuration',
        properties: ['directories', 'autoLoad']
      },
      talk: {
        description: 'Voice/TTS configuration',
        properties: ['enabled', 'voice', 'provider']
      },
      audio: {
        description: 'Audio input/output settings',
        properties: ['input', 'output', 'device']
      },
      auth: {
        description: 'Authentication settings',
        properties: ['methods', 'providers']
      },
      update: {
        description: 'Auto-update configuration',
        properties: ['enabled', 'channel']
      },
      env: {
        description: 'Environment variable mappings',
        properties: []
      },
      ui: {
        description: 'UI/Control panel settings',
        properties: ['enabled', 'port']
      },
      web: {
        description: 'Web server settings',
        properties: ['enabled', 'port', 'cors']
      },
      wizard: {
        description: 'Setup wizard configuration',
        properties: ['enabled']
      }
    };

    for (const [nodeName, nodeInfo] of Object.entries(knownNodes)) {
      if (!schema.nodes[nodeName]) {
        schema.nodes[nodeName] = {
          type: 'object',
          description: nodeInfo.description,
          properties: nodeInfo.properties.reduce((acc, prop) => {
            acc[prop] = { type: 'unknown' };
            return acc;
          }, {})
        };
      }
    }
  }

  /**
   * Extract version information from docs
   */
  async extractVersion() {
    if (!this.config.useLegacyMode && this.docsRAG) {
      return await this.extractVersionV4();
    } else {
      return await this.extractVersionLegacy();
    }
  }

  /**
   * Extract version using docs-rag v4.0
   */
  async extractVersionV4() {
    try {
      const result = await this.retryOperation(
        () => this.docsRAG.query('OpenClaw version 2026 release changelog', { topK: 3 }),
        'Version extraction'
      );

      // Look for version pattern in results
      for (const item of result.results || []) {
        const content = item.content || '';
        
        // Look for version pattern like "2026.2.1" or "v2026.2.1"
        const versionMatch = content.match(/v?(\d{4}\.\d+\.\d+)/);
        if (versionMatch) {
          return versionMatch[1];
        }
        
        // Alternative: look for "Version X.Y.Z" format
        const altMatch = content.match(/version[:\s]+v?(\d{4}[\.\d]+)/i);
        if (altMatch) {
          return altMatch[1];
        }
      }
    } catch (error) {
      console.error('[schema-extractor] Version extraction failed:', error.message);
    }
    
    return 'unknown';
  }

  /**
   * Legacy version extraction from PostgreSQL
   */
  async extractVersionLegacy() {
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
   * Extract node definitions from text
   */
  extractNodeDefinitions(text) {
    const nodes = {};
    
    // Pattern: "nodeName": { ... } or nodeName: { ... } (JSON5)
    const nodePattern = /["']?(\w+)["']?\s*:\s*\{/g;
    let match;
    
    while ((match = nodePattern.exec(text)) !== null) {
      const nodeName = match[1];
      if (this.isValidNodeName(nodeName)) {
        // Extract the content within braces (simplified)
        const startIdx = match.index + match[0].length - 1;
        let braceCount = 1;
        let endIdx = startIdx + 1;
        
        while (braceCount > 0 && endIdx < text.length) {
          if (text[endIdx] === '{') braceCount++;
          if (text[endIdx] === '}') braceCount--;
          endIdx++;
        }
        
        const nodeContent = text.substring(startIdx, endIdx);
        nodes[nodeName] = this.parseNodeStructure(nodeContent);
      }
    }

    return nodes;
  }

  /**
   * Extract enum values from text
   */
  extractEnumValues(text) {
    const enums = {};
    
    // Pattern for | separated values: "field": "value1" | "value2" | "value3"
    const enumPattern = /["']?(\w+)["']?\s*:\s*["']?([^|\n]+)(?:\s*\|\s*["']?([^|\n]+))+/g;
    let match;
    
    while ((match = enumPattern.exec(text)) !== null) {
      const fieldName = match[1];
      // Extract all quoted values from the match
      const values = [];
      const valuePattern = /["']([^"']+)["']/g;
      let valueMatch;
      
      while ((valueMatch = valuePattern.exec(match[0])) !== null) {
        values.push(valueMatch[1]);
      }
      
      if (values.length > 0) {
        enums[fieldName] = [...new Set(values)]; // Deduplicate
      }
    }

    // Pattern: enum: ["value1", "value2"] or ["value1", "value2"]
    const arrayEnumPattern = /["']?(\w+)["']?\s*:\s*\[\s*["']([^\]]+)["']\s*\]/g;
    while ((match = arrayEnumPattern.exec(text)) !== null) {
      const fieldName = match[1];
      try {
        // Try to parse as JSON array
        const arrayContent = match[2];
        const values = arrayContent.split(',').map(v => v.trim().replace(/["']/g, ''));
        if (values.length > 0 && !enums[fieldName]) {
          enums[fieldName] = values;
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }

    return enums;
  }

  /**
   * Check if node name is valid (matches known OpenClaw config nodes)
   */
  isValidNodeName(name) {
    const validNodes = [
      'agents', 'audio', 'auth', 'bindings', 'browser', 'channels',
      'commands', 'cron', 'diagnostics', 'env', 'gateway', 'hooks', 
      'logging', 'messages', 'meta', 'models', 'plugins', 'session', 
      'skills', 'talk', 'tools', 'ui', 'update', 'web', 'wizard'
    ];
    return validNodes.includes(name);
  }

  /**
   * Parse node structure from text snippet
   */
  parseNodeStructure(text) {
    const structure = {
      type: 'object',
      properties: {},
      raw: text.substring(0, 500) // First 500 chars for reference
    };

    // Extract property names (both "prop": and prop: patterns)
    const propPattern = /["']?(\w+)["']?\s*:/g;
    let match;
    while ((match = propPattern.exec(text)) !== null) {
      const propName = match[1];
      // Skip if it's a known node name (top-level)
      if (!this.isValidNodeName(propName)) {
        structure.properties[propName] = { type: 'unknown' };
      }
    }

    return structure;
  }

  /**
   * Get database/source statistics
   */
  async getStats() {
    if (!this.config.useLegacyMode && this.docsRAG) {
      return {
        mode: 'v4.0-realtime',
        ...this.docsRAG.getStatus()
      };
    } else {
      const query = `
        SELECT 
          COUNT(*) as total_chunks,
          COUNT(DISTINCT source) as total_sources
        FROM ${this.config.tableName}
      `;
      
      const result = await this.pool.query(query);
      return {
        mode: 'legacy-postgresql',
        ...result.rows[0]
      };
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryOperation(operation, context, maxRetries = null) {
    const retries = maxRetries || this.config.maxRetries;
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.log(`[schema-extractor] ${context} - Attempt ${attempt}/${retries} failed: ${error.message}`);
        
        if (attempt < retries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          console.log(`[schema-extractor] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close connections
   */
  async close() {
    if (this.docsRAG) {
      // DocsRAG v4.0 doesn't require explicit cleanup
      console.log('✅ DocsRAG v4.0 connection closed');
    }
    
    if (this.pool) {
      await this.pool.end();
      console.log('✅ Legacy database connection closed');
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
      console.log(`📊 Mode: ${stats.mode}`);
      if (stats.documentsLoaded) {
        console.log(`   Documents: ${stats.documentsLoaded}`);
      }
      if (stats.total_chunks) {
        console.log(`   Chunks: ${stats.total_chunks}, Sources: ${stats.total_sources}`);
      }
      
      const schema = await extractor.extractSchema();
      
      // Save to file
      const outputPath = path.join(process.cwd(), 'extracted-schema.json');
      await fs.writeFile(outputPath, JSON.stringify(schema, null, 2));
      console.log(`\n✅ Schema extracted to ${outputPath}`);
      console.log(`   Version: ${schema.version}`);
      console.log(`   Nodes: ${Object.keys(schema.nodes).length}`);
      console.log(`   Enums: ${Object.keys(schema.enums).length}`);
      console.log(`   Sources: ${schema.sources.length}`);
      
    } catch (error) {
      console.error('❌ Extraction failed:', error.message);
      process.exit(1);
    } finally {
      await extractor.close();
    }
  })();
}

module.exports = SchemaExtractor;
