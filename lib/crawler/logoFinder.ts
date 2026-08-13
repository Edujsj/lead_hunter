// ============================================================
// Logo Finder — descobre o logo real da marca em várias fontes,
// valida o arquivo e escolhe o melhor candidato.
// ------------------------------------------------------------
// Ordem de confiança:
//   1. <img> marcado como logo no site oficial
//   2. apple-touch-icon / favicon grande do domínio
//   3. avatar do Instagram (quando a empresa só tem rede social)
//   4. serviços de ícone por domínio (unavatar / DDG / Google)
//   5. busca de imagem por "<nome> logo" (último recurso)
// Cada candidato só entra no ranking depois de baixado e medido —
// favicon 16x16 e placeholder genérico são descartados aqui.
// ============================================================

export type LogoSource =
  | "site-logo-img"
  | "manifest-icon"
  | "instagram-profile"
  | "facebook-profile"
  | "apple-touch-icon"
  | "site-favicon"
  | "well-known-path"
  | "instagram-avatar"
  | "unavatar"
  | "ddg-icon"
  | "google-favicon"
  | "image-search";

export interface LogoCandidate {
  url: string;
  source: LogoSource;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface LogoResult {
  url?: string;
  source?: LogoSource;
  width?: number;
  height?: number;
  /** Todos os candidatos válidos, do melhor para o pior */
  candidates: LogoCandidate[];
}

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
}

const BASE_SCORE: Record<LogoSource, number> = {
  "site-logo-img": 100,
  // Ícone do web manifest costuma ser o PNG 512px que a empresa exportou
  "manifest-icon": 92,
  // Foto de perfil da rede social é a logo para quem só tem rede social
  "instagram-profile": 88,
  "instagram-avatar": 85,
  "facebook-profile": 84,
  "apple-touch-icon": 80,
  "site-favicon": 70,
  "well-known-path": 58,
  unavatar: 60,
  "ddg-icon": 45,
  "google-favicon": 40,
  "image-search": 30,
};

/** Caminhos que quase todo site publica sem declarar em lugar nenhum */
const WELL_KNOWN_PATHS = [
  "/logo.svg",
  "/logo.png",
  "/img/logo.png",
  "/images/logo.png",
  "/assets/logo.png",
  "/wp-content/uploads/logo.png",
];

const JUNK_PATTERNS = [
  "placeholder",
  "default-avatar",
  "no-image",
  "noimage",
  "sprite",
  "1x1",
  "pixel.gif",
  "blank.",
  "spacer",
];

// ─── URL helpers ──────────────────────────────────────────────────────────────

