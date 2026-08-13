// ============================================================
// Brand Extractor — Logo, Colors, Typography from Playwright Page
// ============================================================

import { Page } from "playwright";
import type { SiteAssets } from "./logoFinder";

export interface BrandAssets extends SiteAssets {
  /** Compatibilidade: união de logoUrls + apple-touch + favicons */
  logoUrls: string[];
  primaryColor?: string;
  secondaryColor?: string;
  typography?: string;
  /** Links de redes sociais achados no site — de onde sai o handle do IG */
  socialLinks: string[];
}

export interface LogoSourceSet {
  logoUrls: string[];
  appleTouchIcons: string[];
  favicons: string[];
  /** href do <link rel="manifest">, já absoluto */
  manifestHref?: string;
  socialLinks: string[];
}

/**
 * Coleta as URLs candidatas a logo, separadas por origem — a origem é o
 * sinal mais forte de qualidade, então quem ranqueia (logoFinder) precisa
 * dela. `<img>` marcado como logo vale muito mais que um favicon 16px.
 */
export async function extractLogoSources(
  page: Page,
  baseUrl: string
): Promise<LogoSourceSet> {
  const sources = await page.evaluate((base: string) => {
    const absolute = (value: string): string | null => {
      if (!value || value.startsWith("data:")) return null;
      try {
        return new URL(value, base).toString();
      } catch {
        return null;
      }
    };

    const logoImgs: string[] = [];
    const appleTouchIcons: string[] = [];
    const favicons: string[] = [];

    // <link rel="apple-touch-icon"> costuma ser 180x180 — bom logo quadrado
    document
      .querySelectorAll<HTMLLinkElement>('link[rel*="apple-touch-icon"]')
      .forEach((el) => {
        const url = absolute(el.getAttribute("href") || "");
        if (url) appleTouchIcons.push(url);
      });

    document
      .querySelectorAll<HTMLLinkElement>('link[rel*="icon"]')
      .forEach((el) => {
        if ((el.getAttribute("rel") || "").includes("apple")) return;
        const url = absolute(el.getAttribute("href") || "");
        if (url) favicons.push(url);
      });

    // <meta property="og:logo"> quando existe é explicitamente o logo
    const ogLogo = document.querySelector<HTMLMetaElement>(
      'meta[property="og:logo"], meta[itemprop="logo"]'
    );
    if (ogLogo?.content) {
      const url = absolute(ogLogo.content);
      if (url) logoImgs.push(url);
    }

    // JSON-LD Organization.logo — dado estruturado, alta confiança
    document
      .querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')
      .forEach((script) => {
        try {
          const data = JSON.parse(script.textContent || "{}");
          const entries = Array.isArray(data) ? data : [data];
          for (const entry of entries) {
            const logo = entry?.logo?.url ?? entry?.logo;
            if (typeof logo === "string") {
              const url = absolute(logo);
              if (url) logoImgs.push(url);
            }
          }
        } catch {
          // JSON-LD inválido — ignora
        }
      });

    // <img> com pistas de logo em alt/class/id/src
    document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      const src = img.getAttribute("src") || img.currentSrc || "";
      const hint = `${img.alt} ${img.className} ${img.id} ${src}`.toLowerCase();
      if (!/logo|marca|brand/.test(hint)) return;
      const url = absolute(src);
      if (url) logoImgs.push(url);
    });

    // Web app manifest: os ícones dele são os maiores que a empresa exportou
    const manifestEl = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const manifestHref = manifestEl
      ? absolute(manifestEl.getAttribute("href") || "") ?? undefined
      : undefined;

    // Links de redes sociais — o handle do Instagram sai daqui
    const socialLinks: string[] = [];
    document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (/instagram\.com|facebook\.com|tiktok\.com/i.test(href)) {
        const url = absolute(href);
        if (url) socialLinks.push(url);
      }
    });

    const dedupe = (list: string[]) => Array.from(new Set(list)).slice(0, 5);

    return {
      logoUrls: dedupe(logoImgs),
      appleTouchIcons: dedupe(appleTouchIcons),
      favicons: dedupe(favicons),
      manifestHref,
      socialLinks: dedupe(socialLinks),
    };
  }, baseUrl);

  return sources;
}

/**
 * Baixa o web app manifest e devolve os ícones do maior para o menor.
 * `sizes` vem como "512x512" — ordenar por ele evita escolher o 48px.
 */
