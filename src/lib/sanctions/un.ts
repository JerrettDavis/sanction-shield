import type { SanctionsEntry, EntityType } from "./types";

// OFAC mirrors the UN consolidated list — more reliable than the UN's own endpoint
const UN_XML_URL = "https://sanctionslistservice.ofac.treas.gov/api/publicationpreview/exports/consolidated.xml";

/**
 * Download and parse the UN Security Council consolidated sanctions list.
 * Uses the OFAC-hosted mirror of the UN list (more reliable endpoint).
 * The XML format follows OFAC's SDN XML schema.
 */
export async function downloadAndParseUN(): Promise<SanctionsEntry[]> {
  const text = await fetchText(UN_XML_URL);
  return parseUNXML(text);
}

function parseUNXML(xml: string): SanctionsEntry[] {
  const entries: SanctionsEntry[] = [];

  // Simple XML parsing — extract sdnEntry blocks
  const entryRegex = /<sdnEntry>([\s\S]*?)<\/sdnEntry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];

    const uid = extractTag(block, "uid");
    const lastName = extractTag(block, "lastName");
    const firstName = extractTag(block, "firstName");
    const sdnType = extractTag(block, "sdnType");
    const remarks = extractTag(block, "remarks");

    if (!lastName) continue;

    const primaryName = firstName ? `${lastName}, ${firstName}` : lastName;

    // Extract programs
    const programs: string[] = [];
    const progRegex = /<program>(.*?)<\/program>/g;
    let progMatch;
    while ((progMatch = progRegex.exec(block)) !== null) {
      programs.push(progMatch[1].trim());
    }

    // Extract aliases
    const aliases: string[] = [];
    const aliasRegex = /<aka>([\s\S]*?)<\/aka>/g;
    let aliasMatch;
    while ((aliasMatch = aliasRegex.exec(block)) !== null) {
      const aliasBlock = aliasMatch[1];
      const aliasLast = extractTag(aliasBlock, "lastName");
      const aliasFirst = extractTag(aliasBlock, "firstName");
      if (aliasLast) {
        aliases.push(aliasFirst ? `${aliasLast}, ${aliasFirst}` : aliasLast);
      }
    }

    entries.push({
      externalId: uid || "",
      source: "un_security_council",
      entryType: mapUNType(sdnType),
      primaryName,
      aliases,
      programs,
      addresses: [],
      identification: [],
      remarks: remarks || undefined,
    });
  }

  return entries;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, "s");
  const match = regex.exec(xml);
  return match ? match[1].trim() : "";
}

function mapUNType(type: string): EntityType {
  const lower = (type || "").toLowerCase();
  if (lower.includes("individual")) return "individual";
  if (lower.includes("entity")) return "organization";
  if (lower.includes("vessel")) return "vessel";
  if (lower.includes("aircraft")) return "aircraft";
  return "other";
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "SanctionShield/1.0 (Compliance Screening)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Failed to fetch UN list: ${res.status}`);
  return res.text();
}
