import { normalizeName, phoneticEncode, tokenizeName } from "./normalize";

/**
 * Calculate Levenshtein distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score (0-100) between two names.
 * Uses weighted combination of:
 * - Trigram similarity (Jaccard index on character trigrams)
 * - Levenshtein-based similarity
 * - Phonetic match bonus
 * - Token overlap bonus
 */
export function calculateConfidence(
  queryName: string,
  entryName: string,
  entryAliases: string[] = []
): number {
  const qNorm = normalizeName(queryName);
  const eNorm = normalizeName(entryName);

  // Check all names (primary + aliases), take highest score
  const allNames = [eNorm, ...entryAliases.map(normalizeName)];
  let bestScore = 0;

  for (const candidate of allNames) {
    const score = scorePair(qNorm, candidate);
    if (score > bestScore) bestScore = score;
  }

  return Math.min(100, Math.round(bestScore));
}

function scorePair(query: string, candidate: string): number {
  // Exact match
  if (query === candidate) return 100;

  // Trigram similarity (weight: 40%)
  const trigramSim = trigramSimilarity(query, candidate) * 40;

  // Levenshtein similarity (weight: 30%)
  const maxLen = Math.max(query.length, candidate.length);
  const levDist = levenshtein(query, candidate);
  const levSim = maxLen > 0 ? ((maxLen - levDist) / maxLen) * 30 : 0;

  // Phonetic match bonus (weight: 15%)
  const qPhon = phoneticEncode(query);
  const cPhon = phoneticEncode(candidate);
  const phonSim = qPhon === cPhon ? 15 : (trigramSimilarity(qPhon, cPhon) * 15);

  // Token overlap bonus (weight: 15%)
  const qTokens = new Set(tokenizeName(query));
  const cTokens = new Set(tokenizeName(candidate));
  const intersection = [...qTokens].filter(t => cTokens.has(t)).length;
  const union = new Set([...qTokens, ...cTokens]).size;
  const tokenSim = union > 0 ? (intersection / union) * 15 : 0;

  return trigramSim + levSim + phonSim + tokenSim;
}

/**
 * Calculate trigram (3-gram) Jaccard similarity between two strings.
 * Returns 0-1 float.
 */
function trigramSimilarity(a: string, b: string): number {
  const trigramsA = getTrigrams(a);
  const trigramsB = getTrigrams(b);

  if (trigramsA.size === 0 && trigramsB.size === 0) return 1;
  if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

  let intersection = 0;
  for (const tg of trigramsA) {
    if (trigramsB.has(tg)) intersection++;
  }

  const union = trigramsA.size + trigramsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function getTrigrams(s: string): Set<string> {
  const padded = `  ${s} `;
  const trigrams = new Set<string>();
  for (let i = 0; i <= padded.length - 3; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }
  return trigrams;
}
