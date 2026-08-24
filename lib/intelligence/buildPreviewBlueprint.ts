// ============================================================
// Preview Blueprint — a estratégia da página, não o código dela
// ------------------------------------------------------------
// A IA (quando usada) decide estrutura; os componentes React já
// existem. Aqui o BusinessProfile vira um plano: quais seções,
// em que ordem, com qual headline e qual CTA. O renderer só lê.
// ============================================================

import { Lead } from "@/lib/types";
import { BusinessProfile } from "./buildBusinessProfile";

export type HeroVariant = "split" | "overlay" | "editorial" | "minimal" | "bold";

export interface PreviewSection {
  kind: string;
  /** Título da seção; ausente quando a seção não tem cabeçalho */
  title?: string;
  subtitle?: string;
  variant?: string;
  /** Itens quando a seção lista algo (serviços, áreas, pratos) */
  items?: { label: string; detail?: string }[];
  /** Marca conteúdo que veio de evidência real */
  fromEvidence?: boolean;
}

export interface PreviewBlueprint {
  template: string;
  theme: {
    style: string;
    density: string;
    radius: "sharp" | "soft" | "round";
    heroVariant: HeroVariant;
  };
  hero: {
    variant: HeroVariant;
    eyebrow?: string;
    headline: string;
    subheadline: string;
    primaryCTA: string;
    secondaryCTA?: string;
    /** Mostrar nota do Google acima da dobra */
    showRating: boolean;
  };
  sections: PreviewSection[];
  designReasoning: {
    niche: string;
    subNiche?: string;
    conversionGoal: string;
    confidence: number;
    confidenceBand: string;
    /** Por que esta estrutura, em uma linha — aparece no painel do vendedor */
    rationale: string;
  };
  /** Termos que o renderer não pode emitir */
  forbidden: string[];
}

const RADIUS_POR_ESTILO: Record<string, "sharp" | "soft" | "round"> = {
  "medical-clean": "soft",
  "medical-premium": "soft",
  "dental-clean": "soft",
  "beauty-luxury": "round",
  "beauty-modern": "round",
  "food-editorial": "soft",
  "food-bold": "soft",
  "real-estate-premium": "sharp",
  "legal-authority": "sharp",
  "corporate-clean": "sharp",
  "automotive-performance": "sharp",
  "industrial-technical": "sharp",
  "local-service-modern": "soft",
  "fitness-energy": "sharp",
  "pet-friendly": "round",
  "education-bright": "round",
};

/**
 * Headline específica do negócio.
 *
 * Regra: nome + segmento + cidade produz uma frase verdadeira e concreta
 * ("Dermatologia em Torres com atendimento próximo"), não um slogan vazio
 * do tipo "Excelência e qualidade para você".
 */
export function montarHeadline(
  lead: Lead,
  profile: BusinessProfile
): { headline: string; subheadline: string; eyebrow?: string } {
  const cidade = lead.city?.split(",")[0]?.trim() ?? "";
  const segmento = profile.label;
  const especialidade = profile.subNiche;

  // Com confiança baixa, a headline fala do nome e do lugar — nunca
  // atribui especialidade que não se confirmou.
  if (profile.confidenceBand === "baixa") {
    return {
      eyebrow: cidade || undefined,
      headline: lead.title,
      subheadline: cidade
        ? `Atendimento em ${cidade}. Fale com a equipe pelo WhatsApp.`
        : "Fale com a equipe pelo WhatsApp.",
    };
  }

  const foco = especialidade
    ? especialidade[0].toUpperCase() + especialidade.slice(1)
    : segmento;

  const headline = cidade ? `${foco} em ${cidade}` : foco;

  return {
    eyebrow: segmento !== foco ? segmento : undefined,
    headline,
    subheadline: profile.description,
  };
}

