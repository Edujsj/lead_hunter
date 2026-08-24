// ============================================================
// Direções visuais — o vocabulário de estilo do preview
// ------------------------------------------------------------
// Antes o visual saía do arquétipo de nicho (9 opções, conteúdo
// acoplado). Agora a taxonomia aponta uma DIREÇÃO e ela decide
// paleta, tipografia e forma. Duas clínicas podem ter direções
// diferentes; um restaurante e uma hamburgueria compartilham a
// família mas não a intensidade.
// ============================================================

import { NichePalette, NicheFonts, ShapeStyle } from "./niches";
import type { VisualDirection } from "@/lib/intelligence/taxonomy";

export interface DirectionStyle {
  palette: NichePalette;
  fonts: NicheFonts;
  shape: ShapeStyle;
  /** Fundo escuro como base do tema, não só no hero */
  darkTheme?: boolean;
}

/**
 * Paletas com contraste WCAG AA verificado (ver tests/designKit.test.ts).
 * Trocar um valor aqui exige rodar a auditoria de contraste de novo.
 */
export const DIRECTIONS: Record<VisualDirection, DirectionStyle> = {
  "medical-clean": {
    palette: {
      primary: "#0284c7", onPrimary: "#ffffff", secondary: "#0891b2",
      accent: "#16a34a", onAccent: "#ffffff",
      background: "#f6fafd", foreground: "#0f172a", muted: "#e2eef7",
    },
    fonts: { heading: "Figtree", body: "Noto Sans" },
    shape: "soft",
  },
  "medical-premium": {
    palette: {
      primary: "#0f766e", onPrimary: "#ffffff", secondary: "#14b8a6",
      accent: "#b45309", onAccent: "#ffffff",
      background: "#f5faf9", foreground: "#0f2e2b", muted: "#dbeeea",
    },
    fonts: { heading: "Playfair Display", body: "Inter", serifHeading: true },
    shape: "soft",
  },
  "dental-clean": {
    palette: {
      primary: "#0369a1", onPrimary: "#ffffff", secondary: "#38bdf8",
      accent: "#0d9488", onAccent: "#ffffff",
      background: "#f5fafe", foreground: "#0c2b45", muted: "#e0eefb",
    },
    fonts: { heading: "Figtree", body: "Noto Sans" },
    shape: "soft",
  },
  "beauty-luxury": {
    palette: {
      primary: "#7c2d4a", onPrimary: "#ffffff", secondary: "#be185d",
      accent: "#a16207", onAccent: "#ffffff",
      background: "#fdf7f9", foreground: "#3f1526", muted: "#f4e3ea",
    },
    fonts: { heading: "Playfair Display", body: "Inter", serifHeading: true },
    shape: "round",
  },
  "beauty-modern": {
    palette: {
      primary: "#be185d", onPrimary: "#ffffff", secondary: "#ec4899",
      accent: "#7c3aed", onAccent: "#ffffff",
      background: "#fdf4f8", foreground: "#4a0f2b", muted: "#f7dfeb",
    },
    fonts: { heading: "Outfit", body: "Inter" },
    shape: "round",
  },
  "food-editorial": {
    palette: {
      primary: "#9a3412", onPrimary: "#ffffff", secondary: "#ea580c",
      accent: "#166534", onAccent: "#ffffff",
      background: "#fdf8f4", foreground: "#3b1a0c", muted: "#f5e4d7",
    },
    fonts: { heading: "Playfair Display", body: "Karla", serifHeading: true },
    shape: "soft",
  },
  "food-bold": {
    palette: {
      primary: "#b91c1c", onPrimary: "#ffffff", secondary: "#ef4444",
      accent: "#a16207", onAccent: "#ffffff",
      background: "#fef6f4", foreground: "#450a0a", muted: "#fbe0da",
    },
    fonts: { heading: "Outfit", body: "Karla" },
    shape: "soft",
  },
  "real-estate-premium": {
    palette: {
      primary: "#1e293b", onPrimary: "#ffffff", secondary: "#475569",
      accent: "#a16207", onAccent: "#ffffff",
      background: "#f8fafc", foreground: "#0f172a", muted: "#e6eaef",
    },
    fonts: { heading: "Playfair Display", body: "Work Sans", serifHeading: true },
    shape: "sharp",
  },
  "legal-authority": {
    palette: {
      primary: "#14243d", onPrimary: "#ffffff", secondary: "#1e3a8a",
      accent: "#8a6516", onAccent: "#ffffff",
      background: "#f7f8fa", foreground: "#0b1524", muted: "#e3e7ee",
    },
    fonts: { heading: "IBM Plex Sans", body: "IBM Plex Sans" },
    shape: "sharp",
  },
  "corporate-clean": {
    palette: {
      primary: "#1e3a5f", onPrimary: "#ffffff", secondary: "#2563eb",
      accent: "#0f766e", onAccent: "#ffffff",
      background: "#f8fafc", foreground: "#0f172a", muted: "#e9eef5",
    },
    fonts: { heading: "Poppins", body: "Open Sans" },
    shape: "sharp",
  },
  "automotive-performance": {
    palette: {
      primary: "#18202b", onPrimary: "#ffffff", secondary: "#334155",
      accent: "#c2410c", onAccent: "#ffffff",
      background: "#f5f6f8", foreground: "#0f172a", muted: "#e2e5ea",
    },
    fonts: { heading: "Outfit", body: "Work Sans" },
    shape: "sharp",
  },
  "industrial-technical": {
    palette: {
      primary: "#334155", onPrimary: "#ffffff", secondary: "#475569",
      accent: "#0369a1", onAccent: "#ffffff",
      background: "#f6f7f9", foreground: "#0f172a", muted: "#e4e7ec",
    },
    fonts: { heading: "Work Sans", body: "Work Sans" },
    shape: "sharp",
  },
  "local-service-modern": {
    palette: {
      primary: "#1e3a5f", onPrimary: "#ffffff", secondary: "#2563eb",
      accent: "#b45309", onAccent: "#ffffff",
      background: "#f8fafc", foreground: "#0f172a", muted: "#e9eef5",
    },
    fonts: { heading: "Poppins", body: "Open Sans" },
    shape: "soft",
  },
  "fitness-energy": {
    palette: {
      primary: "#c2410c", onPrimary: "#ffffff", secondary: "#f97316",
      accent: "#15803d", onAccent: "#ffffff",
      background: "#111827", foreground: "#f8fafc", muted: "#1f2937",
    },
    fonts: { heading: "Barlow Condensed", body: "Barlow" },
    shape: "sharp",
    darkTheme: true,
  },
  "pet-friendly": {
    palette: {
      primary: "#c2410c", onPrimary: "#ffffff", secondary: "#fb923c",
      accent: "#0369a1", onAccent: "#ffffff",
      background: "#fff8f2", foreground: "#5c2410", muted: "#fbe4d3",
    },
    fonts: { heading: "Varela Round", body: "Nunito Sans" },
    shape: "round",
  },
  "education-bright": {
    palette: {
      primary: "#4338ca", onPrimary: "#ffffff", secondary: "#6366f1",
      accent: "#b45309", onAccent: "#ffffff",
      background: "#f6f6fd", foreground: "#1e1b4b", muted: "#e4e4f8",
    },
    fonts: { heading: "Poppins", body: "Open Sans" },
    shape: "soft",
  },
};

export function resolveDirection(direction?: string): DirectionStyle | undefined {
  if (!direction) return undefined;
  return DIRECTIONS[direction as VisualDirection];
}
