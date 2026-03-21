import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/middleware";
import { screenName } from "@/lib/matching/fuzzy";
import { normalizeName } from "@/lib/matching/normalize";
import { getDb } from "@/lib/db";
import type { EntityType, SanctionsSource, ScreeningResponse } from "@/lib/sanctions/types";

const VALID_ENTITY_TYPES = ["individual", "organization", "vessel", "aircraft", "any"] as const;
const VALID_LISTS = ["ofac_sdn", "eu_consolidated", "un_security_council"] as const;

export async function POST(req: NextRequest) {
  // Authenticate
  const auth = await validateApiKey(req);
  if (auth instanceof NextResponse) return auth;

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  // Validate input
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 500) {
    return NextResponse.json(
      { error: "validation_error", message: "Name must be between 1 and 500 characters" },
      { status: 400 }
    );
  }

  const entityType = (body.entity_type as string) || "any";
  if (!VALID_ENTITY_TYPES.includes(entityType as typeof VALID_ENTITY_TYPES[number])) {
    return NextResponse.json(
      { error: "validation_error", message: `entity_type must be one of: ${VALID_ENTITY_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const threshold = typeof body.threshold === "number" ? body.threshold : 80;
  if (threshold < 0 || threshold > 100) {
    return NextResponse.json(
      { error: "validation_error", message: "Threshold must be between 0 and 100" },
      { status: 400 }
    );
  }

  const thresholdSource = body.threshold !== undefined ? "user" : "system";

  const lists = Array.isArray(body.lists) ? body.lists : [...VALID_LISTS];
  for (const list of lists) {
    if (!VALID_LISTS.includes(list as typeof VALID_LISTS[number])) {
      return NextResponse.json(
        { error: "validation_error", message: `Invalid list: ${list}. Must be one of: ${VALID_LISTS.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // Screen
  const matches = await screenName({
    name,
    entityType: entityType as EntityType | "any",
    threshold,
    lists: lists as SanctionsSource[],
  });

  const db = await getDb();
  const normalizedInput = normalizeName(name);

  // Log screening request with threshold governance
  const requestId = await db.insertScreeningRequest({
    orgId: auth.orgId,
    requestType: "single",
    inputName: name,
    inputNameNormalized: normalizedInput,
    threshold,
    thresholdSource,
  });

  // Log screening results
  if (matches.length > 0) {
    await db.insertScreeningResults(
      matches.map(m => ({
        requestId,
        entryId: m.entry.sdn_id,
        confidenceScore: m.confidence,
        matchDetails: {
          list: m.list,
          primary_name: m.entry.primary_name,
          band: m.band,
          component_scores: m.component_scores,
        },
      }))
    );
  }

  // Get list versions
  const listVersions = await db.getListVersions();

  // Compute top-level decision
  const topMatch = matches[0];
  const decision = matches.length === 0
    ? "clear"
    : topMatch.band === "HIGH"
      ? "potential_match"
      : "review";

  const reasonCodes: string[] = [];
  if (matches.some(m => m.requires_review)) reasonCodes.push("ambiguous_confidence");
  if (matches.some(m => m.entry.entry_type !== entityType && entityType !== "any")) {
    reasonCodes.push("entity_type_mismatch");
  }

  // Write audit log with full payload
  await db.insertAuditLog({
    orgId: auth.orgId,
    eventType: "screening.single",
    actorId: auth.apiKeyId,
    details: {
      input_name: name,
      input_name_normalized: normalizedInput,
      entity_type: entityType,
      threshold,
      threshold_source: thresholdSource,
      decision,
      reason_codes: reasonCodes,
      matches_found: matches.length,
      top_matches: matches.slice(0, 5).map(m => ({
        name: m.entry.primary_name,
        confidence: m.confidence,
        band: m.band,
        list: m.list,
      })),
      list_versions: listVersions,
      request_id: requestId,
      api_key_id: auth.apiKeyId,
    },
  });

  const response: ScreeningResponse & {
    decision: string;
    decision_confidence: number | null;
    reason_codes: string[];
    api_version: string;
  } = {
    api_version: "2026-03-21",
    screened_at: new Date().toISOString(),
    decision,
    decision_confidence: topMatch?.confidence ?? null,
    reason_codes: reasonCodes,
    input: { name, entity_type: entityType as EntityType | "any", threshold },
    matches,
    list_versions: listVersions as Record<SanctionsSource, string | null>,
    request_id: requestId,
  };

  return NextResponse.json(response);
}
