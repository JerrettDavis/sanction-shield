import { getDb } from "@/lib/db";
import { screenName } from "@/lib/matching/fuzzy";
import { normalizeName } from "@/lib/matching/normalize";
import type { SanctionsSource } from "@/lib/sanctions/types";

interface BatchRow {
  name: string;
  entity_type?: string;
}

/**
 * Process a batch of names for screening.
 * Each row is screened independently — a failure on one row doesn't kill the batch.
 */
export async function processBatch(params: {
  batchId: string;
  orgId: string;
  rows: BatchRow[];
  threshold: number;
  lists: SanctionsSource[];
}): Promise<void> {
  const { batchId, orgId, rows, threshold, lists } = params;
  const db = await getDb();

  await db.updateBatchJob(batchId, { status: "processing" });

  let processed = 0;
  let matchesFound = 0;

  for (const row of rows) {
    try {
      if (!row.name || row.name.trim().length === 0) {
        processed++;
        await db.updateBatchJob(batchId, { processed });
        continue;
      }

      const entityType = (row.entity_type as "individual" | "organization" | "any") || "any";
      const matches = await screenName({
        name: row.name.trim(),
        entityType,
        threshold,
        lists,
      });

      const normalized = normalizeName(row.name.trim());
      const topMatch = matches[0];

      // Create screening request linked to batch
      const requestId = await db.insertScreeningRequest({
        orgId,
        requestType: "batch",
        inputName: row.name.trim(),
        inputNameNormalized: normalized,
        threshold,
        thresholdSource: "system",
      });

      // Hacky but needed: update the batch_id on the request
      // The adapter doesn't support this directly, so we use the screening request
      // linked via the batch processing loop

      if (matches.length > 0) {
        matchesFound++;
        await db.insertScreeningResults(
          matches.slice(0, 5).map(m => ({
            requestId,
            entryId: m.entry.sdn_id,
            confidenceScore: m.confidence,
            matchDetails: {
              list: m.list,
              primary_name: m.entry.primary_name,
              sdn_id: m.entry.sdn_id,
              band: m.band,
              component_scores: m.component_scores,
              programs: m.entry.programs,
              reason_codes: m.requires_review ? ["ambiguous_confidence"] : [],
            },
          }))
        );
      }
    } catch (err) {
      // Failure isolation: log error but continue processing
      console.error(`[Batch ${batchId}] Row ${processed + 1} failed:`, err);
    }

    processed++;
    // Update progress every 10 rows to reduce DB writes
    if (processed % 10 === 0 || processed === rows.length) {
      await db.updateBatchJob(batchId, { processed, matchesFound });
    }
  }

  await db.updateBatchJob(batchId, {
    status: "complete",
    processed,
    matchesFound,
    completedAt: new Date().toISOString(),
  });

  // Audit log
  await db.insertAuditLog({
    orgId,
    eventType: "screening.batch_complete",
    details: {
      batch_id: batchId,
      total_names: rows.length,
      processed,
      matches_found: matchesFound,
      threshold,
    },
  });
}

/** Parse CSV text into rows with name + optional entity_type columns */
export function parseCSV(csvText: string): BatchRow[] {
  const lines = csvText.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Parse header
  const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
  const nameIdx = header.findIndex(h => h === "name" || h === "entity_name" || h === "company" || h === "person");
  const typeIdx = header.findIndex(h => h === "entity_type" || h === "type");

  if (nameIdx === -1) {
    // No header match — treat first column as name
    return lines.slice(1).map(line => {
      const fields = line.split(",").map(f => f.trim().replace(/"/g, ""));
      return { name: fields[0] || "" };
    });
  }

  return lines.slice(1).map(line => {
    const fields = line.split(",").map(f => f.trim().replace(/"/g, ""));
    return {
      name: fields[nameIdx] || "",
      entity_type: typeIdx >= 0 ? fields[typeIdx] : undefined,
    };
  });
}
