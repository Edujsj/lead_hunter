// ============================================================
// Design Kit — resolve o sistema visual de UMA empresa
// ------------------------------------------------------------
// Entrada: arquétipo do nicho + o que a IA descobriu da marca real
//          (logo, cor dominante do logo, cores do site).
// Saída:  paleta com contraste garantido, tipografia, layout,
//         raios e gradientes prontos para o render do preview.
// ============================================================

import {
  asTextColor,
  contrastRatio,
  darken,
  ensureContrast,
  hexToHsl,
  isLight,
  isNeutral,
  lighten,
  mix,
  parseColor,
  readableOn,
  rotateHue,
  withLightness,
  withSaturation,
} from "./color";
import {
  LayoutVariant,
  NicheArchetype,
  NicheContent,
  ShapeStyle,
  resolveArchetype,
} from "./niches";
import { resolveDirection } from "./directions";

/** O que a IA (deep crawl) conseguiu descobrir da marca real */
export interface BrandSeed {
  logoUrl?: string;
  /** Cor dominante extraída dos pixels do logo */
  logoDominantColor?: string;
  /** Cor declarada pelo site (theme-color, --primary, etc.) */
  primaryColor?: string;
  secondaryColor?: string;
  /** Família tipográfica detectada no site da empresa */
  typography?: string;
  /** O arquivo do logo tem fundo transparente */
  logoHasAlpha?: boolean;
  /** Luminância do desenho do logo, 0–1 (claro ou escuro) */
  logoLuminance?: number;
  /** Proporção do desenho do logo depois de aparar as bordas */
  logoAspect?: number;
  /** Cor dominante das fotos da empresa (Maps / Instagram) */
  photoDominantColor?: string;
  /** Luminância média das fotos, 0–1 */
  photoLuminance?: number;
  /** Quantas fotos reais existem para montar hero e galeria */
  photoCount?: number;
}

/** Como as fotos da empresa são: escuras e noturnas ou claras e arejadas */
export type MediaMood = "dark" | "light" | "neutral" | "none";

export function classifyMediaMood(seed?: BrandSeed): MediaMood {
  if (!seed?.photoCount) return "none";
  const luminance = seed.photoLuminance;
  if (luminance === undefined) return "neutral";
  if (luminance < 0.4) return "dark";
  if (luminance > 0.62) return "light";
  return "neutral";
}

export interface ResolvedPalette {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  /** Fundo principal das seções claras */
  surface: string;
  /** Fundo alternado (faixas) */
  surfaceAlt: string;
  /** Fundo dos cards */
  card: string;
  text: string;
  textMuted: string;
  border: string;
  /** Cor da marca já ajustada para uso como texto sobre `surface` */
  brandText: string;
}

export interface DesignKit {
  archetypeId: string;
  archetypeLabel: string;
  mood: string;
  emoji: string;
  layout: LayoutVariant;
  shape: ShapeStyle;
  radius: { sm: string; md: string; lg: string; pill: string };
  palette: ResolvedPalette;
  fonts: {
    heading: string;
    body: string;
    serifHeading: boolean;
    headingStack: string;
    bodyStack: string;
    /** <link href> do Google Fonts com as duas famílias */
    googleHref: string;
  };
  gradients: { hero: string; cta: string };
  /** Escurecimento aplicado sobre a foto do hero */
  heroOverlay: string;
  motion: "subtle" | "standard";
  content: NicheContent;
  /** De onde veio a cor primária — usado no selo "identidade real" do preview */
  colorSource: "logo" | "site" | "photo" | "niche";
  /** Marca tem logo real (não placeholder tipográfico) */
  hasRealLogo: boolean;
  /** Como são as fotos da empresa — guia layout e força do overlay */
  mediaMood: MediaMood;
  /** Tamanho do logo em px por posição — logo real merece destaque */
  logoSizes: { nav: number; hero: number; footer: number };
  /** Como encaixar o logo sobre fundo colorido */
  logoFit: LogoFit;
}

