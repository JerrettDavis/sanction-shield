/**
 * Database adapter — abstracts storage behind a common interface.
 * Local dev: SQLite (zero config, no secrets)
 * Production: Supabase PostgreSQL (env-detected)
 */

export interface SanctionsEntryRow {
  id: string;
  list_id: string;
  source: string;
  external_id: string | null;
  entry_type: string;
  primary_name: string;
  primary_name_normalized: string;
  aliases: string[];
  programs: string[];
  addresses: unknown;
  identification: unknown;
  remarks: string | null;
  is_active: boolean;
}

export interface ScreeningRequestRow {
  id: string;
  org_id: string;
  user_id: string | null;
  request_type: string;
  input_name: string;
  input_name_normalized: string;
  batch_id: string | null;
  threshold: number;
  threshold_source: string;
  created_at: string;
}

export interface SearchResult extends SanctionsEntryRow {
  similarity: number;
}

export interface DbAdapter {
  /** Initialize the database (create tables, indexes, etc.) */
  initialize(): Promise<void>;

  /** Search sanctions entries by fuzzy name matching */
  searchSanctions(params: {
    queryName: string;
    similarityThreshold: number;
    maxResults: number;
    sourceFilter: string[];
    entityTypeFilter: string | null;
  }): Promise<SearchResult[]>;

  /** Insert a sanctions list version record */
  insertSanctionsList(params: {
    source: string;
    version: string;
    entryCount: number;
    rawHash: string;
  }): Promise<string>;

  /** Check if a sanctions list version already exists by hash */
  sanctionsListExistsByHash(source: string, hash: string): Promise<boolean>;

  /** Deactivate all entries for a source */
  deactivateEntries(source: string): Promise<void>;

  /** Batch insert sanctions entries */
  insertSanctionsEntries(entries: Omit<SanctionsEntryRow, "id" | "is_active">[]): Promise<number>;

  /** Get latest list versions */
  getListVersions(): Promise<Record<string, string | null>>;

  /** Insert a screening request */
  insertScreeningRequest(params: {
    orgId: string;
    userId?: string;
    requestType: string;
    inputName: string;
    inputNameNormalized: string;
    threshold: number;
    thresholdSource: string;
  }): Promise<string>;

  /** Insert screening results */
  insertScreeningResults(results: Array<{
    requestId: string;
    entryId: string;
    confidenceScore: number;
    matchDetails: unknown;
  }>): Promise<void>;

  /** Insert an audit log entry */
  insertAuditLog(params: {
    orgId: string;
    eventType: string;
    actorId?: string;
    details: unknown;
  }): Promise<void>;

  /** Validate an API key, return org_id if valid */
  validateApiKey(keyHash: string): Promise<{ orgId: string; apiKeyId: string } | null>;

  /** Create an API key */
  createApiKey(params: {
    orgId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
  }): Promise<string>;

  /** Create an organization */
  createOrganization(name: string): Promise<string>;
}

/** Detect which adapter to use based on environment */
export function isProductionMode(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
