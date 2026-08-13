// ============================================================
// Lead → BrandSeed
// ------------------------------------------------------------
// A conversão estava repetida em quatro lugares (landing, modal,
// cartão, exportador). Campo novo de marca agora entra só aqui.
// ============================================================

import { Lead } from "@/lib/types";
import { BrandSeed } from "./kit";

export function seedFromLead(lead: Lead): BrandSeed {
  return {
    logoUrl: lead.logoUrl,
    logoDominantColor: lead.brandColors?.logoDominant,
    logoHasAlpha: lead.logoHasAlpha,
    logoLuminance: lead.logoLuminance,
    logoAspect: lead.logoAspect,
    primaryColor: lead.brandColors?.primary,
    secondaryColor: lead.brandColors?.secondary,
    typography: lead.brandTypography,
    photoDominantColor: lead.brandColors?.photoDominant,
    photoLuminance: lead.photoLuminance,
    photoCount: lead.photos?.length ?? 0,
  };
}

/** Atalho: kit direto do lead */
export function kitInputFromLead(lead: Lead) {
  return {
    title: lead.title,
    category: lead.category,
    brand: seedFromLead(lead),
  };
}
