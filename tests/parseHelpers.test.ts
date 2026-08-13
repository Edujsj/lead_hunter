// ============================================================
// Unit Tests: parseHelpers.ts
// ============================================================

import { describe, it, expect } from "vitest";
import {
  cleanPhone,
  normalizePhone,
  parseRating,
  parseReviewCount,
  extractNeighborhood,
  parseOpeningHours,
  normalizeCityName,
  makeLeadId,
} from "../lib/crawler/parseHelpers";

describe("cleanPhone", () => {
  it("formats 11-digit mobile number with DDD", () => {
    expect(cleanPhone("51999998888")).toBe("(51) 99999-8888");
  });

  it("formats 10-digit landline number with DDD", () => {
    expect(cleanPhone("5133334444")).toBe("(51) 3333-4444");
  });

  it("strips country code +55", () => {
    expect(cleanPhone("+55 51 99999-8888")).toBe("(51) 99999-8888");
  });

  it("handles already-formatted number", () => {
    expect(cleanPhone("(51) 99999-8888")).toBe("(51) 99999-8888");
  });

  it("returns original string when parsing fails", () => {
    expect(cleanPhone("123")).toBe("123");
  });

  it("returns empty string for empty input", () => {
    expect(cleanPhone("")).toBe("");
  });
});

describe("normalizePhone", () => {
  it("converts formatted Brazilian mobile to E.164", () => {
    expect(normalizePhone("(51) 99999-8888")).toBe("+5551999998888");
  });

  it("converts formatted Brazilian landline to E.164", () => {
    // 10-digit local: 2 DDD + 8 number = 10 digits → +55 + 10 = 13 chars total
    expect(normalizePhone("(11) 3333-4444")).toBe("+551133334444");
  });

  it("handles string with country code already", () => {
    expect(normalizePhone("+55 51 99999-8888")).toBe("+5551999998888");
  });

  it("returns undefined for too-short number", () => {
    expect(normalizePhone("1234")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(normalizePhone("")).toBeUndefined();
  });
});

describe("parseRating", () => {
  it("parses comma-decimal rating", () => {
    expect(parseRating("4,5")).toBe(4.5);
  });

  it("parses dot-decimal rating", () => {
    expect(parseRating("3.8")).toBe(3.8);
  });

  it("clamps to 5 max", () => {
    expect(parseRating("5.9")).toBe(5);
  });

  it("clamps to 0 min", () => {
    expect(parseRating("-1")).toBe(0);
  });

  it("returns 0 for non-numeric string", () => {
    expect(parseRating("abc")).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(parseRating("")).toBe(0);
  });
});

describe("parseReviewCount", () => {
  it("parses plain number", () => {
    expect(parseReviewCount("234")).toBe(234);
  });

  it("parses number with dots (Brazilian thousands)", () => {
    expect(parseReviewCount("1.234")).toBe(1234);
  });

  it("parses Google Maps aria-label style", () => {
    expect(parseReviewCount("1.200 avaliações")).toBe(1200);
  });

  it("parses parenthesized number", () => {
    expect(parseReviewCount("(456)")).toBe(456);
  });

  it("returns 0 for empty string", () => {
    expect(parseReviewCount("")).toBe(0);
  });
});

describe("extractNeighborhood", () => {
  it("extracts neighborhood from typical Google Maps address", () => {
    const result = extractNeighborhood("Rua das Flores, 123, Centro, Porto Alegre, RS");
    expect(result).toBe("Centro");
  });

  it("returns undefined for address with no identifiable neighborhood", () => {
    const result = extractNeighborhood("Porto Alegre, RS");
    // Short 2-char UF won't match
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(extractNeighborhood("")).toBeUndefined();
  });

  it("skips purely numeric parts", () => {
    const result = extractNeighborhood("Av. Brasil, 999, Bela Vista, SP");
    expect(result).toBe("Bela Vista");
  });
});

describe("parseOpeningHours", () => {
  it("parses newline-separated colon format", () => {
    const result = parseOpeningHours("Segunda: 9:00–18:00\nTerça: 9:00–18:00");
    expect(result["Segunda"]).toBe("9:00–18:00");
    expect(result["Terça"]).toBe("9:00–18:00");
  });

  it("parses semicolon-separated format", () => {
    const result = parseOpeningHours("Seg-Sex: 8h–20h; Sáb: 8h–14h");
    expect(result["Seg-Sex"]).toBe("8h–20h");
    expect(result["Sáb"]).toBe("8h–14h");
  });

  it("returns empty object for empty string", () => {
    expect(parseOpeningHours("")).toEqual({});
  });
});

describe("normalizeCityName", () => {
  it("strips state abbreviation", () => {
    expect(normalizeCityName("Porto Alegre, RS")).toBe("Porto Alegre");
  });

  it("handles city without UF", () => {
    expect(normalizeCityName("São Paulo")).toBe("São Paulo");
  });
});

describe("makeLeadId", () => {
  it("generates a deterministic-looking ID with name and city", () => {
    const id = makeLeadId("Clínica Silva", "Porto Alegre");
    expect(id).toMatch(/^real-/);
    expect(id).toContain("silva");
    expect(id).toContain("porto");
  });
});
