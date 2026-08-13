// ============================================================
// Color primitives — parsing, contrast (WCAG 2.1) and derivation
// Puro e sem dependências: usado tanto no server (crawler) quanto
// no client (geração do preview).
// ============================================================

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

const HEX_SHORT = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_LONG = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})(?:[0-9a-f]{2})?$/i;
const RGB_FN = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i;
const HSL_FN = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i;
// Tailwind/shadcn guardam a cor em canais soltos: `--primary: 0 75% 15%`
const HSL_BARE = /^([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%$/;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/**
 * Aceita "#fff", "#ffffff", "#ffffffcc", "rgb(0 0 0)", "rgba(...)", "hsl(...)".
 * Devolve HEX normalizado em minúsculas ou null quando não reconhece.
 */
export function parseColor(input?: string | null): string | null {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;

  const short = value.match(HEX_SHORT);
  if (short) {
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
  }

  const long = value.match(HEX_LONG);
  if (long) return `#${long[1]}${long[2]}${long[3]}`.toLowerCase();

  const rgb = value.match(RGB_FN);
  if (rgb) {
    return rgbToHex({
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
    });
  }

  const hsl = value.match(HSL_FN) ?? value.match(HSL_BARE);
  if (hsl) {
    return hslToHex({
      h: Number(hsl[1]),
      s: Number(hsl[2]),
      l: Number(hsl[3]),
    });
  }

  return null;
}

export function hexToRgb(hex: string): Rgb {
  const normalized = parseColor(hex) ?? "#000000";
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;

  let rgb: [number, number, number];
  if (hn < 60) rgb = [c, x, 0];
  else if (hn < 120) rgb = [x, c, 0];
  else if (hn < 180) rgb = [0, c, x];
  else if (hn < 240) rgb = [0, x, c];
  else if (hn < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return rgbToHex({
    r: (rgb[0] + m) * 255,
    g: (rgb[1] + m) * 255,
    b: (rgb[2] + m) * 255,
  });
}

export function hexToHsl(hex: string): Hsl {
  return rgbToHsl(hexToRgb(hex));
}

/** Luminância relativa conforme WCAG 2.1 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Razão de contraste WCAG entre 1 e 21 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Preto ou branco — o que tiver maior contraste sobre `background` */
export function readableOn(background: string, dark = "#0f172a", light = "#ffffff"): string {
  return contrastRatio(background, dark) >= contrastRatio(background, light)
    ? dark
    : light;
}

export function isLight(hex: string): boolean {
  return relativeLuminance(hex) > 0.45;
}

/**
 * Cor "sem identidade": cinza, quase-preto ou quase-branco.
 * Serve para descartar cor extraída de logo monocromático — usá-la como
 * cor da marca produziria uma landing page cinza.
 */
export function isNeutral(hex: string, minSaturation = 12): boolean {
  const { s, l } = hexToHsl(hex);
  return s < minSaturation || l < 8 || l > 94;
}

export function withLightness(hex: string, l: number): string {
  const hsl = hexToHsl(hex);
  return hslToHex({ ...hsl, l: clamp(l, 0, 100) });
}

export function withSaturation(hex: string, s: number): string {
  const hsl = hexToHsl(hex);
  return hslToHex({ ...hsl, s: clamp(s, 0, 100) });
}

export function rotateHue(hex: string, degrees: number): string {
  const hsl = hexToHsl(hex);
  return hslToHex({ ...hsl, h: hsl.h + degrees });
}

export function lighten(hex: string, amount: number): string {
  const hsl = hexToHsl(hex);
  return hslToHex({ ...hsl, l: clamp(hsl.l + amount, 0, 100) });
}

export function darken(hex: string, amount: number): string {
  return lighten(hex, -amount);
}

/** Mistura linear no espaço RGB. `weight` 0 = a, 1 = b. */
export function mix(a: string, b: string, weight: number): string {
  const w = clamp(weight, 0, 1);
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * w,
    g: ca.g + (cb.g - ca.g) * w,
    b: ca.b + (cb.b - ca.b) * w,
  });
}

/**
 * Ajusta a luminosidade de `foreground` até atingir `minRatio` sobre
 * `background`, preservando matiz e saturação. Caminha para o lado que
 * já tem mais contraste e devolve preto/branco se nem assim alcançar.
 */
export function ensureContrast(
  foreground: string,
  background: string,
  minRatio = 4.5
): string {
  if (contrastRatio(foreground, background) >= minRatio) return foreground;

  const hsl = hexToHsl(foreground);
  const goDarker = isLight(background);
  const step = goDarker ? -2 : 2;

  let candidate = foreground;
  for (let l = hsl.l + step; l >= 0 && l <= 100; l += step) {
    candidate = hslToHex({ ...hsl, l });
    if (contrastRatio(candidate, background) >= minRatio) return candidate;
  }

  return goDarker ? "#000000" : "#ffffff";
}

/**
 * Versão da cor da marca utilizável como texto sobre fundo claro.
 * Amarelos e ciantes saturados falham 4.5:1 — aqui eles escurecem
 * mantendo o matiz da marca em vez de virarem cinza.
 */
export function asTextColor(brand: string, background = "#ffffff"): string {
  return ensureContrast(withSaturation(brand, Math.max(hexToHsl(brand).s, 45)), background, 4.5);
}
