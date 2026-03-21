import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/middleware";
import { screenName } from "@/lib/matching/fuzzy";
import { createServiceClient } from "@/lib/db/client";
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

  const supabase = createServiceClient();

  // Log screening request
  const { data: request } = await supabase
    .from("screening_requests")
    .insert({
      org_id: auth.orgId,
      request_type: "single",
      input_name: name,
      threshold,
    })
    .select("id")
    .single();

  // Log screening results
  if (request && matches.length > 0) {
    await supabase.from("screening_results").insert(
      matches.map(m => ({
        request_id: request.id,
        entry_id: m.entry.sdn_id,
        confidence_score: m.confidence,
        match_details: { list: m.list, primary_name: m.entry.primary_name },
      }))
    );
  }

  // Write audit log
  await supabase.from("audit_log").insert({
    org_id: auth.orgId,
    event_type: "screening.single",
    details: {
      input_name: name,
      entity_type: entityType,
      threshold,
      matches_found: matches.length,
      request_id: request?.id,
    },
  });

  // Get list versions
  const { data: listVersions } = await supabase
    .from("sanctions_lists")
    .select("source, version")
    .order("downloaded_at", { ascending: false });

  const versions: Record<string, string | null> = {
    ofac_sdn: null,
    eu_consolidated: null,
    un_security_council: null,
  };
  for (const lv of listVersions || []) {
    if (!versions[lv.source]) versions[lv.source] = lv.version;
  }

  const response: ScreeningResponse = {
    screened_at: new Date().toISOString(),
    input: { name, entity_type: entityType as EntityType | "any", threshold },
    matches,
    list_versions: versions as Record<SanctionsSource, string | null>,
    request_id: request?.id || "unknown",
  };

  return NextResponse.json(response);
}
