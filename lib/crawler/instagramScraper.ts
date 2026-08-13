// ============================================================
// Instagram Scraper — foto de perfil (logo) + fotos dos posts
// ------------------------------------------------------------
// Para empresa local o Instagram costuma ser o único acervo visual
// que existe: a foto de perfil é a logo e o feed é a galeria.
// O HTML público do perfil ainda traz og:image e as URLs do CDN
// antes do modal de login — é daí que sai tudo aqui.
// ============================================================

import type { Page } from "playwright";

export interface InstagramProfile {
  handle: string;
  /** Foto de perfil — normalmente a logo da marca */
  profilePicUrl?: string;
  fullName?: string;
  bio?: string;
  /** Fotos do feed, em alta quando disponível */
  postImages: string[];
}

const IG_CDN = /https:\/\/[^"'\\\s]*(?:cdninstagram\.com|fbcdn\.net)\/[^"'\\\s]*/g;

const PROFILE_BLOCKLIST = [
  "p",
  "reel",
  "reels",
  "explore",
  "accounts",
  "stories",
  "direct",
  "about",
  "developer",
  "legal",
];

/** Handle a partir de uma URL de perfil do Instagram */
export function instagramHandleFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (!match) return null;
  const handle = match[1].replace(/\/$/, "");
  if (!handle || handle.length < 2) return null;
  if (PROFILE_BLOCKLIST.includes(handle.toLowerCase())) return null;
  return handle;
}

/**
 * Primeiro handle válido de uma lista de URLs (links do site, resultados
 * de busca, o próprio "site" do Google Maps).
 */
export function findInstagramHandle(urls: (string | undefined | null)[]): string | null {
  for (const url of urls) {
    const handle = instagramHandleFromUrl(url);
    if (handle) return handle;
  }
  return null;
}

/**
 * Distingue foto de feed de avatar/ícone da interface.
 * Miniaturas de conta sugerida vêm em s150x150 ou menor — abaixo de 320px
 * não serve nem para thumb de galeria.
 */
export function isFeedPhotoUrl(url: string): boolean {
  if (!/\.(jpg|jpeg|png|webp)/i.test(url)) return false;

  const size = url.match(/\/[sp](\d{2,4})x\d{2,4}\//);
  if (size && Number(size[1]) < 320) return false;

  return true;
}

/** Sobe a URL do CDN para a maior resolução disponível na mesma imagem */
export function upgradeInstagramImage(url: string): string {
  // O CDN serve variações por sufixo: s150x150, p320x320, e15/c0.
  return url.replace(/\/(s|p)\d+x\d+\//, "/").replace(/\?.*$/, "");
}

/**
 * Extrai o que der do HTML público do perfil.
 * Função pura — o HTML pode vir de `fetch` ou de `page.content()`.
 */
export function parseInstagramHtml(html: string): Omit<InstagramProfile, "handle"> {
  const result: Omit<InstagramProfile, "handle"> = { postImages: [] };
  if (!html) return result;

  const meta = (property: string): string | undefined => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`,
      "i"
    );
    const alt = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`,
      "i"
    );
    return html.match(re)?.[1] ?? html.match(alt)?.[1];
  };

  const ogImage = meta("og:image");
  if (ogImage) result.profilePicUrl = decodeHtmlEntities(ogImage);

  // JSON embutido costuma trazer a foto em resolução maior que a og:image
  const hd = html.match(/"profile_pic_url_hd"\s*:\s*"([^"]+)"/);
  const plain = html.match(/"profile_pic_url"\s*:\s*"([^"]+)"/);
  const fromJson = hd?.[1] ?? plain?.[1];
  if (fromJson) result.profilePicUrl = decodeJsonUrl(fromJson);

  const ogTitle = meta("og:title");
  if (ogTitle) {
    // "Nome da Empresa (@handle) • Fotos e vídeos do Instagram"
    result.fullName = decodeHtmlEntities(ogTitle).split("(@")[0].trim() || undefined;
  }

  const description = meta("og:description") ?? meta("description");
  if (description) result.bio = decodeHtmlEntities(description);

  // Fotos do feed: display_url no JSON e qualquer coisa do CDN no HTML
  const seen = new Set<string>();
  const push = (raw: string) => {
    const url = upgradeInstagramImage(decodeJsonUrl(raw));
    if (!url.startsWith("https://")) return;
    if (result.profilePicUrl && url === upgradeInstagramImage(result.profilePicUrl)) return;
    if (seen.has(url)) return;
    seen.add(url);
    result.postImages.push(url);
  };

  for (const match of html.matchAll(/"display_url"\s*:\s*"([^"]+)"/g)) push(match[1]);
  for (const match of html.matchAll(/"thumbnail_src"\s*:\s*"([^"]+)"/g)) push(match[1]);

  // Sem JSON (HTML já renderizado pelo browser) sobra varrer o CDN. O filtro
  // de tamanho evita trazer avatar de conta sugerida no lugar de foto do feed.
  if (result.postImages.length === 0) {
    for (const match of html.matchAll(IG_CDN)) {
      if (isFeedPhotoUrl(match[0])) push(match[0]);
    }
  }

  result.postImages = result.postImages.slice(0, 12);
  return result;
}

function decodeJsonUrl(value: string): string {
  return value.replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/\\"/g, '"');
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export type FetchLike = typeof fetch;

export interface ScrapeOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

/**
 * Busca o perfil sem browser. Rápido e suficiente na maioria dos casos;
 * quando o Instagram devolve só o shell de login, `postImages` vem vazio
 * e o chamador pode tentar o caminho com Playwright.
 */
export async function fetchInstagramProfile(
  handle: string,
  options: ScrapeOptions = {}
): Promise<InstagramProfile> {
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);

  try {
    const res = await doFetch(`https://www.instagram.com/${handle}/`, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });

    if (!res.ok) return { handle, postImages: [] };

    const html = await res.text();
    return { handle, ...parseInstagramHtml(html) };
  } catch {
    return { handle, postImages: [] };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Caminho com browser: carrega o perfil, rola um pouco para as imagens
 * entrarem no DOM e reaproveita o mesmo parser sobre o HTML renderizado.
 * O import de Playwright é só de tipo — some na compilação, então este
 * módulo continua carregável em ambiente sem o pacote instalado.
 */
export async function scrapeInstagramWithBrowser(
  page: Page,
  handle: string
): Promise<InstagramProfile> {
  try {
    await page.goto(`https://www.instagram.com/${handle}/`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.scrollBy(0, 1200));
    await page.waitForTimeout(1500);

    const html = await page.content();
    return { handle, ...parseInstagramHtml(html) };
  } catch {
    return { handle, postImages: [] };
  }
}
