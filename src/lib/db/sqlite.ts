import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";
import type { DbAdapter, SanctionsEntryRow, SearchResult } from "./adapter";

const DB_PATH = path.join(process.cwd(), "data", "sanctionshield.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    // Ensure data directory exists
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

export class SqliteAdapter implements DbAdapter {
  async initialize(): Promise<void> {
    const db = getDb();

    db.exec(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL,
        settings TEXT NOT NULL DEFAULT '{"threshold": 80}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        org_id TEXT NOT NULL REFERENCES organizations(id),
        name TEXT NOT NULL,
        key_prefix TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        last_used_at TEXT,
        revoked_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sanctions_lists (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        source TEXT NOT NULL,
        version TEXT NOT NULL,
        downloaded_at TEXT NOT NULL DEFAULT (datetime('now')),
        entry_count INTEGER NOT NULL DEFAULT 0,
        raw_hash TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sanctions_entries (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        list_id TEXT NOT NULL REFERENCES sanctions_lists(id),
        source TEXT NOT NULL,
        external_id TEXT,
        entry_type TEXT NOT NULL,
        primary_name TEXT NOT NULL,
        primary_name_normalized TEXT NOT NULL,
        aliases TEXT NOT NULL DEFAULT '[]',
        programs TEXT NOT NULL DEFAULT '[]',
        addresses TEXT NOT NULL DEFAULT '[]',
        identification TEXT NOT NULL DEFAULT '[]',
        remarks TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_entries_name ON sanctions_entries(primary_name_normalized);
      CREATE INDEX IF NOT EXISTS idx_entries_source ON sanctions_entries(source) WHERE is_active = 1;

      CREATE TABLE IF NOT EXISTS screening_requests (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        org_id TEXT NOT NULL,
        user_id TEXT,
        request_type TEXT NOT NULL,
        input_name TEXT NOT NULL,
        input_name_normalized TEXT NOT NULL DEFAULT '',
        batch_id TEXT,
        threshold INTEGER NOT NULL DEFAULT 80,
        threshold_source TEXT NOT NULL DEFAULT 'system',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS screening_results (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        request_id TEXT NOT NULL REFERENCES screening_requests(id),
        entry_id TEXT NOT NULL,
        confidence_score INTEGER NOT NULL,
        match_details TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        org_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        actor_id TEXT,
        details TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log(org_id, created_at);
    `);

    // Create default org + API key for local dev if none exists
    const orgCount = db.prepare("SELECT COUNT(*) as c FROM organizations").get() as { c: number };
    if (orgCount.c === 0) {
      const orgId = randomUUID();
      db.prepare("INSERT INTO organizations (id, name) VALUES (?, ?)").run(orgId, "Local Dev Org");

      // Create a well-known dev API key: sk_test_localdevelopment
      const crypto = require("crypto");
      const devKeyHash = crypto.createHash("sha256").update("sk_test_localdevelopment").digest("hex");
      db.prepare("INSERT INTO api_keys (id, org_id, name, key_prefix, key_hash) VALUES (?, ?, ?, ?, ?)")
        .run(randomUUID(), orgId, "Local Dev Key", "sk_test_", devKeyHash);

      console.log("[SanctionShield] Created local dev org + API key: sk_test_localdevelopment");
    }
  }

  async searchSanctions(params: {
    queryName: string;
    similarityThreshold: number;
    maxResults: number;
    sourceFilter: string[];
    entityTypeFilter: string | null;
  }): Promise<SearchResult[]> {
    const db = getDb();

    // SQLite doesn't have pg_trgm — use LIKE + app-level scoring
    // Search for entries where the normalized name contains any token from the query
    const tokens = params.queryName.split(/\s+/).filter(t => t.length >= 2);
    if (tokens.length === 0) return [];

    const placeholders = params.sourceFilter.map(() => "?").join(",");
    const likeConditions = tokens.map(() => "primary_name_normalized LIKE ?").join(" OR ");

    let sql = `
      SELECT * FROM sanctions_entries
      WHERE is_active = 1
        AND source IN (${placeholders})
        AND (${likeConditions})
    `;
    const sqlParams: (string | number)[] = [...params.sourceFilter];
    tokens.forEach(t => sqlParams.push(`%${t}%`));

    if (params.entityTypeFilter) {
      sql += " AND entry_type = ?";
      sqlParams.push(params.entityTypeFilter);
    }

    sql += ` LIMIT ${params.maxResults * 3}`; // over-fetch since we don't have trigram scoring at DB level

    const rows = db.prepare(sql).all(...sqlParams) as Array<Record<string, unknown>>;

    return rows.map(row => ({
      id: row.id as string,
      list_id: row.list_id as string,
      source: row.source as string,
      external_id: row.external_id as string | null,
      entry_type: row.entry_type as string,
      primary_name: row.primary_name as string,
      primary_name_normalized: row.primary_name_normalized as string,
      aliases: JSON.parse((row.aliases as string) || "[]"),
      programs: JSON.parse((row.programs as string) || "[]"),
      addresses: JSON.parse((row.addresses as string) || "[]"),
      identification: JSON.parse((row.identification as string) || "[]"),
      remarks: row.remarks as string | null,
      is_active: !!(row.is_active as number),
      similarity: 0.5, // placeholder — real scoring happens in app layer
    }));
  }

  async sanctionsListExistsByHash(source: string, hash: string): Promise<boolean> {
    const db = getDb();
    const row = db.prepare("SELECT id FROM sanctions_lists WHERE source = ? AND raw_hash = ?").get(source, hash);
    return !!row;
  }

  async insertSanctionsList(params: { source: string; version: string; entryCount: number; rawHash: string }): Promise<string> {
    const db = getDb();
    const id = randomUUID();
    db.prepare("INSERT INTO sanctions_lists (id, source, version, entry_count, raw_hash) VALUES (?, ?, ?, ?, ?)")
      .run(id, params.source, params.version, params.entryCount, params.rawHash);
    return id;
  }

  async deactivateEntries(source: string): Promise<void> {
    const db = getDb();
    db.prepare("UPDATE sanctions_entries SET is_active = 0 WHERE source = ? AND is_active = 1").run(source);
  }

  async insertSanctionsEntries(entries: Omit<SanctionsEntryRow, "id" | "is_active">[]): Promise<number> {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO sanctions_entries (id, list_id, source, external_id, entry_type, primary_name, primary_name_normalized, aliases, programs, addresses, identification, remarks, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const insertMany = db.transaction((items: typeof entries) => {
      let count = 0;
      for (const e of items) {
        stmt.run(
          randomUUID(), e.list_id, e.source, e.external_id, e.entry_type,
          e.primary_name, e.primary_name_normalized,
          JSON.stringify(e.aliases), JSON.stringify(e.programs),
          JSON.stringify(e.addresses), JSON.stringify(e.identification),
          e.remarks
        );
        count++;
      }
      return count;
    });

    return insertMany(entries);
  }

  async getListVersions(): Promise<Record<string, string | null>> {
    const db = getDb();
    const rows = db.prepare("SELECT source, version FROM sanctions_lists ORDER BY downloaded_at DESC").all() as Array<{ source: string; version: string }>;
    const versions: Record<string, string | null> = { ofac_sdn: null, eu_consolidated: null, un_security_council: null };
    for (const row of rows) {
      if (!versions[row.source]) versions[row.source] = row.version;
    }
    return versions;
  }

  async insertScreeningRequest(params: {
    orgId: string; userId?: string; requestType: string; inputName: string;
    inputNameNormalized: string; threshold: number; thresholdSource: string;
  }): Promise<string> {
    const db = getDb();
    const id = randomUUID();
    db.prepare(`INSERT INTO screening_requests (id, org_id, user_id, request_type, input_name, input_name_normalized, threshold, threshold_source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, params.orgId, params.userId || null, params.requestType, params.inputName, params.inputNameNormalized, params.threshold, params.thresholdSource);
    return id;
  }

  async insertScreeningResults(results: Array<{ requestId: string; entryId: string; confidenceScore: number; matchDetails: unknown }>): Promise<void> {
    const db = getDb();
    const stmt = db.prepare("INSERT INTO screening_results (id, request_id, entry_id, confidence_score, match_details) VALUES (?, ?, ?, ?, ?)");
    const insertMany = db.transaction((items: typeof results) => {
      for (const r of items) {
        stmt.run(randomUUID(), r.requestId, r.entryId, r.confidenceScore, JSON.stringify(r.matchDetails));
      }
    });
    insertMany(results);
  }

  async insertAuditLog(params: { orgId: string; eventType: string; actorId?: string; details: unknown }): Promise<void> {
    const db = getDb();
    db.prepare("INSERT INTO audit_log (id, org_id, event_type, actor_id, details) VALUES (?, ?, ?, ?, ?)")
      .run(randomUUID(), params.orgId, params.eventType, params.actorId || null, JSON.stringify(params.details));
  }

  async validateApiKey(keyHash: string): Promise<{ orgId: string; apiKeyId: string } | null> {
    const db = getDb();
    const row = db.prepare("SELECT id, org_id, revoked_at FROM api_keys WHERE key_hash = ?").get(keyHash) as { id: string; org_id: string; revoked_at: string | null } | undefined;
    if (!row || row.revoked_at) return null;
    db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").run(row.id);
    return { orgId: row.org_id, apiKeyId: row.id };
  }

  async createApiKey(params: { orgId: string; name: string; keyPrefix: string; keyHash: string }): Promise<string> {
    const db = getDb();
    const id = randomUUID();
    db.prepare("INSERT INTO api_keys (id, org_id, name, key_prefix, key_hash) VALUES (?, ?, ?, ?, ?)")
      .run(id, params.orgId, params.name, params.keyPrefix, params.keyHash);
    return id;
  }

  async createOrganization(name: string): Promise<string> {
    const db = getDb();
    const id = randomUUID();
    db.prepare("INSERT INTO organizations (id, name) VALUES (?, ?)").run(id, name);
    return id;
  }
}
