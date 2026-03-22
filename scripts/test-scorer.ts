import { calculateConfidence } from "../src/lib/matching/scorer";

const tests = [
  ["SBERBANK", "PUBLIC JOINT STOCK COMPANY SBERBANK OF RUSSIA", [] as string[]],
  ["SBERBANK", "SBERBANK EUROPE AG", [] as string[]],
  ["VLADIMIR PUTIN", "PUTIN, Vladimir Vladimirovich", [] as string[]],
  ["BANCO NACIONAL DE CUBA", "BANCO NACIONAL DE CUBA", ["BNC", "NATIONAL BANK OF CUBA"]],
  // False positive checks
  ["ACME CORPORATION", "KANGEN MARITIME CORPORATION", [] as string[]],
  ["JOHN SMITH", "SMITH, John Michael", [] as string[]],
  ["MICROSOFT", "BRAVERY MARITIME CORPORATION", [] as string[]],
  ["TOYOTA", "TOYOTETSU CANADA INC.", [] as string[]],
] as const;

for (const [query, entry, aliases] of tests) {
  const r = calculateConfidence(query, entry, [...aliases]);
  console.log(`"${query}" vs "${entry}": ${r.confidence}% ${r.band} | ${JSON.stringify(r.component_scores)}`);
}
