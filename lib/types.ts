// ============================================================
// MAPS LEAD HUNTER — Tipos Compartilhados
// ============================================================

// Import de tipo apenas: some na compilação, então o ciclo
// types ↔ intelligence não existe em runtime.
import type { BusinessProfile } from "./intelligence/buildBusinessProfile";
import type { PreviewBlueprint } from "./intelligence/buildPreviewBlueprint";

export type { BusinessProfile, PreviewBlueprint };

export type UrlStatus =
  | "NO_SITE"
  | "REDIRECTS_TO_WHATSAPP"
  | "REDIRECTS_TO_SOCIAL"
  | "SITE_OFFLINE"
  | "WEBSITE_BROKEN"
  /**
   * Servidor no ar, mas recusando robô (403/429). NÃO é oportunidade:
   * abordar esse lead dizendo que o site caiu queima a credibilidade.
   */
  | "SITE_PROTECTED"
  | "VALID_SITE";

export interface UrlAnalysisResult {
  status: UrlStatus;
  finalUrl?: string;
  statusCode?: number;
  error?: string;
}

export interface Lead {
  id: string;
  title: string;
  phone: string;
  /** Phone in E.164 international format, e.g. +5511999998888 */
  phoneE164?: string;
  address: string;
  neighborhood?: string;
  city: string;
  rating: number;
  reviewsCount: number;
  category: string;
  secondaryCategory?: string;
  originalWebsite?: string;
  analyzedStatus: UrlStatus;
  analyzedAt: string;
  /** Real photos extracted from Google Maps (lh3.googleusercontent.com URLs) */
  photos?: string[];
  /** Opening hours per day e.g. { "Seg-Sex": "9h–18h", "Sáb": "9h–13h" } */
  openingHours?: Record<string, string>;
  /** Whether the business is currently open */
  isOpenNow?: boolean;
  /** Logo extracted from the business website (if available) */
  logoUrl?: string;
  /** Onde o logo foi encontrado — ver LogoSource em lib/crawler/logoFinder */
  logoSource?: string;
  /** SVG (data URI) traçado a partir de um logo bitmap pequeno */
  logoVectorUrl?: string;
  /** O arquivo do logo tem fundo transparente */
  logoHasAlpha?: boolean;
  /** Luminância do desenho do logo, 0–1 */
  logoLuminance?: number;
  /** Proporção do desenho do logo (largura/altura, já aparado) */
  logoAspect?: number;
  /**
   * Cores reais da marca descobertas pela IA. Alimentam o buildDesignKit,
   * que só cai na paleta do nicho quando isto vem vazio.
   */
  brandColors?: {
    /** Cor dominante dos pixels do logo — sinal mais forte de identidade */
    logoDominant?: string;
    /** theme-color / --primary declarados no site */
    primary?: string;
    secondary?: string;
    /** Cor dominante das fotos da empresa (Maps / Instagram) */
    photoDominant?: string;
  };
  /** Luminância média das fotos, 0–1 — define hero claro ou escuro */
  photoLuminance?: number;
  /** Família tipográfica detectada no site da empresa */
  brandTypography?: string;
  /** @handle do Instagram da empresa */
  instagramHandle?: string;
  /** Slug da página no Facebook */
  facebookHandle?: string;
  /**
   * Número de WhatsApp que a empresa publicou especificamente para contato
   * (link wa.me do Maps, botão do site, bio do Instagram/Facebook) — pode
   * ser diferente do `phone` geral quando esse é uma linha fixa sem WhatsApp.
   * Ver lib/crawler/whatsappFinder.ts.
   */
  whatsappNumber?: string;
  whatsappE164?: string;
  /** De onde veio o número — transparência para quem vai abordar o lead */
  whatsappSource?: string;

  // ── Contexto de descoberta ────────────────────────────────────────────────
  /** Termo que o usuário pesquisou — desempata categoria ambígua do Maps */
  searchedNiche?: string;
  /** Categoria crua atribuída pelo Google Maps */
  googleCategory?: string;
  /** Categoria normalizada (minúscula, sem acento) para comparação */
  normalizedCategory?: string;

  // ── Inteligência (calculada, cacheável) ───────────────────────────────────
  /** Quem é este negócio, segundo as evidências */
  businessProfile?: BusinessProfile;
  /** Plano da página derivado do perfil */
  previewBlueprint?: PreviewBlueprint;
}

