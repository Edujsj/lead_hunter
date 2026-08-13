// ============================================================
// Social Finder — acha @instagram e página do Facebook da empresa
// ------------------------------------------------------------
// Feito para o caso mais comum da base: empresa SEM site. Aí a rede
// social é a única presença digital, e a foto de perfil é a logo.
// ============================================================

export interface SocialProfiles {
  instagram?: string;
  facebook?: string;
}

const IG_BLOCKLIST = [
  "p", "reel", "reels", "explore", "accounts", "stories", "direct",
  "about", "developer", "legal", "privacy", "terms", "help",
];

const FB_BLOCKLIST = [
  "pages", "profile.php", "sharer", "sharer.php", "login", "help",
  "policies", "privacy", "terms", "groups", "events", "watch",
  "marketplace", "photo", "photo.php", "permalink.php", "story.php",
  "people", "public", "search", "hashtag", "tr", "business",
];

/** @handle a partir de qualquer URL do Instagram */
export function instagramFromUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const match = url.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (!match) return undefined;
  const handle = match[1].replace(/\/$/, "");
  if (handle.length < 2 || IG_BLOCKLIST.includes(handle.toLowerCase())) return undefined;
  return handle;
}

/** Slug da página a partir de qualquer URL do Facebook */
export function facebookFromUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const match = url.match(/facebook\.com\/(?:pg\/)?([A-Za-z0-9._-]+)/i);
  if (!match) return undefined;
  const slug = match[1].replace(/\/$/, "");
  if (slug.length < 2 || FB_BLOCKLIST.includes(slug.toLowerCase())) return undefined;
  // Códigos de idioma no início da URL (facebook.com/pt-br/...)
  if (/^[a-z]{2}(-[a-z]{2})?$/i.test(slug)) return undefined;
  return slug;
}

/** Primeiro perfil válido de cada rede numa lista de URLs */
export function extractProfilesFromUrls(
  urls: (string | undefined | null)[]
): SocialProfiles {
  const profiles: SocialProfiles = {};
  for (const url of urls) {
    if (!profiles.instagram) profiles.instagram = instagramFromUrl(url);
    if (!profiles.facebook) profiles.facebook = facebookFromUrl(url);
    if (profiles.instagram && profiles.facebook) break;
  }
  return profiles;
}

/** URLs de resultado da página HTML do DuckDuckGo */
export function parseDuckDuckGoUrls(html: string): string[] {
  const urls: string[] = [];
  for (const match of html.matchAll(/href="([^"]*uddg=[^"]+)"/g)) {
    try {
      const encoded = match[1].split("uddg=")[1].split("&")[0];
      const decoded = decodeURIComponent(encoded);
      if (decoded.startsWith("http")) urls.push(decoded);
    } catch {
      // resultado malformado — ignora
    }
  }
  // Alguns resultados vêm como link direto, sem redirecionador
  for (const match of html.matchAll(/https:\/\/(?:www\.)?(?:instagram|facebook)\.com\/[A-Za-z0-9._-]+/g)) {
    urls.push(match[0]);
  }
  return Array.from(new Set(urls));
}

export type FetchLike = typeof fetch;

export interface SearchOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchHtml(
  url: string,
  options: SearchOptions
): Promise<{ html: string; status: number }> {
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  try {
    const res = await doFetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    if (!res.ok) return { html: "", status: res.status };
    return { html: await res.text(), status: res.status };
  } catch {
    return { html: "", status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Busca no DuckDuckGo.
 *
 * Depois de algumas requisições seguidas o DDG responde 202 com uma página
 * sem resultados em vez de 429 — `res.ok` continua verdadeiro e o silêncio
 * passa por "não achei nada". Detectamos pela ausência do redirecionador
 * `uddg=` e tentamos de novo depois de uma pausa.
 */
async function ddgSearch(query: string, options: SearchOptions): Promise<string[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { html, status } = await fetchHtml(url, options);
    const throttled = status === 202 || status === 429 || !html.includes("uddg=");

    if (!throttled) return parseDuckDuckGoUrls(html);
    if (attempt === 0) await sleep(1500);
  }

  return [];
}

/**
 * O Bing embrulha todo resultado em `bing.com/ck/a?...&u=a1<base64url>`.
 * Sem desfazer isso o HTML não tem nenhuma URL de destino aproveitável.
 */
export function parseBingUrls(html: string): string[] {
  const urls = new Set<string>();

  for (const match of html.matchAll(/u=a1([A-Za-z0-9_-]+)/g)) {
    try {
      const base64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
      const decoded =
        typeof Buffer !== "undefined"
          ? Buffer.from(base64, "base64").toString("utf8")
          : atob(base64);
      if (/^https?:\/\//.test(decoded)) urls.add(decoded);
    } catch {
      // segmento que não era base64 — ignora
    }
  }

  // Alguns blocos (perfis em destaque) aparecem sem o redirecionador
  for (const match of html.matchAll(
    /https:\/\/(?:www\.)?(?:instagram|facebook)\.com\/[A-Za-z0-9._-]+/g
  )) {
    urls.add(match[0]);
  }

  return Array.from(urls);
}

/** Plano B com outro buscador — limites de taxa independentes do DDG */
async function bingSearch(query: string, options: SearchOptions): Promise<string[]> {
  const { html } = await fetchHtml(
    `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=pt-br`,
    options
  );
  if (!html) return [];
  return parseBingUrls(html);
}

async function searchProfiles(
  queries: string[],
  options: SearchOptions
): Promise<string[]> {
  for (const query of queries) {
    const ddg = await ddgSearch(query, options);
    if (ddg.length > 0) return ddg;

    const bing = await bingSearch(query, options);
    if (bing.length > 0) return bing;
  }
  return [];
}

export interface SocialLookupInput {
  title: string;
  city?: string;
  category?: string;
  originalWebsite?: string;
}

/**
 * Procura os perfis. Primeiro nas URLs que já temos em mãos (site do Maps,
 * links do site, resultados da busca geral); só vai à rede se faltar algum.
 */
export async function findSocialProfiles(
  lead: SocialLookupInput,
  knownUrls: (string | undefined | null)[] = [],
  options: SearchOptions = {}
): Promise<SocialProfiles> {
  const found = extractProfilesFromUrls([lead.originalWebsite, ...knownUrls]);
  if (found.instagram && found.facebook) return found;

  const city = lead.city?.split(",")[0].trim() ?? "";

  // Uma busca só, cobrindo as duas redes: cada requisição extra aproxima o
  // buscador de limitar a taxa e devolver página vazia.
  const urls = await searchProfiles(
    [
      `"${lead.title}" ${city} instagram facebook`,
      `"${lead.title}" ${city} site:instagram.com`,
    ],
    options
  );

  const fromSearch = extractProfilesFromUrls(urls);
  found.instagram = found.instagram ?? fromSearch.instagram;
  found.facebook = found.facebook ?? fromSearch.facebook;

  return found;
}

/**
 * URLs de foto de perfil das redes. `unavatar` resolve os dois casos sem
 * token; o endpoint de imagem do Graph é o plano B para páginas públicas.
 */
export function socialAvatarUrls(profiles: SocialProfiles): {
  instagram: string[];
  facebook: string[];
} {
  return {
    instagram: profiles.instagram
      ? [`https://unavatar.io/instagram/${profiles.instagram}?fallback=false`]
      : [],
    facebook: profiles.facebook
      ? [
          `https://unavatar.io/facebook/${profiles.facebook}?fallback=false`,
          `https://graph.facebook.com/${profiles.facebook}/picture?type=large`,
        ]
      : [],
  };
}
