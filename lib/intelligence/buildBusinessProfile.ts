// ============================================================
// Business Profile — a camada entre o Lead e o Preview
// ------------------------------------------------------------
// Junta tudo que se sabe do negócio (Maps + busca + Deep Crawl),
// classifica, e separa o que foi CONFIRMADO do que é apenas
// PROVÁVEL. O preview só afirma o confirmado; para o resto usa
// linguagem contextual. É esta separação que impede a página de
// anunciar implante dentário para uma clínica dermatológica.
// ============================================================

import { Lead } from "@/lib/types";
import {
  Classification,
  Evidence,
  classifyBusiness,
  faixaDeConfianca,
  normalizar,
} from "./classifyBusiness";
import { FALLBACK_NODE, NicheNode, forbiddenFor } from "./taxonomy";

export interface BusinessProfile {
  mainNiche: string;
  businessType: string;
  subNiche?: string;
  /** Rótulo legível: "Dermatologia", "Pizzaria" */
  label: string;
  /** Id do nó da taxonomia que originou o perfil */
  nodeId: string;

  confidence: number;
  confidenceBand: "alta" | "media" | "baixa";

  /** Frase segura sobre o segmento — não afirma serviço específico */
  description: string;

  primaryConversionGoal: string;
  secondaryConversionGoal?: string;
  ctaPrimary: string;
  ctaSecondary?: string;

  /** Serviços com evidência real (site, categoria do Maps) */
  confirmedServices: string[];
  /** Plausíveis pelo segmento, nunca apresentados como oferta */
  probableServices: string[];
  /** Vocabulário que o preview não pode usar */
  forbiddenAssumptions: string[];

  toneOfVoice: string;
  regulated: boolean;

  visualDirection: {
    style: string;
    density: "compacta" | "equilibrada" | "espacosa";
    tone: string;
    heroStyle: string;
    imageDirection: string;
  };

  sectionFlow: string[];
  servicesLabel: string;
  servicesVariant: string;

  evidence: {
    googleCategory?: string;
    searchedNiche?: string;
    website?: string;
    websiteContentUsed: boolean;
    reviewsUsed: boolean;
    matched: string[];
    runnerUp?: string;
  };

  /** Quando o perfil foi calculado — permite invalidar cache */
  generatedAt: string;
  /** `local` = sem IA; `ai` = classificação assistida por modelo */
  source: "local" | "ai";
}

// ─── Tom de voz e densidade por direção visual ────────────────────────────────
const TOM_POR_DIRECAO: Record<string, { tom: string; densidade: BusinessProfile["visualDirection"]["density"]; hero: string; imagens: string }> = {
  "medical-clean": { tom: "claro, sóbrio e acolhedor", densidade: "espacosa", hero: "split", imagens: "ambiente clínico, equipe, recepção" },
  "medical-premium": { tom: "sofisticado e tranquilizador", densidade: "espacosa", hero: "editorial", imagens: "ambiente refinado, detalhes, cuidado" },
  "dental-clean": { tom: "confiante e cuidadoso", densidade: "espacosa", hero: "split", imagens: "consultório, equipe, atendimento" },
  "beauty-luxury": { tom: "editorial e elegante", densidade: "espacosa", hero: "editorial", imagens: "resultado, ambiente, detalhe" },
  "beauty-modern": { tom: "próximo e estiloso", densidade: "equilibrada", hero: "overlay", imagens: "trabalho pronto, ambiente, equipe" },
  "food-editorial": { tom: "sensorial e convidativo", densidade: "espacosa", hero: "editorial", imagens: "prato, ambiente, ingrediente" },
  "food-bold": { tom: "direto e apetitoso", densidade: "compacta", hero: "overlay", imagens: "produto em destaque, close" },
  "real-estate-premium": { tom: "sóbrio e aspiracional", densidade: "espacosa", hero: "editorial", imagens: "fachada, interiores, região" },
  "legal-authority": { tom: "formal e seguro", densidade: "equilibrada", hero: "minimal", imagens: "escritório, equipe, cidade" },
  "corporate-clean": { tom: "objetivo e profissional", densidade: "equilibrada", hero: "split", imagens: "escritório, equipe, reunião" },
  "automotive-performance": { tom: "técnico e direto", densidade: "compacta", hero: "overlay", imagens: "oficina, serviço em execução" },
  "industrial-technical": { tom: "técnico e objetivo", densidade: "compacta", hero: "split", imagens: "equipamento, serviço, equipe" },
  "local-service-modern": { tom: "próximo e prático", densidade: "equilibrada", hero: "split", imagens: "serviço, equipe, local" },
  "fitness-energy": { tom: "energético e motivador", densidade: "compacta", hero: "overlay", imagens: "treino, estrutura, alunos" },
  "pet-friendly": { tom: "carinhoso e seguro", densidade: "equilibrada", hero: "split", imagens: "animais atendidos, estrutura" },
  "education-bright": { tom: "acolhedor e claro", densidade: "equilibrada", hero: "split", imagens: "sala, alunos, atividades" },
};

