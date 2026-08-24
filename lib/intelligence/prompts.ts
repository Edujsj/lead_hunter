// ============================================================
// Prompts — classificação e estratégia, separados de propósito
// ------------------------------------------------------------
// Misturar "que negócio é este" com "como fica a página" foi o que
// produzia clínica médica anunciando clareamento: o modelo escrevia
// a landing antes de decidir o segmento. São duas chamadas, cada
// uma com uma responsabilidade, e ambas retornam só JSON.
// ============================================================

import { TAXONOMY } from "./taxonomy";
import { BusinessProfile } from "./buildBusinessProfile";

export interface ClassificationPromptInput {
  name: string;
  searchedNiche?: string;
  googleCategory?: string;
  address?: string;
  city?: string;
  website?: string;
  websiteTexts?: string[];
  reviews?: string[];
}

/** Catálogo compacto de ids — o modelo escolhe um, não inventa nicho */
function catalogoDeNos(): string {
  return TAXONOMY.map((n) => {
    const sub = n.subNiche ? ` (${n.subNiche})` : "";
    return `${n.id} — ${n.label}${sub}`;
  }).join("\n");
}

export const CLASSIFICATION_SYSTEM_PROMPT = `Você é um classificador comercial de empresas brasileiras.

Sua função NÃO é escrever uma landing page. Você apenas identifica o negócio.

REGRAS:
1. Escolha obrigatoriamente um "nodeId" da lista fornecida. Não invente id.
2. Use SOMENTE as evidências fornecidas. Não deduza serviço que não apareça.
3. Diferencie clínica médica de clínica odontológica. Se as evidências indicam
   medicina (dermatologia, cardiologia, pediatria...), NÃO classifique como
   odontologia — e vice-versa.
4. O nome da empresa é a evidência mais forte. O termo pesquisado pelo usuário
   é a mais fraca: quem procura "clínicas médicas" pode encontrar uma clínica
   odontológica, e nesse caso vale o nome.
5. "confirmedServices" só aceita serviço explicitamente citado nas evidências.
   Se nada foi citado, devolva lista vazia. NÃO preencha por suposição.
6. "probableServices" são plausíveis para o segmento, e serão tratados como
   não confirmados. Podem ficar vazios.
7. Quando as evidências forem escassas ou contraditórias, REDUZA a confiança.
   Confiança alta exige duas ou mais evidências independentes concordando.

Responda APENAS com JSON válido, sem cercas de código e sem texto ao redor:
{
  "nodeId": "string (um id exato da lista)",
  "confidence": 0.0,
  "evidence": ["trechos que sustentaram a decisão"],
  "confirmedServices": ["serviços citados explicitamente"],
  "probableServices": ["plausíveis, não confirmados"]
}`;

export function montarPromptDeClassificacao(input: ClassificationPromptInput): string {
  const linhas: string[] = [];
  const add = (rotulo: string, valor?: string | string[]) => {
    if (!valor || (Array.isArray(valor) && valor.length === 0)) return;
    const texto = Array.isArray(valor) ? valor.slice(0, 10).join("\n  ") : valor;
    linhas.push(`${rotulo}: ${texto}`);
  };

  add("Nome da empresa", input.name);
  add("Termo pesquisado pelo usuário", input.searchedNiche);
  add("Categoria atribuída pelo Google Maps", input.googleCategory);
  add("Endereço", [input.address, input.city].filter(Boolean).join(", "));
  add("Site", input.website);
  add("Textos extraídos do site", input.websiteTexts);
  add("Trechos de avaliações", input.reviews);

  if (!input.websiteTexts?.length && !input.reviews?.length) {
    linhas.push(
      "OBSERVAÇÃO: não há conteúdo de site nem avaliações. A confiança deve refletir essa escassez."
    );
  }

  return `EVIDÊNCIAS DISPONÍVEIS
${linhas.join("\n")}

CATÁLOGO DE CLASSIFICAÇÕES VÁLIDAS
${catalogoDeNos()}`;
}

// ─── Estrategista de preview ──────────────────────────────────────────────────

export const STRATEGIST_SYSTEM_PROMPT = `Você é um estrategista de landing pages focado em conversão.

Sua função é definir a ESTRUTURA de uma demonstração comercial para este negócio.

Você NÃO escreve React. Você NÃO escreve Tailwind. Você NÃO escreve CSS.
Você devolve apenas um blueprint em JSON.

PRIORIDADES, nesta ordem:
1. representar corretamente o negócio;
2. gerar desejo;
3. transmitir credibilidade;
4. favorecer a conversão declarada;
5. nunca afirmar informação inventada;
6. adaptar estrutura e visual ao nicho.

PROIBIÇÕES:
- Não repita a mesma estrutura para nichos diferentes.
- Não invente serviço, número, prêmio, tempo de mercado ou depoimento.
- Não escreva frases vazias como "qualidade garantida", "excelência",
  "serviço premium", "atendimento especializado".
- Não use nenhum termo da lista de vocabulário proibido.
- Em setor regulado, não prometa resultado.

A headline deve ser concreta: segmento + cidade funciona melhor que slogan.
O número de seções deve ficar entre 4 e 7.

Responda APENAS com JSON válido:
{
  "headline": "string",
  "subheadline": "string",
  "primaryCTA": "string",
  "sections": ["kind1", "kind2", "..."],
  "rationale": "uma linha explicando as escolhas"
}`;

export function montarPromptDeEstrategia(
  profile: BusinessProfile,
  contexto: { nome: string; cidade?: string; temFotos: boolean; nota?: number; avaliacoes?: number }
): string {
  return `NEGÓCIO
Nome: ${contexto.nome}
Segmento: ${profile.label} (${profile.mainNiche} › ${profile.businessType}${profile.subNiche ? " › " + profile.subNiche : ""})
Cidade: ${contexto.cidade ?? "não informada"}
Confiança da classificação: ${profile.confidence} (${profile.confidenceBand})
Meta de conversão: ${profile.primaryConversionGoal}
Tom de voz: ${profile.toneOfVoice}
Setor regulado: ${profile.regulated ? "sim" : "não"}

EVIDÊNCIAS DISPONÍVEIS
Serviços confirmados: ${profile.confirmedServices.length > 0 ? profile.confirmedServices.join(", ") : "nenhum"}
Fotos reais do negócio: ${contexto.temFotos ? "sim" : "não"}
Nota no Google: ${contexto.nota && contexto.avaliacoes ? `${contexto.nota} com ${contexto.avaliacoes} avaliações` : "não disponível"}

VOCABULÁRIO PROIBIDO (não pode aparecer em nenhum texto)
${profile.forbiddenAssumptions.join(", ") || "nenhum"}

SEÇÕES DISPONÍVEIS
trust, services, about, gallery, reviews, location, process, cta

Sugestão de fluxo para este segmento: ${profile.sectionFlow.join(" → ")}`;
}
