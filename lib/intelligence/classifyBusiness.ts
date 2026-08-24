// ============================================================
// Classificador de negócio — determinístico, sem IA
// ------------------------------------------------------------
// Pontua cada nó da taxonomia contra as evidências disponíveis,
// ponderadas por confiabilidade da fonte. O nome da empresa pesa
// mais que o termo pesquisado: quem procura "clínicas médicas" e
// encontra "OdontoMais Clínica Odontológica" recebe odontologia.
// ============================================================

import {
  FALLBACK_NODE,
  NicheNode,
  TAXONOMY,
  forbiddenFor,
} from "./taxonomy";

export interface Evidence {
  /** Nome da empresa no Google Maps */
  name?: string;
  /** Categoria que o Maps atribuiu */
  googleCategory?: string;
  /** Termo que o usuário pesquisou */
  searchedNiche?: string;
  /** Textos extraídos do site oficial */
  websiteTexts?: string[];
  /** Serviços identificados no site */
  services?: string[];
  /** Trechos de avaliações */
  reviews?: string[];
  /** Domínio do site — "odontocenter.com.br" é sinal forte */
  website?: string;
}

export interface ClassificationHit {
  node: NicheNode;
  score: number;
  /** Termos que dispararam a pontuação, para auditoria */
  matched: string[];
  /** Quantos sinais fortes casaram — sinal fraco sozinho não decide nada */
  strongHits: number;
  /** Fontes distintas que corroboraram */
  sources: Set<string>;
}

export interface Classification {
  node: NicheNode;
  confidence: number;
  matched: string[];
  runnerUp?: { id: string; score: number };
  /** Quais fontes de evidência realmente existiam */
  sourcesUsed: string[];
}

/** Peso por fonte — quanto mais próxima do negócio, mais pesa */
const PESO = {
  name: 3.0,
  website: 2.5,
  googleCategory: 2.2,
  services: 2.0,
  websiteTexts: 1.4,
  reviews: 0.8,
  searchedNiche: 1.0,
} as const;

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    // Marcas de acento precisam ser REMOVIDAS antes do filtro geral: trocá-las
    // por espaço partiria "clínica" em "cli nica" e nada casaria.
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface CampoDeEvidencia {
  fonte: keyof typeof PESO;
  texto: string;
}

function montarCampos(evidence: Evidence): CampoDeEvidencia[] {
  const campos: CampoDeEvidencia[] = [];
  const push = (fonte: keyof typeof PESO, valor?: string | string[]) => {
    if (!valor) return;
    const texto = Array.isArray(valor) ? valor.join(" ") : valor;
    const limpo = normalizar(texto);
    if (limpo) campos.push({ fonte, texto: limpo });
  };

  push("name", evidence.name);
  push("googleCategory", evidence.googleCategory);
  push("searchedNiche", evidence.searchedNiche);
  push("services", evidence.services);
  push("websiteTexts", evidence.websiteTexts?.slice(0, 12));
  push("reviews", evidence.reviews?.slice(0, 6));

  // Do domínio só interessa o miolo: "clinicasaolucas" em
  // "https://www.clinicasaolucas.com.br/contato"
  if (evidence.website) {
    const dominio = evidence.website
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .replace(/^www\./, "")
      .split(".")[0];
    push("website", dominio);
  }

  return campos;
}

/** Pontua um nó contra todos os campos de evidência */
export function scoreNode(node: NicheNode, campos: CampoDeEvidencia[]): ClassificationHit {
  let score = 0;
  let strongHits = 0;
  const matched: string[] = [];
  const sources = new Set<string>();

  for (const campo of campos) {
    const peso = PESO[campo.fonte];

    for (const sinal of node.strongSignals) {
      if (campo.texto.includes(sinal)) {
        score += peso * 3;
        strongHits += 1;
        sources.add(campo.fonte);
        matched.push(`${sinal} (${campo.fonte})`);
      }
    }
    for (const sinal of node.weakSignals) {
      if (campo.texto.includes(sinal)) {
        score += peso * 0.8;
        sources.add(campo.fonte);
        matched.push(`${sinal} (${campo.fonte})`);
      }
    }
  }

  return { node, score, matched, strongHits, sources };
}

