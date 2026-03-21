import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DbAdapter, SanctionsEntryRow, SearchResult } from "./adapter";
// DbAdapter type needed for return type reference in getBatchJob

/**
 * Production adapter using Supabase PostgreSQL.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
export class SupabaseAdapter implements DbAdapter {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async initialize(): Promise<void> {
    // Schema managed via Supabase migrations — no runtime DDL
  }

  async searchSanctions(params: {
    queryName: string;
    similarityThreshold: number;
    maxResults: number;
    sourceFilter: string[];
    entityTypeFilter: string | null;
  }): Promise<SearchResult[]> {
    const { data, error } = await this.client.rpc("search_sanctions", {
      query_name: params.queryName,
      similarity_threshold: params.similarityThreshold,
      max_results: params.maxResults,
      source_filter: params.sourceFilter,
      entity_type_filter: params.entityTypeFilter,
    });

    if (error) throw new Error(`Search failed: ${error.message}`);
    return (data || []) as SearchResult[];
  }

  async sanctionsListExistsByHash(source: string, hash: string): Promise<boolean> {
    const { data } = await this.client
      .from("sanctions_lists")
      .select("id")
      .eq("source", source)
      .eq("raw_hash", hash)
      .maybeSingle();
    return !!data;
  }

  async insertSanctionsList(params: { source: string; version: string; entryCount: number; rawHash: string }): Promise<string> {
    const { data, error } = await this.client
      .from("sanctions_lists")
      .insert({ source: params.source, version: params.version, entry_count: params.entryCount, raw_hash: params.rawHash })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Insert list failed: ${error?.message}`);
    return data.id;
  }

  async deactivateEntries(source: string): Promise<void> {
    await this.client
      .from("sanctions_entries")
      .update({ is_active: false })
      .eq("source", source)
      .eq("is_active", true);
  }

  async insertSanctionsEntries(entries: Omit<SanctionsEntryRow, "id" | "is_active">[]): Promise<number> {
    const batchSize = 500;
    let count = 0;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize).map(e => ({
        ...e,
        addresses: JSON.stringify(e.addresses),
        identification: JSON.stringify(e.identification),
        is_active: true,
      }));
      const { error } = await this.client.from("sanctions_entries").insert(batch);
      if (!error) count += batch.length;
    }
    return count;
  }

  async getListVersions(): Promise<Record<string, string | null>> {
    const { data } = await this.client
      .from("sanctions_lists")
      .select("source, version")
      .order("downloaded_at", { ascending: false });

    const versions: Record<string, string | null> = { ofac_sdn: null, eu_consolidated: null, un_security_council: null };
    for (const row of data || []) {
      if (!versions[row.source]) versions[row.source] = row.version;
    }
    return versions;
  }

  async insertScreeningRequest(params: {
    orgId: string; userId?: string; requestType: string; inputName: string;
    inputNameNormalized: string; threshold: number; thresholdSource: string;
  }): Promise<string> {
    const { data, error } = await this.client
      .from("screening_requests")
      .insert({
        org_id: params.orgId, user_id: params.userId || null,
        request_type: params.requestType, input_name: params.inputName,
        input_name_normalized: params.inputNameNormalized,
        threshold: params.threshold, threshold_source: params.thresholdSource,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Insert request failed: ${error?.message}`);
    return data.id;
  }

  async insertScreeningResults(results: Array<{ requestId: string; entryId: string; confidenceScore: number; matchDetails: unknown }>): Promise<void> {
    await this.client.from("screening_results").insert(
      results.map(r => ({ request_id: r.requestId, entry_id: r.entryId, confidence_score: r.confidenceScore, match_details: r.matchDetails }))
    );
  }

  async insertAuditLog(params: { orgId: string; eventType: string; actorId?: string; details: unknown }): Promise<void> {
    await this.client.from("audit_log").insert({
      org_id: params.orgId, event_type: params.eventType,
      actor_id: params.actorId || null, details: params.details,
    });
  }

  async validateApiKey(keyHash: string): Promise<{ orgId: string; apiKeyId: string } | null> {
    const { data } = await this.client
      .from("api_keys")
      .select("id, org_id, revoked_at")
      .eq("key_hash", keyHash)
      .maybeSingle();
    if (!data || data.revoked_at) return null;
    this.client.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then();
    return { orgId: data.org_id, apiKeyId: data.id };
  }

  async createApiKey(params: { orgId: string; name: string; keyPrefix: string; keyHash: string }): Promise<string> {
    const { data, error } = await this.client
      .from("api_keys")
      .insert({ org_id: params.orgId, name: params.name, key_prefix: params.keyPrefix, key_hash: params.keyHash })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Create key failed: ${error?.message}`);
    return data.id;
  }

  async createOrganization(name: string): Promise<string> {
    const { data, error } = await this.client
      .from("organizations")
      .insert({ name })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Create org failed: ${error?.message}`);
    return data.id;
  }

  async createBatchJob(params: { orgId: string; userId?: string; totalNames: number; threshold: number }): Promise<string> {
    const { data, error } = await this.client
      .from("batch_jobs")
      .insert({ org_id: params.orgId, user_id: params.userId || null, total_names: params.totalNames, threshold: params.threshold })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Create batch failed: ${error?.message}`);
    return data.id;
  }

  async updateBatchJob(id: string, update: { status?: string; processed?: number; matchesFound?: number; completedAt?: string }): Promise<void> {
    const updateObj: Record<string, unknown> = {};
    if (update.status !== undefined) updateObj.status = update.status;
    if (update.processed !== undefined) updateObj.processed = update.processed;
    if (update.matchesFound !== undefined) updateObj.matches_found = update.matchesFound;
    if (update.completedAt !== undefined) updateObj.completed_at = update.completedAt;
    await this.client.from("batch_jobs").update(updateObj).eq("id", id);
  }

  async getBatchJob(id: string) {
    const { data } = await this.client.from("batch_jobs").select("*").eq("id", id).maybeSingle();
    return data as Awaited<ReturnType<DbAdapter["getBatchJob"]>>;
  }

  async getBatchResults(batchId: string) {
    const { data } = await this.client
      .from("screening_requests")
      .select("input_name, screening_results(confidence_score, match_details)")
      .eq("batch_id", batchId)
      .order("created_at");

    return (data || []).map((row: Record<string, unknown>) => {
      const results = row.screening_results as Array<Record<string, unknown>> || [];
      const top = results[0];
      const details = (top?.match_details || {}) as Record<string, unknown>;
      const confidence = top?.confidence_score as number | null ?? null;
      const band = confidence !== null ? (confidence >= 85 ? "HIGH" : confidence >= 60 ? "REVIEW" : "LOW") : null;
      return {
        input_name: row.input_name as string,
        decision: confidence === null ? "clear" : (confidence >= 85 ? "potential_match" : confidence >= 60 ? "review" : "clear"),
        confidence,
        matched_name: (details.primary_name as string) || null,
        matched_list: (details.list as string) || null,
        matched_id: (details.sdn_id as string) || null,
        band,
        reason_codes: (details.reason_codes as string[]) || [],
        programs: (details.programs as string[]) || [],
      };
    });
  }
}
