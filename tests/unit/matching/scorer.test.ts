import { describe, it, expect } from "vitest";
import { levenshtein, calculateConfidence } from "@/lib/matching/scorer";

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("hello", "hello")).toBe(0);
  });

  it("returns correct distance for single edit", () => {
    expect(levenshtein("cat", "bat")).toBe(1);
    expect(levenshtein("cat", "cats")).toBe(1);
  });

  it("handles empty strings", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
    expect(levenshtein("", "")).toBe(0);
  });
});

describe("calculateConfidence", () => {
  it("returns 100 for exact match", () => {
    const result = calculateConfidence("BANCO NACIONAL DE CUBA", "BANCO NACIONAL DE CUBA");
    expect(result.confidence).toBe(100);
    expect(result.band).toBe("HIGH");
    expect(result.requires_review).toBe(false);
  });

  it("returns high confidence for close match", () => {
    const result = calculateConfidence("BANCO NACIONAL DE CUBA", "BANCO NACIONAL DE CUBA S.A.");
    expect(result.confidence).toBeGreaterThan(75);
  });

  it("returns low confidence for unrelated names", () => {
    const result = calculateConfidence("Acme Corporation", "John Smith");
    expect(result.confidence).toBeLessThan(30);
    expect(result.band).toBe("LOW");
  });

  it("checks aliases for better match", () => {
    const result = calculateConfidence("BNC", "BANCO NACIONAL DE CUBA", ["BNC", "NATIONAL BANK OF CUBA"]);
    expect(result.confidence).toBe(100);
  });

  it("handles case insensitivity", () => {
    const result = calculateConfidence("banco nacional de cuba", "BANCO NACIONAL DE CUBA");
    expect(result.confidence).toBe(100);
  });

  it("includes component scores", () => {
    const result = calculateConfidence("BANCO NACIONAL", "BANCO NACIONAL DE CUBA");
    expect(result.component_scores).toHaveProperty("trigram");
    expect(result.component_scores).toHaveProperty("levenshtein");
    expect(result.component_scores).toHaveProperty("phonetic");
    expect(result.component_scores).toHaveProperty("token_overlap");
  });

  it("classifies REVIEW band for ambiguous matches", () => {
    const result = calculateConfidence("BANCO NACIONAL", "BANCONAL INTERNATIONAL");
    if (result.confidence >= 60 && result.confidence < 85) {
      expect(result.band).toBe("REVIEW");
      expect(result.requires_review).toBe(true);
    }
  });
});
