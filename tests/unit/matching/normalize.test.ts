import { describe, it, expect } from "vitest";
import { normalizeName, normalizeOrgName, phoneticEncode, tokenizeName } from "@/lib/matching/normalize";

describe("normalizeName", () => {
  it("lowercases input", () => {
    expect(normalizeName("BANCO NACIONAL")).toBe("banco nacional");
  });

  it("strips diacritics", () => {
    expect(normalizeName("Jose Garcia Lopez")).toBe("jose garcia lopez");
    expect(normalizeName("Muller")).toBe("muller");
  });

  it("collapses whitespace", () => {
    expect(normalizeName("  John   Smith  ")).toBe("john smith");
  });

  it("removes punctuation except hyphens", () => {
    expect(normalizeName("Al-Qaeda (AQ)")).toBe("al-qaeda aq");
  });

  it("handles empty string", () => {
    expect(normalizeName("")).toBe("");
  });
});

describe("normalizeOrgName", () => {
  it("removes business suffixes", () => {
    expect(normalizeOrgName("Acme Corp Ltd")).toBe("acme");
    expect(normalizeOrgName("Banco Nacional de Cuba")).toBe("banco nacional cuba");
  });

  it("preserves name if all words are suffixes", () => {
    expect(normalizeOrgName("The Company")).not.toBe("");
  });
});

describe("phoneticEncode", () => {
  it("produces same encoding for phonetically similar names", () => {
    expect(phoneticEncode("Smith")).toBe(phoneticEncode("Smyth"));
  });

  it("produces different encoding for different names", () => {
    expect(phoneticEncode("Smith")).not.toBe(phoneticEncode("Jones"));
  });
});

describe("tokenizeName", () => {
  it("splits on whitespace", () => {
    expect(tokenizeName("John Smith")).toEqual(["john", "smith"]);
  });

  it("handles LASTNAME, FIRSTNAME format", () => {
    const tokens = tokenizeName("SMITH, John Michael");
    expect(tokens).toContain("john");
    expect(tokens).toContain("michael");
    expect(tokens).toContain("smith");
  });

  it("filters single-char tokens", () => {
    expect(tokenizeName("A B John")).toEqual(["john"]);
  });
});