/**
 * Classifica com base nas evidências.
 *
 * A confiança sai da distância entre o primeiro e o segundo colocado,
 * ajustada por quantas fontes independentes concordaram. Empate técnico
 * derruba a confiança — é o sinal para o preview evitar afirmação
 * específica em vez de arriscar.
 */
export function classifyBusiness(evidence: Evidence): Classification {
  const campos = montarCampos(evidence);
  const sourcesUsed = Array.from(new Set(campos.map((c) => c.fonte)));

  if (campos.length === 0) {
    return { node: FALLBACK_NODE, confidence: 0, matched: [], sourcesUsed: [] };
  }

  const hits = TAXONOMY.map((node) => scoreNode(node, campos))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);

  if (hits.length === 0) {
    return { node: FALLBACK_NODE, confidence: 0, matched: [], sourcesUsed };
  }

  const melhor = hits[0];

  // Entre nós do mesmo tipo de negócio, o subnicho específico vence o geral
  const mesmoTipo = hits.filter((h) => h.node.businessType === melhor.node.businessType);
  const comSubnicho = mesmoTipo.find((h) => h.node.subNiche && h.score >= melhor.score * 0.75);
  const escolhido = comSubnicho ?? melhor;

  // Segundo colocado de OUTRO tipo de negócio — é o que gera ambiguidade real
  const concorrente = hits.find((h) => h.node.businessType !== escolhido.node.businessType);

  const confidence = calcularConfianca({
    melhorScore: escolhido.score,
    concorrenteScore: concorrente?.score ?? 0,
    fontesDistintas: escolhido.sources.size,
    temSinalForte: escolhido.strongHits > 0,
  });

  return {
    node: escolhido.node,
    confidence,
    matched: Array.from(new Set(escolhido.matched)).slice(0, 12),
    runnerUp: concorrente
      ? { id: concorrente.node.id, score: Number(concorrente.score.toFixed(2)) }
      : undefined,
    sourcesUsed,
  };
}

export function calcularConfianca(input: {
  melhorScore: number;
  concorrenteScore: number;
  fontesDistintas: number;
  temSinalForte?: boolean;
}): number {
  const { melhorScore, concorrenteScore, fontesDistintas, temSinalForte = true } = input;
  if (melhorScore <= 0) return 0;

  // Margem: 1 quando não há concorrente, tende a 0 no empate
  const margem = (melhorScore - concorrenteScore) / melhorScore;

  // Volume: sinal isolado não passa de médio, por mais forte que seja
  const volume = Math.min(1, melhorScore / 18);

  const bruto = margem * 0.55 + volume * 0.45;

  // Corroboração é multiplicador, não parcela. Uma fonte só dizendo
  // "Empreendimentos" não pode render confiança média — sem uma segunda
  // evidência concordando, a classificação fica na faixa conservadora.
  const porFontes = fontesDistintas >= 3 ? 1 : fontesDistintas === 2 ? 0.82 : 0.55;

  // Só sinal fraco ("casa", "clínica") é pista, não identificação
  const porForca = temSinalForte ? 1 : 0.6;

  return Number(
    Math.max(0, Math.min(1, bruto * porFontes * porForca)).toFixed(2)
  );
}

/**
 * Faixas de confiança que o resto do sistema respeita.
 *  alta  → pode afirmar especialidade e subnicho
 *  media → fala do segmento amplo, evita especificidade
 *  baixa → só o que foi confirmado, visual pelo nicho amplo
 */
export function faixaDeConfianca(confidence: number): "alta" | "media" | "baixa" {
  if (confidence >= 0.8) return "alta";
  if (confidence >= 0.55) return "media";
  return "baixa";
}

/** Termos que o preview não pode usar para este negócio */
export function proibidosPara(node: NicheNode): string[] {
  return forbiddenFor(node);
}
