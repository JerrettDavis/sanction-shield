import type { SanctionsEntry, EntityType } from "./types";

const EU_CSV_URL = "https://webgate.ec.europa.eu/fsd/fsf/public/files/csvFullSanctionsList/content?token=dG9rZW4tMjAxNw";

/**
 * Download and parse the EU Consolidated sanctions list.
 * CSV is semicolon-delimited with a complex flattened structure where
 * each row represents a name/alias/address/identity fragment.
 * We group by Entity_logical_id to reconstruct full entries.
 */
export async function downloadAndParseEU(): Promise<SanctionsEntry[]> {
  const text = await fetchText(EU_CSV_URL);
  return parseEUCSV(text);
}

function parseEUCSV(csv: string): SanctionsEntry[] {
  const lines = csv.split("\n");
  if (lines.length < 2) return [];

  // Parse header (first line)
  const header = lines[0].split(";").map(h => h.trim().replace(/["\ufeff]/g, ""));

  // Find column indices
  const col = (name: string) => header.indexOf(name);
  const entityIdIdx = col("Entity_logical_id");
  const subjectTypeIdx = col("Subject_type");
  const programmeIdx = col("Programme");
  const entityRemarkIdx = col("Entity_remark");
  const lastnameIdx = col("Naal_lastname");
  const firstnameIdx = col("Naal_firstname");
  const wholenameIdx = col("Naal_wholename");

  if (entityIdIdx === -1) return [];

  // Group rows by entity ID
  const entityMap = new Map<string, {
    type: string;
    programs: Set<string>;
    names: Set<string>;
    remarks: string;
  }>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = line.split(";").map(f => f.trim().replace(/"/g, ""));
    const entityId = fields[entityIdIdx];
    if (!entityId) continue;

    if (!entityMap.has(entityId)) {
      entityMap.set(entityId, {
        type: fields[subjectTypeIdx] || "",
        programs: new Set(),
        names: new Set(),
        remarks: fields[entityRemarkIdx] || "",
      });
    }

    const entity = entityMap.get(entityId)!;

    // Collect programs
    const program = fields[programmeIdx];
    if (program) entity.programs.add(program);

    // Collect names (wholename, lastname+firstname)
    const wholename = wholenameIdx >= 0 ? fields[wholenameIdx] : "";
    const lastname = lastnameIdx >= 0 ? fields[lastnameIdx] : "";
    const firstname = firstnameIdx >= 0 ? fields[firstnameIdx] : "";

    if (wholename) entity.names.add(wholename);
    if (lastname && firstname) entity.names.add(`${lastname}, ${firstname}`);
    else if (lastname) entity.names.add(lastname);
  }

  // Convert to SanctionsEntry format
  const entries: SanctionsEntry[] = [];

  for (const [entityId, entity] of entityMap) {
    const names = [...entity.names];
    if (names.length === 0) continue;

    const primaryName = names[0];
    const aliases = names.slice(1);

    entries.push({
      externalId: entityId,
      source: "eu_consolidated",
      entryType: mapEUType(entity.type),
      primaryName,
      aliases,
      programs: [...entity.programs],
      addresses: [],
      identification: [],
      remarks: entity.remarks || undefined,
    });
  }

  return entries;
}

function mapEUType(type: string): EntityType {
  switch (type.toUpperCase()) {
    case "P": return "individual";
    case "E": return "organization";
    default: return "other";
  }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "SanctionShield/1.0 (Compliance Screening)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch EU list: ${res.status}`);
  return res.text();
}
