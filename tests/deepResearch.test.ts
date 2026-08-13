// ============================================================
// Integration Smoke Test: Deep Research Payload Shape
// Tests that the DeepResearchPayload structure is correctly typed
// and that a mocked run produces all required fields.
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Lead, DeepResearchPayload } from "../lib/types";

// ── Mock Playwright so we don't launch a real browser ─────────────────────────
vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      isConnected: () => true,
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(undefined),
          waitForTimeout: vi.fn().mockResolvedValue(undefined),
          evaluate: vi.fn().mockResolvedValue([]),
          close: vi.fn().mockResolvedValue(undefined),
          locator: vi.fn().mockReturnValue({
            first: vi.fn().mockReturnValue({
              getAttribute: vi.fn().mockResolvedValue(null),
              innerText: vi.fn().mockResolvedValue(""),
            }),
          }),
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// ── Mock fetch (DuckDuckGo search) ────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Import the module after mocks are set up ──────────────────────────────────
const { runDeepCrawl } = await import("../lib/crawler/deepCrawler");

// Sample lead fixture
const sampleLead: Lead = {
  id: "test-lead-001",
  title: "Clínica Dental Sorriso",
  phone: "(51) 3333-4444",
  address: "Rua das Flores, 123, Centro",
  city: "Porto Alegre",
  rating: 4.6,
  reviewsCount: 87,
  category: "Odontologia",
  analyzedStatus: "NO_SITE",
  analyzedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();

  // Default: DuckDuckGo returns empty HTML (no snippets)
  mockFetch.mockResolvedValue({
    ok: false,
    text: async () => "",
  });
});

describe("DeepResearchPayload structure", () => {
  it("returns an object with all required top-level keys", async () => {
    const result = await runDeepCrawl(sampleLead);

    // Top-level keys must exist
    expect(result).toHaveProperty("brand_identity");
    expect(result).toHaveProperty("gallery");
    expect(result).toHaveProperty("testimonials");
    expect(result).toHaveProperty("copywriting_seed");
    expect(result).toHaveProperty("social_proof");
    expect(result).toHaveProperty("operational");
    expect(result).toHaveProperty("prompt");
    expect(result).toHaveProperty("metadata");

    // Legacy backward-compat fields
    expect(result).toHaveProperty("texts");
    expect(result).toHaveProperty("images");
  });

  it("brand_identity has correct sub-fields", async () => {
    const result = await runDeepCrawl(sampleLead);
    expect(result.brand_identity).toHaveProperty("logoUrls");
    expect(result.brand_identity).toHaveProperty("brandVibe");
    expect(Array.isArray(result.brand_identity.logoUrls)).toBe(true);
    expect(typeof result.brand_identity.brandVibe).toBe("string");
    expect(result.brand_identity.brandVibe.length).toBeGreaterThan(0);
  });

  it("gallery has all four category arrays", async () => {
    const result = await runDeepCrawl(sampleLead);
    expect(Array.isArray(result.gallery.venue)).toBe(true);
    expect(Array.isArray(result.gallery.products)).toBe(true);
    expect(Array.isArray(result.gallery.team)).toBe(true);
    expect(Array.isArray(result.gallery.misc)).toBe(true);
  });

  it("testimonials is an array", async () => {
    const result = await runDeepCrawl(sampleLead);
    expect(Array.isArray(result.testimonials)).toBe(true);
  });

  it("copywriting_seed has all required fields", async () => {
    const result = await runDeepCrawl(sampleLead);
    expect(typeof result.copywriting_seed.valueProp).toBe("string");
    expect(result.copywriting_seed.valueProp.length).toBeGreaterThan(0);
    expect(Array.isArray(result.copywriting_seed.heroHeadlineIdeas)).toBe(true);
    expect(result.copywriting_seed.heroHeadlineIdeas.length).toBeGreaterThan(0);
    expect(Array.isArray(result.copywriting_seed.painPointsSolved)).toBe(true);
    expect(Array.isArray(result.copywriting_seed.faqItems)).toBe(true);
    expect(Array.isArray(result.copywriting_seed.services)).toBe(true);
  });

  it("faqItems have q and a fields", async () => {
    const result = await runDeepCrawl(sampleLead);
    for (const item of result.copywriting_seed.faqItems) {
      expect(item).toHaveProperty("q");
      expect(item).toHaveProperty("a");
      expect(typeof item.q).toBe("string");
      expect(typeof item.a).toBe("string");
    }
  });

  it("social_proof mirrors lead rating and reviewCount", async () => {
    const result = await runDeepCrawl(sampleLead);
    expect(result.social_proof.googleRating).toBe(sampleLead.rating);
    expect(result.social_proof.reviewCount).toBe(sampleLead.reviewsCount);
    expect(Array.isArray(result.social_proof.topReviews)).toBe(true);
    expect(Array.isArray(result.social_proof.mentions)).toBe(true);
  });

  it("metadata has crawledAt as a valid ISO date", async () => {
    const result = await runDeepCrawl(sampleLead);
    expect(result.metadata).toHaveProperty("crawledAt");
    expect(() => new Date(result.metadata.crawledAt)).not.toThrow();
    const date = new Date(result.metadata.crawledAt);
    expect(date.getFullYear()).toBeGreaterThanOrEqual(2024);
  });

  it("metadata.confidence is one of high/medium/low", async () => {
    const result = await runDeepCrawl(sampleLead);
    expect(["high", "medium", "low"]).toContain(result.metadata.confidence);
  });

  it("metadata.sourcesVisited is an array", async () => {
    const result = await runDeepCrawl(sampleLead);
    expect(Array.isArray(result.metadata.sourcesVisited)).toBe(true);
  });

  it("prompt is a non-empty string", async () => {
    const result = await runDeepCrawl(sampleLead);
    expect(typeof result.prompt).toBe("string");
    expect(result.prompt.length).toBeGreaterThan(50);
  });

  it("includes lead photos in gallery.venue when provided", async () => {
    const leadWithPhotos: Lead = {
      ...sampleLead,
      photos: [
        "https://lh3.googleusercontent.com/photo1",
        "https://lh3.googleusercontent.com/photo2",
      ],
    };
    const result = await runDeepCrawl(leadWithPhotos);
    expect(result.gallery.venue.length).toBeGreaterThanOrEqual(2);
    expect(result.images.length).toBeGreaterThanOrEqual(2);
  });

  it("infers correct brand vibe for dental category", async () => {
    const result = await runDeepCrawl(sampleLead);
    // "Odontologia" → "profissional, confiável, acolhedor"
    expect(result.brand_identity.brandVibe).toContain("profissional");
  });
});

describe("DeepResearchPayload type validation", () => {
  it("payload satisfies DeepResearchPayload interface (compile-time assertion)", async () => {
    const result = await runDeepCrawl(sampleLead);
    // TypeScript type assertion — if this assignment compiles, the shape is correct
    const typed: DeepResearchPayload = result;
    expect(typed).toBeDefined();
  });
});
