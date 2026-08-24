// ============================================================
// MÓDULO 1: Validador Avançado de URLs e Redirecionamentos
// ============================================================

import { UrlAnalysisResult, UrlStatus } from "./types";

// Domains considered "not a custom website" — redirecting to these = no real site
const WHATSAPP_PATTERNS = [
  /wa\.me\//i,
  /api\.whatsapp\.com\//i,
  /whatsapp\.com\/send/i,
];

// Social & link-aggregator patterns — treated as REDIRECTS_TO_SOCIAL
const SOCIAL_PATTERNS = [
  /instagram\.com\//i,
  /facebook\.com\//i,
  /fb\.com\//i,
  /tiktok\.com\//i,
  /twitter\.com\//i,
  /x\.com\//i,
  /linktr\.ee\//i,
  /beacons\.ai\//i,
  /bio\.site\//i,
  /campsite\.bio\//i,
  /msha\.ke\//i,
];

/**
 * Códigos que significam "o servidor me viu e me recusou", não "o site sumiu".
 * 401 fica de fora: área logada exposta na raiz é problema real do site.
 */
const BLOQUEIO_DE_ROBO = new Set([403, 429, 999]);

function isWhatsAppUrl(url: string): boolean {
  return WHATSAPP_PATTERNS.some((p) => p.test(url));
}

function isSocialUrl(url: string): boolean {
  return SOCIAL_PATTERNS.some((p) => p.test(url));
}

/**
 * Attempts a HEAD request first. Falls back to GET if HEAD returns 405 Method Not Allowed
 * or if HEAD fails with a network error (some servers reject HEAD entirely).
 */
async function fetchWithFallback(
  url: string,
  signal: AbortSignal
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal,
    });
    // Some servers respond 405 to HEAD — retry with GET
    if (response.status === 405) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal,
      });
    }
  } catch {
    // HEAD completely failed (e.g. CORS, server rejects HEAD) — try GET
    response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal,
    });
  }
  return response;
}

/**
 * Determines if an error is a network/DNS failure (WEBSITE_BROKEN)
 * vs. a server responding with 4xx/5xx (SITE_OFFLINE).
 */
function classifyNetworkError(err: unknown): UrlStatus {
  if (!(err instanceof Error)) return "WEBSITE_BROKEN";
  const msg = err.message.toLowerCase();

  // Abort/timeout
  if (msg.includes("abort") || msg.includes("timeout")) return "SITE_OFFLINE";

  // DNS / network failure
  if (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("enotfound") ||
    msg.includes("econnrefused") ||
    msg.includes("getaddrinfo") ||
    msg.includes("dns")
  ) {
    return "WEBSITE_BROKEN";
  }

  // SSL/TLS errors — treat as broken (likely domain parked or expired cert)
  if (msg.includes("ssl") || msg.includes("certificate") || msg.includes("tls")) {
    return "WEBSITE_BROKEN";
  }

  return "SITE_OFFLINE";
}

/**
 * Analyzes a URL by following redirects (HEAD first, then GET fallback).
 * Detects: no site, WhatsApp link, social/link-aggregator redirect,
 * broken domain (DNS/network), offline server (4xx/5xx), or valid site.
 */
export async function analyzeUrl(
  url?: string | null
): Promise<UrlAnalysisResult> {
  if (!url || url.trim() === "") {
    return { status: "NO_SITE" };
  }

  const rawUrl = url.trim();

  // ── Direct pattern check (no network call needed) ──────────────────────────
  if (isWhatsAppUrl(rawUrl)) {
    return { status: "REDIRECTS_TO_WHATSAPP", finalUrl: rawUrl };
  }
  if (isSocialUrl(rawUrl)) {
    return { status: "REDIRECTS_TO_SOCIAL", finalUrl: rawUrl };
  }

  // ── Normalize URL ───────────────────────────────────────────────────────────
  let targetUrl = rawUrl;
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const response = await fetchWithFallback(targetUrl, controller.signal);
    clearTimeout(timeoutId);

    const finalUrl = response.url || targetUrl;

    // ── Check if redirect landed on WhatsApp / social ───────────────────────
    if (isWhatsAppUrl(finalUrl)) {
      return {
        status: "REDIRECTS_TO_WHATSAPP",
        finalUrl,
        statusCode: response.status,
      };
    }
    if (isSocialUrl(finalUrl)) {
      return {
        status: "REDIRECTS_TO_SOCIAL",
        finalUrl,
        statusCode: response.status,
      };
    }

    // ── Bloqueio de robô ≠ site fora do ar ──────────────────────────────────
    // 403/429 (e o 999 do LinkedIn) vêm de WAF/anti-bot com o site no ar para
    // o cliente. Tratar como oportunidade gera abordagem falsa.
    if (BLOQUEIO_DE_ROBO.has(response.status)) {
      return {
        status: "SITE_PROTECTED",
        finalUrl,
        statusCode: response.status,
      };
    }

    // ── Demais erros HTTP → SITE_OFFLINE ────────────────────────────────────
    if (response.status >= 400) {
      return {
        status: "SITE_OFFLINE",
        finalUrl,
        statusCode: response.status,
      };
    }

    return { status: "VALID_SITE", finalUrl, statusCode: response.status };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const status = classifyNetworkError(err);
    const error =
      err instanceof Error
        ? status === "SITE_OFFLINE"
          ? "Timeout (>8s)"
          : err.message
        : "Unknown error";
    return { status, error };
  }
}