export interface LogoFit {
  /**
   * `plain`: o logo vai direto sobre a cor da marca.
   * `chip`: entra numa pastilha clara — necessário quando o arquivo tem
   * fundo sólido ou quando o desenho é escuro demais para o header.
   */
  treatment: "plain" | "chip";
  /** Logo largo com o nome escrito dentro (não repetir o nome ao lado) */
  isWordmark: boolean;
  /** Proporção usada para calcular a largura máxima */
  aspect: number;
  /** Largura máxima sugerida em cada posição */
  maxWidth: { nav: number; hero: number; footer: number };
}

/**
 * Decide o encaixe do logo sobre o header colorido.
 *
 * Dois problemas quebram a página na prática: JPEG de logo vem com fundo
 * branco sólido (aparece um retângulo branco no meio da barra colorida) e
 * PNG com traço escuro some sobre fundo escuro. Nos dois casos a pastilha
 * clara resolve; fora deles ela só atrapalharia.
 */
export function needsLogoChip(seed: BrandSeed | undefined, background: string): boolean {
  if (!seed?.logoUrl) return false;

  // Sem transparência o arquivo carrega o próprio fundo — só a pastilha
  // faz esse retângulo parecer intencional.
  if (seed.logoHasAlpha === false) return true;

  if (seed.logoLuminance === undefined) return false;
  const backgroundIsDark = !isLight(background);
  const inkIsDark = seed.logoLuminance < 0.45;
  const inkIsLight = seed.logoLuminance > 0.72;

  return (backgroundIsDark && inkIsDark) || (!backgroundIsDark && inkIsLight);
}

export function resolveLogoFit(seed: BrandSeed | undefined, navBackground: string): LogoFit {
  const aspect = seed?.logoAspect && seed.logoAspect > 0 ? seed.logoAspect : 1;
  const isWordmark = aspect >= 2.2;
  const treatment: LogoFit["treatment"] = needsLogoChip(seed, navBackground)
    ? "chip"
    : "plain";

  const cap = (height: number) => Math.round(height * Math.max(aspect, 1) * 1.15);

  return {
    treatment,
    isWordmark,
    aspect,
    maxWidth: { nav: cap(52), hero: cap(112), footer: cap(44) },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Hash estável (djb2-ish) — mesma empresa gera sempre o mesmo layout */
export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash);
}

const RADII: Record<ShapeStyle, DesignKit["radius"]> = {
  sharp: { sm: "2px", md: "6px", lg: "10px", pill: "6px" },
  soft: { sm: "8px", md: "14px", lg: "22px", pill: "999px" },
  round: { sm: "14px", md: "22px", lg: "32px", pill: "999px" },
};

const GENERIC_STACK = {
  sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
};