const TITULOS_DE_SECAO: Record<string, string> = {
  trust: "Reputação",
  services: "Serviços",
  about: "Sobre",
  team: "Quem atende",
  gallery: "Conheça o espaço",
  reviews: "Avaliações",
  location: "Onde estamos",
  process: "Como funciona",
  cta: "",
};

/** Passos genéricos e verdadeiros, por meta de conversão */
function passosDoProcesso(profile: BusinessProfile): { label: string; detail?: string }[] {
  const porMeta: Record<string, { label: string; detail?: string }[]> = {
    orcamento: [
      { label: "Você descreve o problema", detail: "Pelo WhatsApp, com fotos se ajudar." },
      { label: "Avaliação e orçamento", detail: "Sem compromisso." },
      { label: "Execução do serviço", detail: "Com prazo combinado antes." },
    ],
    consulta: [
      { label: "Primeiro contato", detail: "Você conta o que precisa." },
      { label: "Análise do caso", detail: "Avaliação da equipe." },
      { label: "Orientação sobre os próximos passos" },
    ],
    agendamento: [
      { label: "Escolha do horário", detail: "Pelo WhatsApp." },
      { label: "Confirmação", detail: "Você recebe os detalhes do atendimento." },
      { label: "Atendimento" },
    ],
    contato: [
      { label: "Você entra em contato" },
      { label: "Entendemos sua necessidade" },
      { label: "Proposta de atendimento" },
    ],
  };

  return porMeta[profile.primaryConversionGoal] ?? porMeta.contato;
}

export interface BlueprintInput {
  lead: Lead;
  profile: BusinessProfile;
  /** Avaliações REAIS coletadas; sem isso a seção não existe */
  realReviews?: { quote: string; author?: string }[];
}

export function buildPreviewBlueprint(input: BlueprintInput): PreviewBlueprint {
  const { lead, profile } = input;
  const { headline, subheadline, eyebrow } = montarHeadline(lead, profile);

  const temFotos = (lead.photos?.length ?? 0) > 0;
  const temAvaliacoes = lead.reviewsCount > 0 && lead.rating > 0;
  const avaliacoesReais = input.realReviews ?? [];

  const heroVariant = escolherHero(profile, temFotos, lead.photos?.length ?? 0);

  const sections: PreviewSection[] = [];

  for (const kind of profile.sectionFlow) {
    switch (kind) {
      case "trust": {
        // Sem nota real não existe seção de reputação — nada de estatística inventada
        if (!temAvaliacoes) break;
        sections.push({
          kind: "trust",
          title: TITULOS_DE_SECAO.trust,
          fromEvidence: true,
        });
        break;
      }

      case "services": {
        const confirmados = profile.confirmedServices;
        sections.push({
          kind: "services",
          title: profile.servicesLabel,
          variant: profile.servicesVariant,
          // Só entram serviços com evidência. Sem evidência, o renderer
          // mostra a declaração de segmento em vez de inventar lista.
          items: confirmados.map((label) => ({ label })),
          subtitle: confirmados.length === 0 ? profile.description : undefined,
          fromEvidence: confirmados.length > 0,
        });
        break;
      }

      case "gallery": {
        if (!temFotos) break;
        sections.push({
          kind: "gallery",
          title: TITULOS_DE_SECAO.gallery,
          fromEvidence: true,
        });
        break;
      }

      case "reviews": {
        if (avaliacoesReais.length === 0) break;
        sections.push({
          kind: "reviews",
          title: TITULOS_DE_SECAO.reviews,
          items: avaliacoesReais.map((r) => ({ label: r.quote, detail: r.author })),
          fromEvidence: true,
        });
        break;
      }

      case "team": {
        // Sem dados de equipe confirmados a seção viraria ficção
        break;
      }

      case "about": {
        sections.push({
          kind: "about",
          title: TITULOS_DE_SECAO.about,
          subtitle: profile.description,
        });
        break;
      }

      case "process": {
        sections.push({
          kind: "process",
          title: TITULOS_DE_SECAO.process,
          items: passosDoProcesso(profile),
        });
        break;
      }

      case "location": {
        if (!lead.address) break;
        sections.push({
          kind: "location",
          title: TITULOS_DE_SECAO.location,
          fromEvidence: true,
        });
        break;
      }

      case "cta": {
        sections.push({ kind: "cta" });
        break;
      }
    }
  }

  // Avaliação real é a prova social mais valiosa que existe: se foi
  // coletada, entra mesmo que o fluxo do segmento não a previsse.
  const jaTemReviews = sections.some((s) => s.kind === "reviews");
  if (!jaTemReviews && avaliacoesReais.length > 0) {
    const posicaoCta = sections.findIndex((s) => s.kind === "cta");
    const secaoReviews: PreviewSection = {
      kind: "reviews",
      title: TITULOS_DE_SECAO.reviews,
      items: avaliacoesReais.map((r) => ({ label: r.quote, detail: r.author })),
      fromEvidence: true,
    };
    if (posicaoCta >= 0) sections.splice(posicaoCta, 0, secaoReviews);
    else sections.push(secaoReviews);
  }

  // Garante que a página sempre fecha em conversão
  if (!sections.some((s) => s.kind === "cta")) {
    sections.push({ kind: "cta" });
  }

  return {
    template: profile.visualDirection.style,
    theme: {
      style: profile.visualDirection.style,
      density: profile.visualDirection.density,
      radius: RADIUS_POR_ESTILO[profile.visualDirection.style] ?? "soft",
      heroVariant,
    },
    hero: {
      variant: heroVariant,
      eyebrow,
      headline,
      subheadline,
      primaryCTA: profile.ctaPrimary,
      secondaryCTA: profile.ctaSecondary,
      showRating: temAvaliacoes,
    },
    sections,
    designReasoning: {
      niche: profile.mainNiche,
      subNiche: profile.subNiche,
      conversionGoal: profile.primaryConversionGoal,
      confidence: profile.confidence,
      confidenceBand: profile.confidenceBand,
      rationale: montarJustificativa(profile, sections.length),
    },
    forbidden: profile.forbiddenAssumptions,
  };
}