export async function fetchManifestIcons(
  manifestUrl: string,
  timeoutMs = 6000
): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(manifestUrl, { signal: controller.signal });
    if (!res.ok) return [];

    const manifest = (await res.json()) as {
      icons?: { src?: string; sizes?: string }[];
    };
    if (!Array.isArray(manifest.icons)) return [];

    const parseSize = (sizes?: string): number => {
      if (!sizes) return 0;
      return Math.max(
        0,
        ...sizes.split(/\s+/).map((s) => parseInt(s.split("x")[0], 10) || 0)
      );
    };

    return manifest.icons
      .filter((icon) => icon.src)
      .sort((a, b) => parseSize(b.sizes) - parseSize(a.sizes))
      .map((icon) => {
        try {
          return new URL(icon.src as string, manifestUrl).toString();
        } catch {
          return "";
        }
      })
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extracts dominant/brand colors from CSS custom properties and meta theme-color.
 * Returns primary and secondary color in HEX if found.
 */
export async function extractBrandColors(
  page: Page
): Promise<{ primaryColor?: string; secondaryColor?: string }> {
  const colors = await page.evaluate((): { primary?: string; secondary?: string } => {
    const result: { primary?: string; secondary?: string } = {};

    // 1. <meta name="theme-color"> — the most reliable signal
    const themeMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (themeMeta?.content) {
      result.primary = themeMeta.content.trim();
    }

    // 2. CSS custom properties on :root
    const rootStyles = getComputedStyle(document.documentElement);
    const colorVarNames = [
      "--primary",
      "--primary-color",
      "--brand-color",
      "--color-primary",
      "--accent",
      "--main-color",
      "--theme-color",
    ];
    const secondaryVarNames = [
      "--secondary",
      "--secondary-color",
      "--color-secondary",
      "--accent-secondary",
    ];

    if (!result.primary) {
      for (const varName of colorVarNames) {
        const val = rootStyles.getPropertyValue(varName).trim();
        if (val && val.length >= 4) {
          result.primary = val;
          break;
        }
      }
    }

    for (const varName of secondaryVarNames) {
      const val = rootStyles.getPropertyValue(varName).trim();
      if (val && val.length >= 4) {
        result.secondary = val;
        break;
      }
    }

    // 3. Fallback: inspect the primary button or header background color
    if (!result.primary) {
      const btn =
        document.querySelector<HTMLElement>("button.primary, .btn-primary, .cta") ||
        document.querySelector<HTMLElement>("header");
      if (btn) {
        const bg = getComputedStyle(btn).backgroundColor;
        // Convert "rgb(r,g,b)" to HEX
        const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          const toHex = (n: number) => n.toString(16).padStart(2, "0");
          const [, r, g, b] = match;
          const hex = `#${toHex(Number(r))}${toHex(Number(g))}${toHex(Number(b))}`;
          // Avoid pure black/white/transparent
          if (hex !== "#000000" && hex !== "#ffffff" && hex !== "#00000000") {
            result.primary = hex;
          }
        }
      }
    }

    return result;
  });

  return {
    primaryColor: colors.primary,
    secondaryColor: colors.secondary,
  };
}

/**
 * Detects the primary font family used on the page by reading the body's
 * computed font-family CSS property.
 */