export type FilterType =
  | "ALL"
  | "NO_SITE"
  | "REDIRECTS_TO_WHATSAPP"
  | "REDIRECTS_TO_SOCIAL"
  | "SITE_OFFLINE"
  | "WEBSITE_BROKEN"
  | "SITE_PROTECTED"
  | "VALID_SITE";

export interface ScanRequest {
  niche: string;
  city: string;
}

export interface ScanResponse {
  leads: Lead[];
  total: number;
  scannedAt: string;
}

// ============================================================
// AI Deep Research Agent Payload
// ============================================================

export interface Testimonial {
  quote: string;
  author: string;
  rating?: number;
  source: "google" | "instagram" | "tripadvisor" | "web" | "unknown";
}

export interface GallerySection {
  venue: string[];
  products: string[];
  team: string[];
  misc: string[];
}

export interface LogoCandidateInfo {
  url: string;
  source: string;
  width?: number;
  height?: number;
  format?: string;
}

export interface BrandIdentity {
  /** Direct URLs to logo images (PNG, SVG, high-res JPG) */
  logoUrls: string[];
  /** Melhor logo do ranking — é este que vai para o preview */
  bestLogoUrl?: string;
  /** Fonte do melhor logo (site, instagram, favicon...) */
  bestLogoSource?: string;
  /** Todos os candidatos validados, do melhor para o pior */
  logoCandidates?: LogoCandidateInfo[];
  /** Cor dominante extraída dos pixels do logo */
  logoDominantColor?: string;
  /** Cor dominante das fotos da empresa */
  photoDominantColor?: string;
  /** Luminância média das fotos, 0–1 */
  photoLuminance?: number;
  /** @handle do Instagram encontrado */
  instagramHandle?: string;
  /** Slug da página do Facebook encontrada */
  facebookHandle?: string;
  /** Número de WhatsApp publicado pela empresa (não o telefone genérico) */
  whatsappNumber?: string;
  whatsappE164?: string;
  whatsappSource?: string;
  /** SVG (data URI) gerado a partir de um logo bitmap pequeno */
  logoVectorUrl?: string;
  /** O arquivo do logo tem fundo transparente */
  logoHasAlpha?: boolean;
  /** Luminância do desenho do logo, 0–1 */
  logoLuminance?: number;
  /** Proporção do desenho do logo */
  logoAspect?: number;
  /** Primary brand color in HEX, e.g. "#3b82f6" */
  primaryColor?: string;
  /** Secondary brand color in HEX */
  secondaryColor?: string;
  /** Brand vibe/tone inferred from visual and copy style */
  brandVibe: string;
  /** Detected font family from CSS */
  typography?: string;
}

/** Resumo do sistema visual escolhido para esta empresa */
export interface DesignBrief {
  archetypeId: string;
  archetypeLabel: string;
  layout: string;
  headingFont: string;
  bodyFont: string;
  primary: string;
  accent: string;
  /** "logo" | "site" | "niche" — de onde saiu a cor primária */
  colorSource: string;
}

export interface CopywritingSeed {
  /** One-sentence value proposition */
  valueProp: string;
  /** 3 hero headline ideas */
  heroHeadlineIdeas: string[];
  /** Main customer pain points this business solves */
  painPointsSolved: string[];
  /** FAQ items for the website */
  faqItems: { q: string; a: string }[];
  /** Services / products offered */
  services: string[];
}

export interface SocialProof {
  googleRating: number;
  reviewCount: number;
  topReviews: string[];
  /** URLs or snippets of external mentions (blogs, news, directories) */
  mentions: string[];
}

export interface OperationalDetails {
  services: string[];
  priceRange?: string;
  differentiators: string[];
  staffDetails?: string;
}

export interface DeepResearchPayload {
  brand_identity: BrandIdentity;
  /** Quem é este negócio, segundo as evidências coletadas */
  business_profile?: BusinessProfile;
  /** Plano da página derivado do perfil */
  preview_blueprint?: PreviewBlueprint;
  /** Sistema visual derivado da marca + nicho (lib/design/kit.ts) */
  design_brief: DesignBrief;
  gallery: GallerySection;
  testimonials: Testimonial[];
  copywriting_seed: CopywritingSeed;
  social_proof: SocialProof;
  operational: OperationalDetails;
  /** Raw enriched prompt for feeding into an AI to build the landing page */
  prompt: string;
  metadata: {
    crawledAt: string;
    sourcesVisited: string[];
    confidence: "high" | "medium" | "low";
  };
}
