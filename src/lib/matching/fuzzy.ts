import { getDb } from "@/lib/db";
import { calculateConfidence } from "./scorer";
import { normalizeName } from "./normalize";
import type { EntityType, SanctionsSource, ScreeningMatch } from "@/lib/sanctions/types";

interface ScreenOptions {
  name: string;
  entityType?: EntityType | "any";
  threshold?: number;
  lists?: SanctionsSource[];
}

/**
 * Two-phase screening engine:
 * Phase 1: Database search (pg_trgm in Postgres, LIKE in SQLite)
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
  const db = await getDb();

  // Phase 1: DB-level candidate search
  const candidates = await db.searchSanctions({
    queryName: normalized,
    similarityThreshold: 0.2,
    maxResults: 50,
    sourceFilter: lists,
    entityTypeFilter: entityType === "any" ? null : entityType,
  });

  if (candidates.length === 0) return [];

  // Phase 2: App-level confidence scoring
  const matches: ScreeningMatch[] = [];

  for (const entry of candidates) {
    const result = calculateConfidence(name, entry.primary_name, entry.aliases);

    if (result.confidence >= threshold) {
      matches.push({
        confidence: result.confidence,
        band: result.band,
        requires_review: result.requires_review,
        component_scores: result.component_scores,
        list: entry.source as SanctionsSource,
        entry: {
          sdn_id: entry.external_id || entry.id,
          entry_type: entry.entry_type as EntityType,
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

  matches.sort((a, b) => b.confidence - a.confidence);
  return matches;
}