export async function extractTypographyHints(
  page: Page
): Promise<string | undefined> {
  const font = await page.evaluate((): string | undefined => {
    const body = document.querySelector("body");
    if (!body) return undefined;
    const ff = getComputedStyle(body).fontFamily;
    if (!ff) return undefined;

    // Take the first family name, strip quotes
    const first = ff.split(",")[0].replace(/['"]/g, "").trim();
    // Ignore pure generic families
    if (["serif", "sans-serif", "monospace", "cursive"].includes(first.toLowerCase())) {
      return undefined;
    }
    return first;
  });
  return font || undefined;
}

/**
 * Cor dominante dos pixels do logo.
 *
 * A imagem entra na página como data: URI (baixada no Node) — carregar a URL
 * original tornaria o canvas "tainted" por CORS e `getImageData` lançaria.
 * Pixels quase-brancos, quase-pretos e transparentes são descartados: são o
 * fundo do logo, não a cor da marca.
 */
export interface ImageAnalysis {
  /** Cor dominante ponderada por saturação */
  dominant?: string;
  /** Luminância média 0–1 — decide se a arte é clara ou escura */
  luminance: number;
}

export async function analyzeImage(
  page: Page,
  dataUrl: string
): Promise<ImageAnalysis | undefined> {
  if (!dataUrl.startsWith("data:image/")) return undefined;

  try {
    const result = await page.evaluate(async (src: string): Promise<{
      hex: string | null;
      luminance: number;
    } | null> => {
      const img = new Image();
      img.src = src;
      try {
        await img.decode();
      } catch {
        return null;
      }

      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, size, size);

      let data: Uint8ClampedArray;
      try {
        data = ctx.getImageData(0, 0, size, size).data;
      } catch {
        return null;
      }

      const buckets = new Map<string, { count: number; r: number; g: number; b: number; sat: number }>();
      let lumSum = 0;
      let lumCount = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 200) continue;

        lumSum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        lumCount += 1;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const lightness = (max + min) / 2 / 255;
        const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));

        if (lightness > 0.94 || lightness < 0.06) continue; // fundo
        if (sat < 0.15) continue; // cinza

        const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
        const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0, sat: 0 };
        bucket.count += 1;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        bucket.sat += sat;
        buckets.set(key, bucket);
      }

      const luminance = lumCount > 0 ? lumSum / lumCount : 0.5;
      if (buckets.size === 0) return { hex: null, luminance };

      // Peso = frequência × saturação: um azul forte em 15% da área vence
      // um bege lavado que ocupa 40%.
      let best: { score: number; r: number; g: number; b: number } | null = null;
      for (const bucket of buckets.values()) {
        const avgSat = bucket.sat / bucket.count;
        const score = bucket.count * (0.5 + avgSat);
        if (!best || score > best.score) {
          best = {
            score,
            r: Math.round(bucket.r / bucket.count),
            g: Math.round(bucket.g / bucket.count),
            b: Math.round(bucket.b / bucket.count),
          };
        }
      }

      if (!best) return { hex: null, luminance };
      const toHex = (n: number) => n.toString(16).padStart(2, "0");
      return {
        hex: `#${toHex(best.r)}${toHex(best.g)}${toHex(best.b)}`,
        luminance,
      };
    }, dataUrl);

    if (!result) return undefined;
    return { dominant: result.hex ?? undefined, luminance: result.luminance };
  } catch {
    return undefined;
  }
}

export interface LogoAnalysis {
  /** Cor dominante dos pixels com tinta */
  dominant?: string;
  /** Luminância média do conteúdo (ignora o fundo transparente) */
  luminance: number;
  /** O arquivo tem transparência real */
  hasAlpha: boolean;
  /** Proporção do conteúdo depois de aparar as bordas vazias */
  aspect: number;
  /** Quantas cores distintas (quantizadas) — 1 ou 2 indica marca chapada */
  colorCount: number;
  /** Máscara binária do conteúdo, para vetorização */
  mask: { width: number; height: number; bits: number[] };
}

/**
 * Lê o logo a fundo: transparência, claro/escuro, proporção real do
 * desenho (sem a margem vazia do arquivo) e uma máscara para vetorizar.
 * É o que permite encaixar a logo no header sem ela sumir ou aparecer
 * dentro de um retângulo branco indesejado.
 */
