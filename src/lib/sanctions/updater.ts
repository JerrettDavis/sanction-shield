import { getDb } from "@/lib/db";
import { downloadAndParseOFAC } from "./ofac";
import { normalizeName } from "@/lib/matching/normalize";
import { createHash } from "crypto";

/**
 * Download, parse, and upsert sanctions list entries into the database.
 * Called by the daily cron job or on initial setup.
 */
export async function updateSanctionsLists(): Promise<{
  source: string;
  entriesProcessed: number;
  newEntries: number;
}[]> {
  const results = [];

  // OFAC SDN
  try {
    const entries = await downloadAndParseOFAC();
    const result = await upsertEntries("ofac_sdn", entries);
    results.push({ source: "ofac_sdn", ...result });
  } catch (err) {
    console.error("Failed to update OFAC SDN:", err);
    results.push({ source: "ofac_sdn", entriesProcessed: 0, newEntries: 0 });
  }

  return results;
}

async function upsertEntries(
  source: string,
  entries: Awaited<ReturnType<typeof downloadAndParseOFAC>>
): Promise<{ entriesProcessed: number; newEntries: number }> {
  const db = await getDb();

  // Create a hash of all entries for versioning
  const hash = createHash("sha256")
    .update(JSON.stringify(entries.map(e => e.primaryName).sort()))
    .digest("hex");

  // Check if we already have this exact version
  if (await db.sanctionsListExistsByHash(source, hash)) {
    console.log(`[SanctionShield] ${source}: list unchanged (hash match), skipping`);
    return { entriesProcessed: entries.length, newEntries: 0 };
  }

  // Create new list version
  const listId = await db.insertSanctionsList({
    source,
    version: new Date().toISOString().split("T")[0],
    entryCount: entries.length,
    rawHash: hash,
  });

  // Deactivate old entries
  await db.deactivateEntries(source);

  // Insert new entries
  const rows = entries.map(e => ({
    list_id: listId,
    source,
    external_id: e.externalId,
    entry_type: e.entryType,
    primary_name: e.primaryName,
    primary_name_normalized: normalizeName(e.primaryName),
    aliases: e.aliases,
    programs: e.programs,
    addresses: e.addresses as unknown,
    identification: e.identification as unknown,
    remarks: e.remarks || null,
  }));

  const newEntries = await db.insertSanctionsEntries(rows);
  console.log(`[SanctionShield] ${source}: inserted ${newEntries} entries`);

  return { entriesProcessed: entries.length, newEntries };
}
