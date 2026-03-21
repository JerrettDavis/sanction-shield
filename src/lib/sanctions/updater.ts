import { createServiceClient } from "@/lib/db/client";
import { downloadAndParseOFAC } from "./ofac";
import { normalizeName } from "@/lib/matching/normalize";
import { createHash } from "crypto";
import type { SanctionsEntry } from "./types";

/**
 * Download, parse, and upsert sanctions list entries into the database.
 * Called by the daily cron job.
 */
export async function updateSanctionsLists(): Promise<{
  source: string;
  entriesProcessed: number;
  newEntries: number;
  updatedEntries: number;
}[]> {
  const results = [];

  // OFAC SDN
  try {
    const entries = await downloadAndParseOFAC();
    const result = await upsertEntries("ofac_sdn", entries);
    results.push({ source: "ofac_sdn", ...result });
  } catch (err) {
    console.error("Failed to update OFAC SDN:", err);
    results.push({ source: "ofac_sdn", entriesProcessed: 0, newEntries: 0, updatedEntries: 0 });
  }

  // TODO: EU Consolidated and UN Security Council parsers
  // results.push(await updateEU());
  // results.push(await updateUN());

  return results;
}

async function upsertEntries(
  source: string,
  entries: SanctionsEntry[]
): Promise<{ entriesProcessed: number; newEntries: number; updatedEntries: number }> {
  const supabase = createServiceClient();

  // Create a hash of all entries for versioning
  const hash = createHash("sha256")
    .update(JSON.stringify(entries.map(e => e.primaryName).sort()))
    .digest("hex");

  // Check if we already have this exact version
  const { data: existingList } = await supabase
    .from("sanctions_lists")
    .select("id")
    .eq("source", source)
    .eq("raw_hash", hash)
    .maybeSingle();

  if (existingList) {
    return { entriesProcessed: entries.length, newEntries: 0, updatedEntries: 0 };
  }

  // Create new list version
  const { data: list, error: listError } = await supabase
    .from("sanctions_lists")
    .insert({
      source,
      version: new Date().toISOString().split("T")[0],
      entry_count: entries.length,
      raw_hash: hash,
    })
    .select("id")
    .single();

  if (listError || !list) {
    throw new Error(`Failed to create list record: ${listError?.message}`);
  }

  // Deactivate old entries for this source
  await supabase
    .from("sanctions_entries")
    .update({ is_active: false })
    .eq("source", source)
    .eq("is_active", true);

  // Batch insert new entries (Supabase has a 1000-row limit per insert)
  let newEntries = 0;
  const batchSize = 500;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize).map(e => ({
      list_id: list.id,
      source,
      external_id: e.externalId,
      entry_type: e.entryType,
      primary_name: e.primaryName,
      primary_name_normalized: normalizeName(e.primaryName),
      aliases: e.aliases,
      programs: e.programs,
      addresses: JSON.stringify(e.addresses),
      identification: JSON.stringify(e.identification),
      remarks: e.remarks || null,
      is_active: true,
    }));

    const { error } = await supabase.from("sanctions_entries").insert(batch);
    if (error) {
      console.error(`Batch insert error at offset ${i}:`, error);
    } else {
      newEntries += batch.length;
    }
  }

  return { entriesProcessed: entries.length, newEntries, updatedEntries: 0 };
}
