// ============================================================
// Orquestrador da inteligência
// ------------------------------------------------------------
// Ponto único de entrada: dado um Lead, devolve perfil + blueprint.
// Reaproveita o que já foi calculado, funciona sem IA e nunca
// devolve um preview vazio.
// ============================================================

import { Lead } from "@/lib/types";
import {
  BusinessProfile,
  ProfileInput,
  buildBusinessProfile,
  perfilAindaVale,
} from "./buildBusinessProfile";
import { PreviewBlueprint, buildPreviewBlueprint } from "./buildPreviewBlueprint";
import { sanearBlueprint, validarPerfil } from "./validateBusinessProfile";

export * from "./taxonomy";
export * from "./classifyBusiness";
export * from "./buildBusinessProfile";
export * from "./buildPreviewBlueprint";
export * from "./validateBusinessProfile";
export * from "./prompts";

export interface IntelligenceResult {
  profile: BusinessProfile;
  blueprint: PreviewBlueprint;
  /** `cache` quando nada precisou ser recalculado */
  origem: "cache" | "calculado";
  avisos: string[];
}

/**
 * Prepara o preview de um lead.
 *
 * Sem chamada de rede e sem IA: a classificação determinística já
 * responde. A IA, quando disponível, entra antes por
 * `input.aiClassification` e só prevalece se estiver mais confiante.
 */
export function prepararPreview(
  lead: Lead,
  extras: Omit<ProfileInput, "lead"> = {}
): IntelligenceResult {
  const avisos: string[] = [];

  // Cache: perfil e blueprint viajam no próprio lead
  if (lead.businessProfile && lead.previewBlueprint && perfilAindaVale(lead)) {
    return {
      profile: lead.businessProfile,
      blueprint: lead.previewBlueprint,
      origem: "cache",
      avisos,
    };
  }

  const profile = buildBusinessProfile({ lead, ...extras });

  const validacao = validarPerfil(profile);
  if (!validacao.ok) {
    avisos.push(...validacao.errors);
    // Perfil inconsistente não derruba o preview: rebaixa a confiança e
    // segue com linguagem conservadora.
    profile.confidenceBand = "baixa";
    profile.subNiche = undefined;
  }

  const realReviews = extras.deepResearch?.reviews
    ?.filter((t) => t && t.trim().length >= 25)
    .slice(0, 3)
    .map((quote) => ({ quote: quote.trim() }));

  const blueprint = sanearBlueprint(
    buildPreviewBlueprint({ lead, profile, realReviews })
  );

  return { profile, blueprint, origem: "calculado", avisos };
}

/** Anexa perfil e blueprint ao lead para persistir no cache do preview */
export function comInteligencia(lead: Lead, extras?: Omit<ProfileInput, "lead">): Lead {
  const { profile, blueprint } = prepararPreview(lead, extras);
  return { ...lead, businessProfile: profile, previewBlueprint: blueprint };
}
