import { createServiceClient } from "@/lib/db/client";
import { calculateConfidence } from "./scorer";
import { normalizeName } from "./normalize";
import type { EntityType, SanctionsSource, ScreeningMatch } from "@/lib/sanctions/types";

interface ScreenOptions {
  name: string;
  entityType?: EntityType | "any";
  threshold?: number;
  lists?: SanctionsSource[];
}

interface DbEntry {
  id: string;
  external_id: string;
  source: SanctionsSource;
  entry_type: EntityType;
  primary_name: string;
  primary_name_normalized: string;
  aliases: string[];
  programs: string[];
  addresses: unknown;
  identification: unknown;
  remarks: string | null;
}

/**
 * Two-phase screening engine:
 * Phase 1: PostgreSQL pg_trgm similarity search (fast, DB-level)
 * Phase 2: App-level confidence scoring with phonetic + Levenshtein refinement
 */
export async function screenName(options: ScreenOptions): Promise<ScreeningMatch[]> {
  const {
    name,
    entityType = "any",
    threshold = 80,
    lists = ["ofac_sdn", "eu_consolidated", "un_security_council"],
  } = options;

  const normalized = normalizeName(name);
  const supabase = createServiceClient();

  // Phase 1: pg_trgm similarity search — get top 50 candidates from DB
  // Using a lower threshold (0.2) to cast a wide net, then refine in Phase 2
  const { data: candidates, error } = await supabase.rpc("search_sanctions", {
    query_name: normalized,
    similarity_threshold: 0.2,
    max_results: 50,
    source_filter: lists,
    entity_type_filter: entityType === "any" ? null : entityType,
  });

  if (error) {
    console.error("Sanctions search error:", error);
    throw new Error(`Screening failed: ${error.message}`);
  }

  if (!candidates || candidates.length === 0) {
    return [];
  }

  // Phase 2: App-level confidence scoring with full algorithm
  const matches: ScreeningMatch[] = [];

  for (const entry of candidates as DbEntry[]) {
    const confidence = calculateConfidence(name, entry.primary_name, entry.aliases);

    if (confidence >= threshold) {
      matches.push({
        confidence,
        list: entry.source,
        entry: {
          sdn_id: entry.external_id || entry.id,
          entry_type: entry.entry_type,
          primary_name: entry.primary_name,
          aliases: entry.aliases,
          programs: entry.programs,
          addresses: entry.addresses as ScreeningMatch["entry"]["addresses"],
          ids: entry.identification as ScreeningMatch["entry"]["ids"],
          remarks: entry.remarks ?? undefined,
        },
      });
    }
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);

  return matches;
}