/**
 * Duas empresas do mesmo nicho não recebem a mesma página: o hero varia
 * com o acervo de imagens e com o porte (avaliações), de forma
 * determinística — nunca aleatória.
 */
export function escolherHero(
  profile: BusinessProfile,
  temFotos: boolean,
  quantidadeDeFotos = 0
): HeroVariant {
  const preferido = profile.visualDirection.heroStyle as HeroVariant;

  // Sem acervo, hero de imagem não se sustenta — vira composição tipográfica
  if (!temFotos) {
    return profile.visualDirection.density === "espacosa" ? "minimal" : "split";
  }

  // Uma ou duas fotos não sustentam hero editorial (que pede imagem larga)
  if (quantidadeDeFotos < 3 && preferido === "editorial") return "split";

  // Acervo farto num nicho visual justifica hero de imagem cheia
  if (quantidadeDeFotos >= 4 && preferido === "split" && ehNichoVisual(profile)) {
    return "overlay";
  }

  return preferido;
}

/** Nichos em que a imagem vende mais que o texto */
function ehNichoVisual(profile: BusinessProfile): boolean {
  return ["alimentacao", "beleza", "imoveis", "fitness", "pets"].includes(profile.mainNiche);
}

function montarJustificativa(profile: BusinessProfile, totalSecoes: number): string {
  const base = `${profile.label} classificado com confiança ${profile.confidenceBand} (${profile.confidence.toFixed(2)})`;
  const conversao = `meta de conversão: ${profile.primaryConversionGoal}`;
  const conteudo =
    profile.confirmedServices.length > 0
      ? `${profile.confirmedServices.length} serviços confirmados no site`
      : "sem serviços confirmados — copy contextual";
  return `${base}; ${conversao}; ${conteudo}; ${totalSecoes} seções.`;
}