export async function analyzeLogo(
  page: Page,
  dataUrl: string,
  resolution = 128
): Promise<LogoAnalysis | undefined> {
  if (!dataUrl.startsWith("data:image/")) return undefined;

  try {
    const result = await page.evaluate(
      async ([src, size]: [string, number]): Promise<LogoAnalysis | null> => {
        const img = new Image();
        img.src = src;
        try {
          await img.decode();
        } catch {
          return null;
        }

        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return null;

        // Preserva a proporção dentro do quadrado para a máscara não distorcer
        const scale = Math.min(size / img.width, size / img.height);
        const drawW = Math.max(1, Math.round(img.width * scale));
        const drawH = Math.max(1, Math.round(img.height * scale));
        const offsetX = Math.floor((size - drawW) / 2);
        const offsetY = Math.floor((size - drawH) / 2);
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        let data: Uint8ClampedArray;
        try {
          data = ctx.getImageData(0, 0, size, size).data;
        } catch {
          return null;
        }

        const bits: number[] = new Array(size * size).fill(0);
        const colors = new Set<string>();
        const buckets = new Map<string, { count: number; r: number; g: number; b: number; sat: number }>();

        let transparentPixels = 0;
        let lumSum = 0;
        let inkCount = 0;
        let minX = size, minY = size, maxX = -1, maxY = -1;

        // Cor do canto: se o arquivo é opaco, ela é o fundo do logo
        const cornerIndex = (offsetY * size + offsetX) * 4;
        const bg = {
          r: data[cornerIndex],
          g: data[cornerIndex + 1],
          b: data[cornerIndex + 2],
          a: data[cornerIndex + 3],
        };

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            const insideDraw =
              x >= offsetX && x < offsetX + drawW && y >= offsetY && y < offsetY + drawH;
            if (!insideDraw) continue;

            if (a < 32) {
              transparentPixels++;
              continue;
            }

            // Pixel igual ao fundo opaco também não é tinta
            const matchesBg =
              bg.a >= 32 &&
              Math.abs(r - bg.r) < 18 &&
              Math.abs(g - bg.g) < 18 &&
              Math.abs(b - bg.b) < 18;
            if (matchesBg) continue;

            bits[y * size + x] = 1;
            inkCount++;
            lumSum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;

            colors.add(`${r >> 5}-${g >> 5}-${b >> 5}`);

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
            const lightness = (max + min) / 2 / 255;
            if (lightness > 0.94 || lightness < 0.06 || sat < 0.15) continue;

            const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
            const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0, sat: 0 };
            bucket.count += 1;
            bucket.r += r;
            bucket.g += g;
            bucket.b += b;
            bucket.sat += sat;
            buckets.set(key, bucket);
          }
        }

        let dominant: string | undefined;
        let best: { score: number; r: number; g: number; b: number } | null = null;
        for (const bucket of buckets.values()) {
          const avgSat = bucket.sat / bucket.count;
          const score = bucket.count * (0.5 + avgSat);
          if (!best || score > best.score) {
            best = {
              score,
              r: Math.round(bucket.r / bucket.count),
              g: Math.round(bucket.g / bucket.count),
              b: Math.round(bucket.b / bucket.count),
            };
          }
        }
        if (best) {
          const toHex = (n: number) => n.toString(16).padStart(2, "0");
          dominant = `#${toHex(best.r)}${toHex(best.g)}${toHex(best.b)}`;
        }

        const contentW = maxX >= minX ? maxX - minX + 1 : drawW;
        const contentH = maxY >= minY ? maxY - minY + 1 : drawH;

        return {
          dominant,
          luminance: inkCount > 0 ? lumSum / inkCount : 0.5,
          hasAlpha: transparentPixels > drawW * drawH * 0.04,
          aspect: contentH > 0 ? contentW / contentH : 1,
          colorCount: colors.size,
          mask: { width: size, height: size, bits },
        };
      },
      [dataUrl, resolution] as [string, number]
    );

    return result ?? undefined;
  } catch {
    return undefined;
  }
}

/** Só a cor dominante — atalho para quem não liga para a luminância */
export async function extractDominantColor(
  page: Page,
  dataUrl: string
): Promise<string | undefined> {
  const analysis = await analyzeImage(page, dataUrl);
  return analysis?.dominant;
}

/** Baixa uma imagem e devolve como data: URI (limite de 2 MB) */
export async function fetchAsDataUrl(
  url: string,
  timeoutMs = 6000
): Promise<string | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) return undefined;

    const contentType = res.headers.get("content-type") ?? "image/png";
    if (!contentType.startsWith("image/")) return undefined;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 2_000_000) return undefined;

    return `data:${contentType.split(";")[0]};base64,${buffer.toString("base64")}`;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs all brand extraction in parallel and returns a combined BrandAssets object.
 */
export async function extractBrandAssets(
  page: Page,
  baseUrl: string
): Promise<BrandAssets> {
  const emptySources: LogoSourceSet = {
    logoUrls: [],
    appleTouchIcons: [],
    favicons: [],
    socialLinks: [],
  };
  const emptyColors: { primaryColor?: string; secondaryColor?: string } = {};

  const [sources, colors, typography] = await Promise.all([
    extractLogoSources(page, baseUrl).catch(() => emptySources),
    extractBrandColors(page).catch(() => emptyColors),
    extractTypographyHints(page).catch(() => undefined),
  ]);

  const manifestIcons = sources.manifestHref
    ? await fetchManifestIcons(sources.manifestHref).catch(() => [])
    : [];

  return {
    logoUrls: sources.logoUrls,
    appleTouchIcons: sources.appleTouchIcons,
    favicons: sources.favicons,
    manifestIcons,
    socialLinks: sources.socialLinks,
    primaryColor: colors.primaryColor,
    secondaryColor: colors.secondaryColor,
    typography,
  };
}
