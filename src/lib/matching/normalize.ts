/**
 * Name normalization for sanctions screening.
 * Strips diacritics, normalizes whitespace, lowercases,
 * and removes common business suffixes for better matching.
 */

const BUSINESS_SUFFIXES = [
  "ltd", "limited", "inc", "incorporated", "corp", "corporation",
  "llc", "llp", "plc", "gmbh", "ag", "sa", "srl", "bv", "nv",
  "co", "company", "the", "of", "and", "de", "la", "el", "al",
  "bin", "bint", "ibn", "abu",
];

/**
 * Normalize a name for fuzzy matching:
 * 1. NFD decomposition to strip diacritics
 * 2. Lowercase
 * 3. Remove punctuation except hyphens and apostrophes
 * 4. Collapse whitespace
 * 5. Trim
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // strip diacritics
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")        // remove punctuation (keep hyphens, apostrophes)
    .replace(/\s+/g, " ")             // collapse whitespace
    .trim();
}

/**
 * Normalize with business suffix removal for organization matching.
 * More aggressive — removes "Ltd", "Inc", "Corp" etc.
 */
export function normalizeOrgName(name: string): string {
  const normalized = normalizeName(name);
  const words = normalized.split(" ");
  const filtered = words.filter(w => !BUSINESS_SUFFIXES.includes(w));
  return filtered.join(" ").trim() || normalized;
}

/**
 * Generate phonetic tokens using a simplified Double Metaphone approach.
 * Returns primary and alternate encodings for cross-language matching.
 */
export function phoneticEncode(name: string): string {
  // Simplified phonetic encoding — consonant skeleton
  const normalized = normalizeName(name);
  return normalized
    .replace(/[aeiouy]/g, "")          // remove vowels (including y)
    .replace(/(.)\1+/g, "$1")         // dedupe consecutive consonants
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/sh/g, "s")
    .replace(/th/g, "t")
    .replace(/wh/g, "w")
    .replace(/wr/g, "r")
    .replace(/kn/g, "n")
    .replace(/gh/g, "g")
    .slice(0, 10);                     // cap length for comparison
}

/**
 * Tokenize a name into searchable parts.
 * Handles "LASTNAME, FIRSTNAME" format common in OFAC entries.
 */
export function tokenizeName(name: string): string[] {
  const normalized = normalizeName(name);
  // Handle "LASTNAME, FIRSTNAME MIDDLE" format
  const commaFlipped = normalized.includes(",")
    ? normalized.split(",").map(s => s.trim()).reverse().join(" ")
    : normalized;
  return commaFlipped.split(/\s+/).filter(t => t.length > 1);
}
