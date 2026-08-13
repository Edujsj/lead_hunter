// ============================================================
// Unit Tests: urlAnalyzer.ts
// Uses vitest with mocked fetch to avoid real network calls
// ============================================================

import { describe, it, expect, vi, afterEach } from "vitest";

// We need to mock fetch before importing the module under test
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Dynamic import so the global fetch mock is in place before module executes
const { analyzeUrl } = await import("../lib/urlAnalyzer");

function makeMockResponse(
  status: number,
  finalUrl: string
): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    url: finalUrl,
    headers: new Headers(),
  } as unknown as Response;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("analyzeUrl — direct pattern matching (no network)", () => {
  it("returns NO_SITE for empty string", async () => {
    const result = await analyzeUrl("");
    expect(result.status).toBe("NO_SITE");
  });

  it("returns NO_SITE for null", async () => {
    const result = await analyzeUrl(null);
    expect(result.status).toBe("NO_SITE");
  });

  it("returns NO_SITE for whitespace", async () => {
    const result = await analyzeUrl("   ");
    expect(result.status).toBe("NO_SITE");
  });

  it("detects wa.me as REDIRECTS_TO_WHATSAPP without network call", async () => {
    const result = await analyzeUrl("https://wa.me/5511999998888");
    expect(result.status).toBe("REDIRECTS_TO_WHATSAPP");
    expect(result.finalUrl).toBe("https://wa.me/5511999998888");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("detects api.whatsapp.com as REDIRECTS_TO_WHATSAPP", async () => {
    const result = await analyzeUrl("https://api.whatsapp.com/send?phone=5511");
    expect(result.status).toBe("REDIRECTS_TO_WHATSAPP");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("detects instagram.com as REDIRECTS_TO_SOCIAL without network call", async () => {
    const result = await analyzeUrl("https://instagram.com/minha_empresa");
    expect(result.status).toBe("REDIRECTS_TO_SOCIAL");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("detects facebook.com as REDIRECTS_TO_SOCIAL", async () => {
    const result = await analyzeUrl("https://facebook.com/mybusiness");
    expect(result.status).toBe("REDIRECTS_TO_SOCIAL");
  });

  it("detects linktr.ee as REDIRECTS_TO_SOCIAL", async () => {
    const result = await analyzeUrl("https://linktr.ee/myprofile");
    expect(result.status).toBe("REDIRECTS_TO_SOCIAL");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("detects beacons.ai as REDIRECTS_TO_SOCIAL", async () => {
    const result = await analyzeUrl("https://beacons.ai/myprofile");
    expect(result.status).toBe("REDIRECTS_TO_SOCIAL");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("detects tiktok.com as REDIRECTS_TO_SOCIAL", async () => {
    const result = await analyzeUrl("https://tiktok.com/@user");
    expect(result.status).toBe("REDIRECTS_TO_SOCIAL");
  });
});

describe("analyzeUrl — network calls (mocked fetch)", () => {
  it("returns VALID_SITE for 200 response", async () => {
    mockFetch.mockResolvedValueOnce(
      makeMockResponse(200, "https://www.meusite.com.br/")
    );
    const result = await analyzeUrl("https://www.meusite.com.br");
    expect(result.status).toBe("VALID_SITE");
    expect(result.statusCode).toBe(200);
  });

  it("returns SITE_OFFLINE for 404 response", async () => {
    mockFetch.mockResolvedValueOnce(
      makeMockResponse(404, "https://www.morto.com.br/")
    );
    const result = await analyzeUrl("https://www.morto.com.br");
    expect(result.status).toBe("SITE_OFFLINE");
    expect(result.statusCode).toBe(404);
  });

  it("returns SITE_OFFLINE for 500 response", async () => {
    mockFetch.mockResolvedValueOnce(
      makeMockResponse(500, "https://broken.com/")
    );
    const result = await analyzeUrl("https://broken.com");
    expect(result.status).toBe("SITE_OFFLINE");
  });

  it("detects redirect to instagram.com as REDIRECTS_TO_SOCIAL", async () => {
    // HEAD follows redirect and lands on Instagram
    mockFetch.mockResolvedValueOnce(
      makeMockResponse(301, "https://instagram.com/business_page/")
    );
    const result = await analyzeUrl("https://shortlink.co/xyz");
    expect(result.status).toBe("REDIRECTS_TO_SOCIAL");
    expect(result.finalUrl).toContain("instagram.com");
  });

  it("detects redirect to wa.me as REDIRECTS_TO_WHATSAPP", async () => {
    mockFetch.mockResolvedValueOnce(
      makeMockResponse(301, "https://wa.me/551199998888")
    );
    const result = await analyzeUrl("https://linkme.com/whatsapp");
    expect(result.status).toBe("REDIRECTS_TO_WHATSAPP");
  });

  it("falls back to GET when HEAD returns 405", async () => {
    // First call (HEAD) returns 405
    mockFetch
      .mockResolvedValueOnce(makeMockResponse(405, "https://meusite.com.br/"))
      .mockResolvedValueOnce(makeMockResponse(200, "https://meusite.com.br/"));
    const result = await analyzeUrl("https://meusite.com.br");
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("VALID_SITE");
  });

  it("returns WEBSITE_BROKEN for DNS error", async () => {
    const err = new Error("getaddrinfo ENOTFOUND domain-does-not-exist.xyz");
    // Both HEAD and GET fallback should reject
    mockFetch.mockRejectedValueOnce(err).mockRejectedValueOnce(err);
    const result = await analyzeUrl("https://domain-does-not-exist.xyz");
    expect(result.status).toBe("WEBSITE_BROKEN");
  });

  it("returns WEBSITE_BROKEN for SSL certificate error", async () => {
    const err = new Error("SSL certificate problem: self signed certificate");
    // Both HEAD and GET fallback should reject
    mockFetch.mockRejectedValueOnce(err).mockRejectedValueOnce(err);
    const result = await analyzeUrl("https://badssl.example.com");
    expect(result.status).toBe("WEBSITE_BROKEN");
  });

  it("prepends https:// when scheme is missing", async () => {
    mockFetch.mockResolvedValueOnce(
      makeMockResponse(200, "https://www.semhttp.com.br/")
    );
    await analyzeUrl("www.semhttp.com.br");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.semhttp.com.br",
      expect.objectContaining({ method: "HEAD" })
    );
  });
});
