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
export type ConfidenceBand = "HIGH" | "REVIEW" | "LOW";

export interface ConfidenceResult {
  confidence: number;
  band: ConfidenceBand;
  requires_review: boolean;
  component_scores: {
    trigram: number;
    levenshtein: number;
    phonetic: number;
    token_overlap: number;
  };
}

export function classifyBand(score: number): ConfidenceBand {
  if (score >= 85) return "HIGH";
  if (score >= 60) return "REVIEW";
  return "LOW";
}

export function calculateConfidence(
  queryName: string,
  entryName: string,
  entryAliases: string[] = []
): ConfidenceResult {
  const qNorm = normalizeName(queryName);
  const eNorm = normalizeName(entryName);

  // Check all names (primary + aliases), take highest score
  const allNames = [eNorm, ...entryAliases.map(normalizeName)];
  let bestResult = scorePair(qNorm, allNames[0]);

  for (let i = 1; i < allNames.length; i++) {
    const result = scorePair(qNorm, allNames[i]);
    if (result.total > bestResult.total) bestResult = result;
  }

  const confidence = Math.min(100, Math.round(bestResult.total));
  const band = classifyBand(confidence);

  return {
    confidence,
    band,
    requires_review: band === "REVIEW",
    component_scores: {
      trigram: Math.round(bestResult.trigram),
      levenshtein: Math.round(bestResult.levenshtein),
      phonetic: Math.round(bestResult.phonetic),
      token_overlap: Math.round(bestResult.tokenOverlap),
    },
  };
}

interface PairScore {
  total: number;
  trigram: number;
  levenshtein: number;
  phonetic: number;
  tokenOverlap: number;
}

function scorePair(query: string, candidate: string): PairScore {
  // Exact match
  if (query === candidate) return { total: 100, trigram: 40, levenshtein: 30, phonetic: 15, tokenOverlap: 15 };

  // Trigram similarity (weight: 40%)
  const trigram = trigramSimilarity(query, candidate) * 40;

  // Levenshtein similarity (weight: 30%)
  const maxLen = Math.max(query.length, candidate.length);
  const levDist = levenshtein(query, candidate);
  const lev = maxLen > 0 ? ((maxLen - levDist) / maxLen) * 30 : 0;

  // Phonetic match bonus (weight: 15%)
  const qPhon = phoneticEncode(query);
  const cPhon = phoneticEncode(candidate);
  const phon = qPhon === cPhon ? 15 : (trigramSimilarity(qPhon, cPhon) * 15);

  // Token overlap bonus (weight: 15%) — filter short tokens per Jarvis QA
  const qTokens = new Set(tokenizeName(query).filter(t => t.length >= 3));
  const cTokens = new Set(tokenizeName(candidate).filter(t => t.length >= 3));
  const intersection = [...qTokens].filter(t => cTokens.has(t)).length;
  const union = new Set([...qTokens, ...cTokens]).size;
  // Exact token bonus: if any token matches exactly, add 5 points
  const exactTokenBonus = intersection > 0 ? 5 : 0;
  const tokenOvl = union > 0 ? (intersection / union) * 15 + exactTokenBonus : 0;

  return { total: trigram + lev + phon + tokenOvl, trigram, levenshtein: lev, phonetic: phon, tokenOverlap: tokenOvl };
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