export function googleFontsHref(families: string[]): string {
  const unique = Array.from(new Set(families.filter(Boolean)));
  if (unique.length === 0) return "";
  const params = unique
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700;800;900`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/**
 * Escolhe a cor da marca entre os sinais disponíveis.
 * Cor de logo ganha de cor de CSS: o logo é a identidade que o dono
 * reconhece; `--primary` costuma ser resquício do tema do template.
 */
export function pickBrandColor(seed?: BrandSeed): {
  color: string | null;
  source: "logo" | "site" | "photo" | "niche";
} {
  const fromLogo = parseColor(seed?.logoDominantColor);
  if (fromLogo && !isNeutral(fromLogo)) return { color: fromLogo, source: "logo" };

  const fromSite = parseColor(seed?.primaryColor);
  if (fromSite && !isNeutral(fromSite)) return { color: fromSite, source: "site" };

  // Sem logo e sem site sobra o acervo visual: a cor que domina as fotos
  // do lugar é o que o cliente reconhece como "a cara" do negócio.
  const fromPhotos = parseColor(seed?.photoDominantColor);
  if (fromPhotos && !isNeutral(fromPhotos)) return { color: fromPhotos, source: "photo" };

  return { color: null, source: "niche" };
}

/**
 * Layout coerente com o acervo de imagens:
 * foto escura pede hero full-bleed com texto por cima; foto clara e
 * arejada rende mais em composição editorial. Sem foto, decide o hash
 * (mesma empresa, mesmo layout, sempre).
 */
export function pickLayout(
  layouts: LayoutVariant[],
  mood: MediaMood,
  hash: number
): LayoutVariant {
  if (mood === "dark" && layouts.includes("overlay")) return "overlay";
  if (mood === "light" && layouts.includes("editorial")) return "editorial";
  if (mood === "light" && layouts.includes("split")) return "split";
  return layouts[hash % layouts.length];
}

/**
 * Acento que não colide com a primária. Se o acento do nicho estiver a
 * menos de 40° de matiz da cor da marca, os dois viram "a mesma cor" na
 * tela e o CTA some — nesse caso giramos para o complementar.
 */
export function deriveAccent(primary: string, nicheAccent: string): string {
  const dp = Math.abs(hexToHsl(primary).h - hexToHsl(nicheAccent).h);
  const distance = Math.min(dp, 360 - dp);
  if (distance >= 40) return nicheAccent;

  // Complementar rebaixado: um ciano puro ao lado de um âmbar de marca
  // grita; escurecido vira um verde-petróleo que ainda destaca o CTA e
  // sustenta texto branco com folga.
  return withLightness(withSaturation(rotateHue(primary, 165), 62), 34);
}

function resolvePalette(
  archetype: NicheArchetype,
  seed: BrandSeed | undefined
): { palette: ResolvedPalette; source: "logo" | "site" | "photo" | "niche" } {
  const base = archetype.palette;
  const { color: brand, source } = pickBrandColor(seed);

  // Cor da marca precisa funcionar como fundo de botão com texto legível.
  const candidate = brand
    ? withLightness(brand, Math.min(Math.max(hexToHsl(brand).l, 26), 58))
    : base.primary;

  // Alguns azuis e ciantes ficam num meio-termo em que nem branco nem
  // quase-preto chegam a 4.5:1. Nesse caso quem cede é o fundo, não o texto:
  // escurecemos a primária preservando matiz até o par passar em AA.
  const firstChoice = readableOn(candidate);
  const primary =
    contrastRatio(firstChoice, candidate) >= 4.5
      ? candidate
      : ensureContrast(candidate, firstChoice, 4.5);
  const onPrimary = readableOn(primary);
  const accent = brand ? deriveAccent(primary, base.accent) : base.accent;

  // Academia usa fundo escuro como base do tema (não só no hero).
  const isDarkArchetype = archetype.id === "fitness";

  // Superfícies: mantêm a temperatura do nicho, puxadas na direção da marca.
  const surface = isDarkArchetype
    ? base.background
    : brand
      ? mix(base.background, withLightness(primary, 96), 0.65)
      : base.background;

  const surfaceAlt = isDarkArchetype
    ? lighten(base.background, 5)
    : brand
      ? mix(surface, withLightness(primary, 92), 0.6)
      : base.muted;

  const card = isDarkArchetype ? lighten(base.background, 8) : "#ffffff";
  const text = ensureContrast(base.foreground, surface, 7);
  const textMuted = ensureContrast(
    isDarkArchetype ? "#94a3b8" : mix(text, surface, 0.45),
    surface,
    4.5
  );
  const border = isDarkArchetype ? lighten(base.background, 12) : mix(surface, text, 0.12);

  return {
    palette: {
      primary,
      primaryDark: withLightness(primary, 26),
      primaryLight: withLightness(primary, 95),
      onPrimary,
      accent,
      onAccent: readableOn(accent),
      surface,
      surfaceAlt,
      card,
      text,
      textMuted,
      border,
      brandText: asTextColor(primary, card),
    },
    source,
  };
}

// ─── Export principal ─────────────────────────────────────────────────────────

export interface BuildKitInput {
  title: string;
  category: string;
  brand?: BrandSeed;
  /**
   * Direção visual vinda da taxonomia (`blueprint.theme.style`). Quando
   * presente, decide paleta, tipografia e forma no lugar do arquétipo de
   * categoria — é o que permite duas clínicas terem visuais distintos.
   */
  direction?: string;
}

export function buildDesignKit(input: BuildKitInput): DesignKit {
  const base = resolveArchetype(input.category);
  const estilo = resolveDirection(input.direction);

  // A direção sobrescreve só o visual; o conteúdo de fallback do arquétipo
  // permanece para leads que ainda não passaram pela camada de inteligência.
  const archetype: NicheArchetype = estilo
    ? {
        ...base,
        palette: estilo.palette,
        fonts: estilo.fonts,
        shape: estilo.shape,
        id: estilo.darkTheme ? "fitness" : base.id,
      }
    : base;
  const { palette, source } = resolvePalette(archetype, input.brand);
  const mediaMood = classifyMediaMood(input.brand);

  // Layout e forma variam por empresa dentro do que o nicho permite —
  // duas clínicas na mesma busca não saem com a mesma página.
  const hash = hashString(`${input.title}|${input.category}`);
  const layout = pickLayout(archetype.layouts, mediaMood, hash);

  const headingFont = archetype.fonts.heading;
  const bodyFont = archetype.fonts.body;
  const serif = Boolean(archetype.fonts.serifHeading);
  const hasRealLogo = Boolean(input.brand?.logoUrl);

  return {
    archetypeId: archetype.id,
    archetypeLabel: archetype.label,
    mood: archetype.mood,
    emoji: archetype.content.emoji,
    layout,
    shape: archetype.shape,
    radius: RADII[archetype.shape],
    palette,
    fonts: {
      heading: headingFont,
      body: bodyFont,
      serifHeading: serif,
      headingStack: `'${headingFont}', ${serif ? GENERIC_STACK.serif : GENERIC_STACK.sans}`,
      bodyStack: `'${bodyFont}', ${GENERIC_STACK.sans}`,
      googleHref: googleFontsHref([headingFont, bodyFont]),
    },
    gradients: {
      // O gradiente fica dentro da família da marca: o acento entra só
      // como um traço no fim. Primária e acento inteiros lado a lado
      // (roxo → verde, por exemplo) leem como arco-íris, não como marca.
      hero: `linear-gradient(135deg, ${palette.primaryDark} 0%, ${palette.primary} 60%, ${darken(mix(palette.primary, palette.accent, 0.3), 6)} 100%)`,
      cta: `linear-gradient(120deg, ${palette.primaryDark}, ${palette.primary})`,
    },
    heroOverlay: heroOverlayFor(layout, mediaMood),
    motion: archetype.id === "professional" || archetype.id === "health" ? "subtle" : "standard",
    content: archetype.content,
    colorSource: source,
    hasRealLogo,
    mediaMood,
    // Com logo real o header vira a assinatura da empresa; sem logo, o
    // lockup tipográfico fica discreto para não parecer erro.
    logoSizes: hasRealLogo
      ? { nav: 52, hero: layout === "editorial" ? 112 : 88, footer: 44 }
      : { nav: 38, hero: 72, footer: 32 },
    logoFit: resolveLogoFit(input.brand, palette.primary),
  };
}

/**
 * Foto escura já contrasta com texto branco — overlay pesado só suja a
 * imagem. Foto clara precisa de bem mais véu para o texto sobreviver.
 */
function heroOverlayFor(layout: LayoutVariant, mood: MediaMood): string {
  if (layout === "editorial") {
    return mood === "light"
      ? "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 55%)"
      : "linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.05) 60%)";
  }

  if (mood === "light") {
    return "linear-gradient(to right, rgba(0,0,0,0.88) 28%, rgba(0,0,0,0.45) 100%)";
  }
  if (mood === "dark") {
    return "linear-gradient(to right, rgba(0,0,0,0.72) 32%, rgba(0,0,0,0.15) 100%)";
  }
  return "linear-gradient(to right, rgba(0,0,0,0.82) 30%, rgba(0,0,0,0.28) 100%)";
}

/** Conveniência: relatório de contraste para os pares críticos do kit */
export function auditKitContrast(kit: DesignKit): Record<string, number> {
  const p = kit.palette;
  return {
    "text/surface": contrastRatio(p.text, p.surface),
    "textMuted/surface": contrastRatio(p.textMuted, p.surface),
    "onPrimary/primary": contrastRatio(p.onPrimary, p.primary),
    "onAccent/accent": contrastRatio(p.onAccent, p.accent),
    "brandText/card": contrastRatio(p.brandText, p.card),
  };
}
