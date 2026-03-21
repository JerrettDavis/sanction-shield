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
    expect(calculateConfidence("BANCO NACIONAL DE CUBA", "BANCO NACIONAL DE CUBA")).toBe(100);
  });

  it("returns high confidence for close match", () => {
    const score = calculateConfidence("BANCO NACIONAL DE CUBA", "BANCO NACIONAL DE CUBA S.A.");
    expect(score).toBeGreaterThan(75);
  });

  it("returns low confidence for unrelated names", () => {
    const score = calculateConfidence("Acme Corporation", "John Smith");
    expect(score).toBeLessThan(30);
  });

  it("checks aliases for better match", () => {
    const score = calculateConfidence("BNC", "BANCO NACIONAL DE CUBA", ["BNC", "NATIONAL BANK OF CUBA"]);
    expect(score).toBe(100);
  });

  it("handles case insensitivity", () => {
    const score = calculateConfidence("banco nacional de cuba", "BANCO NACIONAL DE CUBA");
    expect(score).toBe(100);
  });
});