/** Domínio nu (sem www) de uma URL; null se não for http(s) válido */
export function extractDomain(url?: string | null): string | null {
  if (!url) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const host = new URL(withProtocol).hostname.toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** Handle do Instagram a partir de instagram.com/<handle> */
export function instagramHandle(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (!match) return null;
  const handle = match[1].replace(/\/$/, "");
  if (!handle || ["p", "reel", "explore", "accounts"].includes(handle.toLowerCase())) {
    return null;
  }
  return handle;
}

const SOCIAL_HOSTS = [
  "instagram.com",
  "facebook.com",
  "wa.me",
  "whatsapp.com",
  "linktr.ee",
  "beacons.ai",
  "linkedin.com",
  "youtube.com",
  "tiktok.com",
];

export function isSocialUrl(url?: string | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return SOCIAL_HOSTS.some((host) => lower.includes(host));
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Nota final do candidato. Vetor pesa mais que bitmap (escala sem serrilhar),
 * imagem pequena demais é praticamente inútil num header.
 */
export function scoreLogoCandidate(candidate: LogoCandidate): number {
  let score = BASE_SCORE[candidate.source] ?? 0;
  const lower = candidate.url.toLowerCase();

  if (JUNK_PATTERNS.some((p) => lower.includes(p))) score -= 60;

  const format = candidate.format ?? "";
  if (format === "svg") score += 25;
  else if (format === "png" || format === "webp") score += 10;
  else if (format === "ico") score -= 10;

  const size = Math.max(candidate.width ?? 0, candidate.height ?? 0);
  if (format === "svg") score += 15;
  else if (size >= 256) score += 20;
  else if (size >= 128) score += 10;
  else if (size > 0 && size < 48) score -= 45;

  // Proporção maluca (faixa longa) raramente é logo utilizável no header
  if (candidate.width && candidate.height) {
    const ratio = candidate.width / candidate.height;
    if (ratio > 6 || ratio < 1 / 6) score -= 25;
  }

  return score;
}

export function rankLogoCandidates(candidates: LogoCandidate[]): LogoCandidate[] {
  return [...candidates].sort(
    (a, b) => scoreLogoCandidate(b) - scoreLogoCandidate(a)
  );
}

// ─── Leitura de dimensões sem dependência externa ─────────────────────────────

/**
 * Lê largura/altura direto do cabeçalho do arquivo.
 * Suporta PNG, JPEG, GIF, WebP, ICO e SVG. Devolve null se não reconhecer —
 * o candidato então entra no ranking sem bônus de tamanho.
 */
export function imageSizeFromBuffer(buffer: Uint8Array): ImageInfo | null {
  if (buffer.length < 16) return null;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // PNG: 89 50 4E 47 — IHDR começa no byte 16
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return {
      width: view.getUint32(16, false),
      height: view.getUint32(20, false),
      format: "png",
    };
  }

  // GIF87a / GIF89a — little endian nos bytes 6..9
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return {
      width: view.getUint16(6, true),
      height: view.getUint16(8, true),
      format: "gif",
    };
  }

  // ICO: 00 00 01 00 — dimensão 0 significa 256
  if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
    return {
      width: buffer[6] === 0 ? 256 : buffer[6],
      height: buffer[7] === 0 ? 256 : buffer[7],
      format: "ico",
    };
  }

  // WebP: "RIFF"..."WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    const chunk = String.fromCharCode(buffer[12], buffer[13], buffer[14], buffer[15]);
    if (chunk === "VP8X" && buffer.length >= 30) {
      const w = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
      const h = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
      return { width: w, height: h, format: "webp" };
    }
    if (chunk === "VP8 " && buffer.length >= 30) {
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
        format: "webp",
      };
    }
    return { width: 0, height: 0, format: "webp" };
  }

  // JPEG: percorre os marcadores até um SOFn
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      const isSof =
        marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isSof) {
        return {
          height: view.getUint16(offset + 5, false),
          width: view.getUint16(offset + 7, false),
          format: "jpeg",
        };
      }
      offset += 2 + view.getUint16(offset + 2, false);
    }
    return { width: 0, height: 0, format: "jpeg" };
  }

  // SVG: texto — tenta width/height, cai para o viewBox
  const head = new TextDecoder().decode(buffer.slice(0, 512));
  if (head.includes("<svg")) {
    const w = head.match(/\bwidth=["']([\d.]+)/);
    const h = head.match(/\bheight=["']([\d.]+)/);
    if (w && h) {
      return { width: Math.round(Number(w[1])), height: Math.round(Number(h[1])), format: "svg" };
    }
    const vb = head.match(/viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/);
    if (vb) {
      return { width: Math.round(Number(vb[1])), height: Math.round(Number(vb[2])), format: "svg" };
    }
    return { width: 0, height: 0, format: "svg" };
  }

  return null;
}

// ─── Montagem dos candidatos ──────────────────────────────────────────────────

export interface SiteAssets {
  /** URLs vindas do scrape do site oficial (brandExtractor) */
  logoUrls?: string[];
  appleTouchIcons?: string[];
  favicons?: string[];
  /** Ícones declarados no web app manifest */
  manifestIcons?: string[];
  /** Foto de perfil do Instagram da empresa */
  instagramProfilePic?: string;
  /** Avatares vindos das redes sociais descobertas (socialFinder) */
  instagramAvatars?: string[];
  facebookAvatars?: string[];
}

export interface LogoLookupInput {
  title: string;
  city?: string;
  originalWebsite?: string;
}

/**
 * Lista de URLs a testar, já deduplicada e sem `data:`.
 * Não faz rede — separado para poder ser testado sozinho.
 */
export function buildLogoCandidates(
  lead: LogoLookupInput,
  assets: SiteAssets = {}
): LogoCandidate[] {
  const candidates: LogoCandidate[] = [];
  const seen = new Set<string>();

  const push = (url: string | undefined, source: LogoSource) => {
    if (!url) return;
    const clean = url.trim();
    if (!clean || clean.startsWith("data:") || !/^https?:\/\//i.test(clean)) return;
    if (seen.has(clean)) return;
    seen.add(clean);
    candidates.push({ url: clean, source });
  };

  assets.logoUrls?.forEach((u) => push(u, "site-logo-img"));
  assets.manifestIcons?.forEach((u) => push(u, "manifest-icon"));
  push(assets.instagramProfilePic, "instagram-profile");
  assets.instagramAvatars?.forEach((u) => push(u, "instagram-avatar"));
  assets.facebookAvatars?.forEach((u) => push(u, "facebook-profile"));
  assets.appleTouchIcons?.forEach((u) => push(u, "apple-touch-icon"));
  assets.favicons?.forEach((u) => push(u, "site-favicon"));

  const handle = instagramHandle(lead.originalWebsite);
  if (handle) {
    push(`https://unavatar.io/instagram/${handle}`, "instagram-avatar");
  }

  const domain = isSocialUrl(lead.originalWebsite)
    ? null
    : extractDomain(lead.originalWebsite);

  if (domain) {
    WELL_KNOWN_PATHS.forEach((path) =>
      push(`https://${domain}${path}`, "well-known-path")
    );
    push(`https://unavatar.io/${domain}?fallback=false`, "unavatar");
    push(`https://icons.duckduckgo.com/ip3/${domain}.ico`, "ddg-icon");
    push(
      `https://www.google.com/s2/favicons?sz=256&domain_url=https://${domain}`,
      "google-favicon"
    );
  }

  return candidates;
}

// ─── Validação por rede ───────────────────────────────────────────────────────

export type FetchLike = typeof fetch;

export interface ValidationOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  /** Menor lado aceitável para bitmaps */
  minSize?: number;
}

/**
 * Baixa o candidato e mede. Devolve null quando não é imagem, é pequeno
 * demais ou a requisição falha — assim o ranking só vê logo utilizável.
 */
export async function validateLogoCandidate(
  candidate: LogoCandidate,
  options: ValidationOptions = {}
): Promise<LogoCandidate | null> {
  const doFetch = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 6000;
  const minSize = options.minSize ?? 48;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await doFetch(candidate.url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType && !contentType.startsWith("image/")) return null;

    const buffer = new Uint8Array(await res.arrayBuffer());
    const info = imageSizeFromBuffer(buffer);

    // Cabeçalho irreconhecível só passa se o payload tiver peso de imagem
    // de verdade — resposta vazia e pixel de rastreamento caem aqui.
    if (!info && buffer.length < 1024) return null;

    // SVG escala, então dimensão declarada não importa; bitmap pequeno
    // ficaria borrado no header do site.
    if (info && info.format !== "svg" && info.width > 0) {
      if (Math.min(info.width, info.height) < minSize) return null;
    }

    return {
      ...candidate,
      bytes: buffer.length,
      width: info?.width,
      height: info?.height,
      format: info?.format,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Roda a busca completa: monta candidatos, valida em paralelo e devolve
 * o melhor. `candidates` traz os demais válidos para exibição no modal da IA.
 */
export async function findBestLogo(
  lead: LogoLookupInput,
  assets: SiteAssets = {},
  options: ValidationOptions = {}
): Promise<LogoResult> {
  const raw = buildLogoCandidates(lead, assets);
  if (raw.length === 0) return { candidates: [] };

  const settled = await Promise.all(
    raw.map((c) => validateLogoCandidate(c, options).catch(() => null))
  );

  const valid = settled.filter((c): c is LogoCandidate => c !== null);
  if (valid.length === 0) return { candidates: [] };

  const ranked = rankLogoCandidates(valid);
  const best = ranked[0];

  return {
    url: best.url,
    source: best.source,
    width: best.width,
    height: best.height,
    candidates: ranked,
  };
}
