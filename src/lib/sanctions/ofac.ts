import type { SanctionsEntry, EntityType } from "./types";

const OFAC_SDN_CSV_URL = "https://www.treasury.gov/ofac/downloads/sdn.csv";
const OFAC_SDN_ALT_URL = "https://www.treasury.gov/ofac/downloads/alt.csv";
const OFAC_SDN_ADD_URL = "https://www.treasury.gov/ofac/downloads/add.csv";

/**
 * Download and parse the OFAC SDN list from Treasury.gov CSV files.
 * Uses CSV format (simpler and smaller than XML).
 *
 * SDN CSV columns: ent_num, SDN_Name, SDN_Type, Program, Title, Call_Sign, Vess_type,
 *                  Tonnage, GRT, Vess_flag, Vess_owner, Remarks
 */
export async function downloadAndParseOFAC(): Promise<SanctionsEntry[]> {
  const [sdnText, altText, addText] = await Promise.all([
    fetchText(OFAC_SDN_CSV_URL),
    fetchText(OFAC_SDN_ALT_URL),
    fetchText(OFAC_SDN_ADD_URL),
  ]);

  // Parse primary entries
  const entries = parseSDNCSV(sdnText);

  // Parse aliases and merge
  const aliasMap = parseAltCSV(altText);
  for (const entry of entries) {
    const aliases = aliasMap.get(entry.externalId);
    if (aliases) {
      entry.aliases.push(...aliases);
    }
  }

  // Parse addresses and merge
  const addressMap = parseAddCSV(addText);
  for (const entry of entries) {
    const addresses = addressMap.get(entry.externalId);
    if (addresses) {
      entry.addresses.push(...addresses);
    }
  }

  return entries;
}

function parseSDNCSV(csv: string): SanctionsEntry[] {
  const entries: SanctionsEntry[] = [];
  const lines = csv.split("\n");

  for (const line of lines) {
    const fields = parseCSVLine(line);
    if (fields.length < 3 || !fields[0] || !fields[1]) continue;

    const entNum = fields[0].trim();
    const name = fields[1].trim().replace(/"/g, "");
    const sdnType = fields[2]?.trim().replace(/"/g, "") || "";
    const programs = fields[3]?.trim().replace(/"/g, "").split(";").map(s => s.trim()).filter(Boolean) || [];
    const remarks = fields[11]?.trim().replace(/"/g, "") || undefined;

    entries.push({
      externalId: entNum,
      source: "ofac_sdn",
      entryType: mapSDNType(sdnType),
      primaryName: name,
      aliases: [],
      programs,
      addresses: [],
      identification: [],
      remarks,
    });
  }

  return entries;
}

function parseAltCSV(csv: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const lines = csv.split("\n");

  for (const line of lines) {
    const fields = parseCSVLine(line);
    if (fields.length < 4 || !fields[0] || !fields[3]) continue;

    const entNum = fields[0].trim();
    const altName = fields[3].trim().replace(/"/g, "");

    if (!map.has(entNum)) map.set(entNum, []);
    map.get(entNum)!.push(altName);
  }

  return map;
}

function parseAddCSV(csv: string): Map<string, SanctionsEntry["addresses"]> {
  const map = new Map<string, SanctionsEntry["addresses"]>();
  const lines = csv.split("\n");

  for (const line of lines) {
    const fields = parseCSVLine(line);
    if (fields.length < 6 || !fields[0]) continue;

    const entNum = fields[0].trim();
    const address: SanctionsEntry["addresses"][0] = {
      address: fields[2]?.trim().replace(/"/g, "") || undefined,
      city: fields[3]?.trim().replace(/"/g, "") || undefined,
      stateOrProvince: fields[4]?.trim().replace(/"/g, "") || undefined,
      country: fields[5]?.trim().replace(/"/g, "") || undefined,
      postalCode: fields[6]?.trim().replace(/"/g, "") || undefined,
    };

    if (!map.has(entNum)) map.set(entNum, []);
    map.get(entNum)!.push(address);
  }

  return map;
}

function mapSDNType(sdnType: string): EntityType {
  const lower = sdnType.toLowerCase();
  if (lower.includes("individual")) return "individual";
  if (lower.includes("vessel")) return "vessel";
  if (lower.includes("aircraft")) return "aircraft";
  if (lower.includes("entity") || lower === "") return "organization";
  return "other";
}

/** Simple CSV line parser that handles quoted fields with commas */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "SanctionShield/1.0 (Compliance Screening)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}
