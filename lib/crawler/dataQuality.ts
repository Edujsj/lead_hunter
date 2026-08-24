// ============================================================
// Medição de qualidade — as regras da auditoria viram código
// ------------------------------------------------------------
// O reviewsCount ficou zerado em 100% dos leads sem ninguém perceber.
// Isso só é possível porque nada media o resultado. Este módulo roda ao
// fim de cada rastreamento e diz, em uma linha, o quanto veio preenchido
// e o que veio suspeito.
// ============================================================

import { Lead } from "@/lib/types";
import { looksLikeAddress, sanitizePhone } from "./fieldGuards";

export interface TaxaDeCampo {
  campo: string;
  preenchidos: number;
  total: number;
  taxa: number;
}

export interface Suspeita {
  regra: string;
  descricao: string;
  afetados: number;
  exemplos: string[];
}

export interface ResumoQualidade {
  total: number;
  campos: TaxaDeCampo[];
  suspeitas: Suspeita[];
  /** 0 a 100 — média das taxas dos campos que sustentam a abordagem */
  pontuacao: number;
}

const preenchido = (valor: unknown): boolean => {
  if (Array.isArray(valor)) return valor.length > 0;
  if (typeof valor === "number") return valor > 0;
  if (typeof valor === "object" && valor !== null) {
    return Object.keys(valor).length > 0;
  }
  return Boolean(valor);
};

/** Campos que decidem se dá para abordar o lead */
const CAMPOS_ESSENCIAIS = ["phone", "address", "reviewsCount"] as const;

const CAMPOS_MEDIDOS: { campo: string; ler: (l: Lead) => unknown }[] = [
  { campo: "title", ler: (l) => l.title },
  { campo: "phone", ler: (l) => sanitizePhone(l.phone) },
  { campo: "address", ler: (l) => l.address },
  { campo: "rating", ler: (l) => l.rating },
  { campo: "reviewsCount", ler: (l) => l.reviewsCount },
  { campo: "category", ler: (l) => l.category },
  { campo: "originalWebsite", ler: (l) => l.originalWebsite },
  { campo: "photos", ler: (l) => l.photos },
  { campo: "openingHours", ler: (l) => l.openingHours },
];

const REGRAS: { regra: string; descricao: string; teste: (l: Lead) => boolean }[] = [
  {
    regra: "telefone_invalido",
    descricao: "campo de telefone preenchido com algo que não é telefone",
    teste: (l) => Boolean(l.phone) && sanitizePhone(l.phone) === "",
  },
  {
    regra: "endereco_sem_logradouro",
    descricao: "endereço sem tipo de logradouro nem número",
    teste: (l) => Boolean(l.address) && !looksLikeAddress(l.address),
  },
  {
    regra: "endereco_igual_categoria",
    descricao: "categoria vazou para o campo de endereço",
    teste: (l) =>
      Boolean(l.address) &&
      Boolean(l.category) &&
      l.address.trim().toLowerCase() === l.category.trim().toLowerCase(),
  },
  {
    regra: "nota_sem_avaliacoes",
    descricao: "nota preenchida com contagem de avaliações zerada",
    teste: (l) => l.rating > 0 && l.reviewsCount === 0,
  },
  {
    regra: "nota_fora_da_escala",
    descricao: "nota fora do intervalo de 0 a 5",
    teste: (l) => l.rating < 0 || l.rating > 5,
  },
  {
    regra: "site_sem_protocolo",
    descricao: "URL gravada sem http/https",
    teste: (l) => Boolean(l.originalWebsite) && !/^https?:\/\//i.test(l.originalWebsite!),
  },
];

export function resumirQualidade(leads: Lead[]): ResumoQualidade {
  const total = leads.length;
  if (total === 0) {
    return { total: 0, campos: [], suspeitas: [], pontuacao: 0 };
  }

  const campos = CAMPOS_MEDIDOS.map(({ campo, ler }) => {
    const preenchidos = leads.filter((l) => preenchido(ler(l))).length;
    return { campo, preenchidos, total, taxa: preenchidos / total };
  });

  const suspeitas = REGRAS.map(({ regra, descricao, teste }) => {
    const atingidos = leads.filter(teste);
    return {
      regra,
      descricao,
      afetados: atingidos.length,
      exemplos: atingidos.slice(0, 3).map((l) => l.title),
    };
  }).filter((s) => s.afetados > 0);

  const essenciais = campos.filter((c) =>
    (CAMPOS_ESSENCIAIS as readonly string[]).includes(c.campo)
  );
  const pontuacao = Math.round(
    (essenciais.reduce((soma, c) => soma + c.taxa, 0) / essenciais.length) * 100
  );

  return { total, campos, suspeitas, pontuacao };
}

/** Uma linha por rastreamento, legível no log do servidor */
export function formatarResumo(resumo: ResumoQualidade): string {
  if (resumo.total === 0) return "📊 Qualidade: nenhum lead para medir";

  const pct = (t: number) => `${Math.round(t * 100)}%`;
  const destaque = resumo.campos
    .filter((c) => ["phone", "address", "reviewsCount", "photos"].includes(c.campo))
    .map((c) => `${c.campo} ${pct(c.taxa)}`)
    .join(" · ");

  const alertas =
    resumo.suspeitas.length > 0
      ? "\n[crawler]    ⚠️  " +
        resumo.suspeitas
          .map((s) => `${s.regra}: ${s.afetados}/${resumo.total}`)
          .join(" | ")
      : "";

  return `📊 Qualidade ${resumo.pontuacao}/100 — ${destaque}${alertas}`;
}