/**
 * Frase de segmento que não afirma nada além do que se sabe.
 * É a alternativa honesta a "Serviço Premium com Qualidade Garantida".
 */
export function declaracaoSegura(node: NicheNode, cidade?: string): string {
  const onde = cidade ? ` em ${cidade}` : "";
  const porNicho: Record<string, string> = {
    saude: `Atendimento em ${node.label.toLowerCase()}${onde}, com agendamento direto.`,
    odontologia: `Atendimento odontológico${onde}, pensado para cuidar do seu sorriso.`,
    beleza: `${node.label}${onde} — agende seu horário pelo WhatsApp.`,
    alimentacao: `${node.label}${onde}. Veja o cardápio e peça pelo WhatsApp.`,
    automotivo: `${node.label}${onde}. Peça seu orçamento sem compromisso.`,
    profissional: `${node.label}${onde}. Fale com a equipe para entender seu caso.`,
    imoveis: `${node.label}${onde}. Fale com um corretor e encontre seu imóvel.`,
    casa: `${node.label}${onde}. Solicite um orçamento para o seu projeto.`,
    fitness: `${node.label}${onde}. Conheça a estrutura e comece a treinar.`,
    pets: `${node.label}${onde}. Agende o atendimento do seu pet.`,
    educacao: `${node.label}${onde}. Fale com a secretaria sobre turmas e matrículas.`,
    comercio: `${node.label}${onde}. Fale com a loja pelo WhatsApp.`,
  };

  return porNicho[node.mainNiche] ?? `${node.label}${onde}. Fale com a equipe pelo WhatsApp.`;
}

/**
 * Filtra os serviços que vieram do Deep Crawl.
 * Recusa frase longa (é texto de site, não nome de serviço), texto de
 * marketing vazio, e qualquer termo do vocabulário proibido do nó — a
 * última barreira contra a clínica médica anunciar clareamento.
 */
export function filtrarServicos(
  candidatos: string[],
  node: NicheNode
): string[] {
  const proibidos = forbiddenFor(node).map(normalizar);
  const vazios = /^(servi[çc]os?|atendimento|qualidade|excel[êe]ncia|premium|sobre n[óo]s|home|contato|in[íi]cio)$/i;

  const limpos = candidatos
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 4 && s.length <= 48)
    .filter((s) => !vazios.test(s))
    // Frase com verbo conjugado e vírgula é texto corrido, não serviço
    .filter((s) => s.split(" ").length <= 6)
    .filter((s) => {
      const n = normalizar(s);
      return !proibidos.some((p) => n.includes(p));
    })
    .map((s) => s[0].toUpperCase() + s.slice(1));

  return Array.from(new Set(limpos)).slice(0, 8);
}

export interface ProfileInput {
  lead: Lead;
  /** Termo pesquisado pelo usuário, quando conhecido */
  searchedNiche?: string;
  /** Enriquecimento vindo do Deep Crawl */
  deepResearch?: {
    services?: string[];
    websiteTexts?: string[];
    reviews?: string[];
    websiteUsed?: boolean;
  };
  /** Classificação assistida por IA, quando disponível e validada */
  aiClassification?: Partial<Classification> & {
    confirmedServices?: string[];
    probableServices?: string[];
  };
}

