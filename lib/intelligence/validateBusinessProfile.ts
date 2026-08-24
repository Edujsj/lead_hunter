// ============================================================
// Validação dos retornos da IA
// ------------------------------------------------------------
// O projeto não usa Zod; validar à mão aqui evita uma dependência
// nova e mantém o contrato explícito. Nada que a IA devolva entra
// no sistema sem passar por estas checagens — JSON inválido vira
// `null` e o fluxo segue com a classificação determinística.
// ============================================================

import { NicheNode, findNodeById } from "./taxonomy";
import { Classification } from "./classifyBusiness";
import { BusinessProfile } from "./buildBusinessProfile";
import { PreviewBlueprint } from "./buildPreviewBlueprint";

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: string[];
}

const ehTextoUtil = (v: unknown, max = 200): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;

const ehListaDeTexto = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((i) => typeof i === "string");

/**
 * Extrai JSON de uma resposta de modelo.
 * Modelos costumam embrulhar em ```json ... ``` ou adicionar prosa antes.
 */
export function extrairJson(bruto: string): unknown | null {
  if (!bruto) return null;

  const semCerca = bruto
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(semCerca);
  } catch {
    // Tenta recortar do primeiro { até o último }
    const inicio = semCerca.indexOf("{");
    const fim = semCerca.lastIndexOf("}");
    if (inicio === -1 || fim <= inicio) return null;
    try {
      return JSON.parse(semCerca.slice(inicio, fim + 1));
    } catch {
      return null;
    }
  }
}

export interface AiClassificationPayload {
  node: NicheNode;
  confidence: number;
  matched: string[];
  confirmedServices: string[];
  probableServices: string[];
}

/**
 * Valida a saída do prompt de classificação.
 *
 * A IA não pode inventar um nicho: ela escolhe um `nodeId` que exista na
 * taxonomia. Se apontar para um id desconhecido, o retorno é descartado.
 */
export function validarClassificacaoIA(
  bruto: unknown
): ValidationResult<AiClassificationPayload> {
  const errors: string[] = [];
  if (typeof bruto !== "object" || bruto === null) {
    return { ok: false, errors: ["resposta não é um objeto"] };
  }

  const obj = bruto as Record<string, unknown>;

  const nodeId = obj.nodeId;
  if (!ehTextoUtil(nodeId, 80)) {
    errors.push("nodeId ausente ou inválido");
  }

  const node = ehTextoUtil(nodeId, 80) ? findNodeById(nodeId) : undefined;
  if (!node) {
    errors.push(`nodeId "${String(nodeId)}" não existe na taxonomia`);
  }

  let confidence = typeof obj.confidence === "number" ? obj.confidence : NaN;
  if (Number.isNaN(confidence)) {
    errors.push("confidence ausente ou não numérica");
    confidence = 0;
  }
  confidence = Math.max(0, Math.min(1, confidence));

  const confirmedServices = ehListaDeTexto(obj.confirmedServices)
    ? obj.confirmedServices
    : [];
  const probableServices = ehListaDeTexto(obj.probableServices)
    ? obj.probableServices
    : [];
  const matched = ehListaDeTexto(obj.evidence) ? obj.evidence : [];

  if (errors.length > 0 || !node) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: { node, confidence, matched, confirmedServices, probableServices },
    errors: [],
  };
}

/** Converte o payload validado no formato que o builder de perfil consome */
export function comoClassificacao(
  payload: AiClassificationPayload
): Partial<Classification> & {
  confirmedServices: string[];
  probableServices: string[];
} {
  return {
    node: payload.node,
    confidence: payload.confidence,
    matched: payload.matched,
    confirmedServices: payload.confirmedServices,
    probableServices: payload.probableServices,
  };
}

/**
 * Verificação final antes de renderizar: nenhum texto do blueprint pode
 * conter vocabulário proibido do nicho. É a rede de segurança que pega
 * um serviço odontológico que tenha escapado para uma clínica médica.
 */
export function auditarBlueprint(
  blueprint: PreviewBlueprint
): { limpo: boolean; violacoes: string[] } {
  const violacoes: string[] = [];
  const proibidos = blueprint.forbidden.map((t) => t.toLowerCase());
  if (proibidos.length === 0) return { limpo: true, violacoes: [] };

  const textos: string[] = [
    blueprint.hero.headline,
    blueprint.hero.subheadline,
    blueprint.hero.eyebrow ?? "",
    blueprint.hero.primaryCTA,
  ];

  for (const secao of blueprint.sections) {
    if (secao.title) textos.push(secao.title);
    if (secao.subtitle) textos.push(secao.subtitle);
    for (const item of secao.items ?? []) {
      textos.push(item.label);
      if (item.detail) textos.push(item.detail);
    }
  }

  for (const texto of textos) {
    const alvo = texto.toLowerCase();
    for (const termo of proibidos) {
      if (alvo.includes(termo)) {
        violacoes.push(`"${termo}" em "${texto.slice(0, 60)}"`);
      }
    }
  }

  return { limpo: violacoes.length === 0, violacoes };
}

/** Remove do blueprint qualquer item que viole o vocabulário do nicho */
export function sanearBlueprint(blueprint: PreviewBlueprint): PreviewBlueprint {
  const proibidos = blueprint.forbidden.map((t) => t.toLowerCase());
  if (proibidos.length === 0) return blueprint;

  const violaTexto = (t?: string) =>
    Boolean(t) && proibidos.some((p) => t!.toLowerCase().includes(p));

  return {
    ...blueprint,
    sections: blueprint.sections.map((secao) => ({
      ...secao,
      items: secao.items?.filter((i) => !violaTexto(i.label) && !violaTexto(i.detail)),
    })),
  };
}

/** Sanidade estrutural do perfil antes de virar blueprint */
export function validarPerfil(perfil: BusinessProfile): ValidationResult<BusinessProfile> {
  const errors: string[] = [];

  if (!perfil.mainNiche) errors.push("mainNiche ausente");
  if (!perfil.businessType) errors.push("businessType ausente");
  if (perfil.confidence < 0 || perfil.confidence > 1) errors.push("confidence fora de 0–1");
  if (!perfil.ctaPrimary) errors.push("ctaPrimary ausente");
  if (perfil.sectionFlow.length === 0) errors.push("sectionFlow vazio");

  // Contradição grave: afirmar subnicho sem confiança para isso
  if (perfil.subNiche && perfil.confidenceBand === "baixa") {
    errors.push("subNiche afirmado com confiança baixa");
  }

  // Serviço confirmado que viola o próprio vocabulário proibido
  const proibidos = perfil.forbiddenAssumptions.map((t) => t.toLowerCase());
  for (const servico of perfil.confirmedServices) {
    if (proibidos.some((p) => servico.toLowerCase().includes(p))) {
      errors.push(`serviço "${servico}" viola o vocabulário do nicho`);
    }
  }

  return errors.length === 0
    ? { ok: true, value: perfil, errors: [] }
    : { ok: false, errors };
}
