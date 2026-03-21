/**
 * Seed script: downloads live OFAC SDN list and inserts into local SQLite.
 * Run with: npx tsx scripts/seed-ofac.ts
 */

import { SqliteAdapter } from "../src/lib/db/sqlite";

// Force the adapter module to use SQLite by setting up the getDb override
// We import the adapter directly here since this is a standalone script

async function main() {
  console.log("[Seed] Initializing SQLite database...");
  const adapter = new SqliteAdapter();
  await adapter.initialize();
  console.log("[Seed] Database initialized.");

  console.log("[Seed] Downloading OFAC SDN list from Treasury.gov...");
  console.log("[Seed] This may take 30-60 seconds on first run.");

  const startTime = Date.now();

  // We need to wire up getDb to return our adapter
  // Since updateSanctionsLists uses getDb(), let's call the OFAC parser directly
  const { downloadAndParseOFAC } = await import("../src/lib/sanctions/ofac");
  const { normalizeName } = await import("../src/lib/matching/normalize");
  const { createHash } = await import("crypto");

  const entries = await downloadAndParseOFAC();
  console.log(`[Seed] Parsed ${entries.length} OFAC SDN entries.`);

  // Hash for dedup
  const hash = createHash("sha256")
    .update(JSON.stringify(entries.map(e => e.primaryName).sort()))
    .digest("hex");

  if (await adapter.sanctionsListExistsByHash("ofac_sdn", hash)) {
    console.log("[Seed] OFAC SDN list already up to date. Skipping.");
    return;
  }

  // Insert list record
  const listId = await adapter.insertSanctionsList({
    source: "ofac_sdn",
    version: new Date().toISOString().split("T")[0],
    entryCount: entries.length,
    rawHash: hash,
  });

  // Deactivate old entries
  await adapter.deactivateEntries("ofac_sdn");

  // Insert entries
  const rows = entries.map(e => ({
    list_id: listId,
    source: "ofac_sdn" as const,
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

  const count = await adapter.insertSanctionsEntries(rows);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`[Seed] Inserted ${count} entries in ${duration}s.`);
  console.log("[Seed] Done! You can now run: npm run dev");
}

main().catch(err => {
  console.error("[Seed] Failed:", err);
  process.exit(1);
});