export function buildBusinessProfile(input: ProfileInput): BusinessProfile {
  const { lead, deepResearch } = input;

  const searchedNiche = input.searchedNiche ?? lead.searchedNiche;
  const googleCategory = lead.googleCategory ?? lead.category;

  const evidence: Evidence = {
    name: lead.title,
    googleCategory,
    searchedNiche,
    website: lead.originalWebsite,
    websiteTexts: deepResearch?.websiteTexts,
    services: deepResearch?.services,
    reviews: deepResearch?.reviews,
  };

  const local = classifyBusiness(evidence);

  // A IA só substitui a classificação local quando aponta para um nó válido
  // E está mais confiante — caso contrário o determinístico prevalece.
  const usouIA = Boolean(
    input.aiClassification?.node &&
      (input.aiClassification.confidence ?? 0) > local.confidence
  );
  const classificacao: Classification = usouIA
    ? {
        node: input.aiClassification!.node as NicheNode,
        confidence: input.aiClassification!.confidence ?? local.confidence,
        matched: input.aiClassification!.matched ?? local.matched,
        sourcesUsed: local.sourcesUsed,
        runnerUp: local.runnerUp,
      }
    : local;

  const node = classificacao.node ?? FALLBACK_NODE;
  const banda = faixaDeConfianca(classificacao.confidence);

  // Serviço só é "confirmado" se veio do site da própria empresa
  const doSite = deepResearch?.websiteUsed ? deepResearch?.services ?? [] : [];
  const confirmedServices = filtrarServicos(
    [...doSite, ...(input.aiClassification?.confirmedServices ?? [])],
    node
  );
  const probableServices = filtrarServicos(
    input.aiClassification?.probableServices ?? [],
    node
  ).filter((s) => !confirmedServices.includes(s));

  const direcao = TOM_POR_DIRECAO[node.visualDirection] ?? TOM_POR_DIRECAO["local-service-modern"];
  const cidade = lead.city?.split(",")[0]?.trim();

  return {
    mainNiche: node.mainNiche,
    businessType: node.businessType,
    subNiche: banda === "baixa" ? undefined : node.subNiche,
    label: node.label,
    nodeId: node.id,

    confidence: classificacao.confidence,
    confidenceBand: banda,

    description: declaracaoSegura(node, cidade),

    primaryConversionGoal: node.conversionGoal,
    secondaryConversionGoal: node.ctaSecondary ? "whatsapp" : undefined,
    ctaPrimary: node.ctaPrimary,
    ctaSecondary: node.ctaSecondary,

    confirmedServices,
    probableServices,
    forbiddenAssumptions: forbiddenFor(node),

    toneOfVoice: direcao.tom,
    regulated: Boolean(node.regulated),

    visualDirection: {
      style: node.visualDirection,
      density: direcao.densidade,
      tone: direcao.tom,
      heroStyle: direcao.hero,
      imageDirection: direcao.imagens,
    },

    sectionFlow: node.sectionFlow,
    servicesLabel: node.servicesLabel,
    servicesVariant: node.servicesVariant,

    evidence: {
      googleCategory,
      searchedNiche,
      website: lead.originalWebsite,
      websiteContentUsed: Boolean(deepResearch?.websiteUsed),
      reviewsUsed: Boolean(deepResearch?.reviews?.length),
      matched: classificacao.matched,
      runnerUp: classificacao.runnerUp?.id,
    },

    generatedAt: new Date().toISOString(),
    source: usouIA ? "ai" : "local",
  };
}

/**
 * Reaproveita o perfil já calculado quando as evidências não mudaram.
 * Evita reclassificar toda vez que o usuário reabre o mesmo preview.
 */
export function perfilAindaVale(lead: Lead): boolean {
  const perfil = lead.businessProfile;
  if (!perfil) return false;

  // Deep Crawl posterior traz evidência nova: vale recalcular
  const temSiteAgora = Boolean(lead.originalWebsite);
  if (temSiteAgora && !perfil.evidence.website) return false;
  if (lead.googleCategory && perfil.evidence.googleCategory !== lead.googleCategory) {
    return false;
  }

  return true;
}
