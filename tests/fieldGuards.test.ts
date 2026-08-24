// ============================================================
// Guardas de campo e medição de qualidade
// Casos vindos direto da auditoria feita sobre dados reais.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  looksLikeAddress,
  parseRatingFromLabel,
  parseReviewCountFromLabel,
  sanitizeAddress,
  sanitizeCategory,
  sanitizePhone,
  splitCardTexts,
} from "../lib/crawler/fieldGuards";
import { resumirQualidade, formatarResumo } from "../lib/crawler/dataQuality";
import { analyzeUrl } from "../lib/urlAnalyzer";
import type { Lead } from "../lib/types";

describe("sanitizePhone", () => {
  it("recusa o texto de interface que o crawler gravava como telefone", () => {
    expect(sanitizePhone("Ver no Google Maps")).toBe("");
    expect(sanitizePhone("Website")).toBe("");
    expect(sanitizePhone("Como chegar")).toBe("");
    expect(sanitizePhone("Ligar")).toBe("");
  });

  it("formata fixo e celular válidos", () => {
    expect(sanitizePhone("1932314492")).toBe("(19) 3231-4492");
    expect(sanitizePhone("19993854476")).toBe("(19) 99385-4476");
    expect(sanitizePhone("+55 19 99385-4476")).toBe("(19) 99385-4476");
  });

  it("recusa DDD que não existe", () => {
    expect(sanitizePhone("(00) 3231-4492")).toBe("");
    expect(sanitizePhone("(20) 3231-4492")).toBe("");
    expect(sanitizePhone("(23) 3231-4492")).toBe("");
  });

  it("recusa quantidade de dígitos implausível", () => {
    expect(sanitizePhone("123")).toBe("");
    expect(sanitizePhone("1932314492999")).toBe("");
  });

  it("recusa celular que não começa com 9 e fixo que começa com 9", () => {
    expect(sanitizePhone("19893854476")).toBe("");
    expect(sanitizePhone("1993854476")).toBe("");
  });

  it("aceita vazio e nulo sem quebrar", () => {
    expect(sanitizePhone("")).toBe("");
    expect(sanitizePhone(null)).toBe("");
    expect(sanitizePhone(undefined)).toBe("");
  });
});

describe("looksLikeAddress", () => {
  it("reconhece endereço com logradouro ou número", () => {
    expect(looksLikeAddress("R. Oriente, 35")).toBe(true);
    expect(looksLikeAddress("Av. Marechal Carmona, 596")).toBe(true);
    expect(looksLikeAddress("Rodovia Dom Pedro I, km 87")).toBe(true);
  });

  it("recusa texto de categoria", () => {
    expect(looksLikeAddress("Loja de suprimentos para animais de estimação")).toBe(false);
    expect(looksLikeAddress("Pet Shop")).toBe(false);
    expect(looksLikeAddress("Hospital veterinário")).toBe(false);
  });
});

describe("sanitizeAddress", () => {
  it("remove o separador visual que vinha colado no endereço", () => {
    expect(sanitizeAddress("· R. Oriente, 35")).toBe("R. Oriente, 35");
    expect(sanitizeAddress("• Av. Brasil, 119")).toBe("Av. Brasil, 119");
    expect(sanitizeAddress("  ·  R. da Abolição, 2344")).toBe("R. da Abolição, 2344");
  });

  it("recusa quando a categoria vazou para o campo", () => {
    expect(
      sanitizeAddress(
        "Loja de suprimentos para animais de estimação",
        "Loja de suprimentos para animais de estimação"
      )
    ).toBe("");
  });

  it("recusa texto que não parece endereço", () => {
    expect(sanitizeAddress("Pet Shop")).toBe("");
    expect(sanitizeAddress("Ver no Google Maps")).toBe("");
    expect(sanitizeAddress("")).toBe("");
  });
});

describe("sanitizeCategory", () => {
  it("aceita rótulo curto e recusa endereço no lugar da categoria", () => {
    expect(sanitizeCategory("Pet Shop")).toBe("Pet Shop");
    expect(sanitizeCategory("· Clínica veterinária")).toBe("Clínica veterinária");
    expect(sanitizeCategory("R. Oriente, 35", "Pet Shop")).toBe("Pet Shop");
  });

  it("cai no fallback quando vem vazio ou longo demais", () => {
    expect(sanitizeCategory("", "Pet Shop")).toBe("Pet Shop");
    expect(sanitizeCategory("a".repeat(80), "Pet Shop")).toBe("Pet Shop");
  });
});

describe("splitCardTexts", () => {
  it("separa categoria de endereço mesmo com categoria longa", () => {
    // Caso real: a categoria tem 44 caracteres e caía no campo de endereço
    const resultado = splitCardTexts(
      [
        "Cobasi Ruy Rodrigues",
        "4,5",
        "(250)",
        "Loja de suprimentos para animais de estimação",
        "· Av. Ruy Rodriguez, 1000",
      ],
      { name: "Cobasi Ruy Rodrigues", fallbackCategory: "Pet Shop" }
    );

    expect(resultado.address).toBe("Av. Ruy Rodriguez, 1000");
    expect(resultado.category).toBe("Loja de suprimentos para animais de estimação");
  });

  it("descarta nota, contagem e texto de botão", () => {
    const resultado = splitCardTexts(
      ["Pet Shop Dani", "4,7", "(88)", "250 avaliações", "Ver no Google Maps", "Pet shop", "· R. X, 12"],
      { name: "Pet Shop Dani", fallbackCategory: "Pet Shop" }
    );
    expect(resultado.address).toBe("R. X, 12");
    expect(resultado.category).toBe("Pet shop");
  });

  it("sem endereço reconhecível devolve vazio em vez de lixo", () => {
    const resultado = splitCardTexts(["Empresa X", "Pet Shop"], {
      name: "Empresa X",
      fallbackCategory: "Pet Shop",
    });
    expect(resultado.address).toBe("");
    expect(resultado.category).toBe("Pet Shop");
  });
});

describe("parseReviewCountFromLabel", () => {
  it("extrai a contagem do rótulo que mistura nota e avaliações", () => {
    // Era exatamente este formato que zerava reviewsCount em 100% dos leads
    expect(parseReviewCountFromLabel("4,5 estrelas 250 avaliações")).toBe(250);
    expect(parseReviewCountFromLabel("4.5 stars 1.234 avaliações")).toBe(1234);
    expect(parseReviewCountFromLabel("250 avaliações")).toBe(250);
  });

  it("entende o formato compacto do card", () => {
    expect(parseReviewCountFromLabel("(250)")).toBe(250);
    expect(parseReviewCountFromLabel("(1.234)")).toBe(1234);
  });

  it("não confunde a nota com a contagem", () => {
    expect(parseReviewCountFromLabel("4,5")).toBe(0);
    expect(parseReviewCountFromLabel("4,5 estrelas")).toBe(0);
  });

  it("devolve zero quando não há número", () => {
    expect(parseReviewCountFromLabel("")).toBe(0);
    expect(parseReviewCountFromLabel(null)).toBe(0);
    expect(parseReviewCountFromLabel("sem avaliações")).toBe(0);
  });
});

describe("parseRatingFromLabel", () => {
  it("lê a nota em vírgula e ponto", () => {
    expect(parseRatingFromLabel("4,5 estrelas 250 avaliações")).toBe(4.5);
    expect(parseRatingFromLabel("4.7 stars")).toBe(4.7);
  });

  it("limita à escala de 0 a 5", () => {
    expect(parseRatingFromLabel("9,9 estrelas")).toBe(5);
    expect(parseRatingFromLabel("")).toBe(0);
  });
});

// ─── Classificação de site ────────────────────────────────────────────────────

describe("analyzeUrl — bloqueio de robô", () => {
  const comStatus = (status: number) =>
    (async () =>
      ({
        ok: status < 400,
        status,
        url: "https://exemplo.com.br/",
      }) as Response) as unknown as typeof fetch;

  it("403 vira SITE_PROTECTED, não SITE_OFFLINE", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = comStatus(403);
    try {
      const r = await analyzeUrl("https://exemplo.com.br");
      expect(r.status).toBe("SITE_PROTECTED");
      expect(r.statusCode).toBe(403);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("429 também é bloqueio, não site morto", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = comStatus(429);
    try {
      expect((await analyzeUrl("https://exemplo.com.br")).status).toBe("SITE_PROTECTED");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("404 continua sendo site fora do ar", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = comStatus(404);
    try {
      expect((await analyzeUrl("https://exemplo.com.br")).status).toBe("SITE_OFFLINE");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("500 continua sendo site fora do ar", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = comStatus(500);
    try {
      expect((await analyzeUrl("https://exemplo.com.br")).status).toBe("SITE_OFFLINE");
    } finally {
      globalThis.fetch = original;
    }
  });
});

// ─── Medição ──────────────────────────────────────────────────────────────────

const leadBase: Lead = {
  id: "1",
  title: "Pet Shop Bom",
  phone: "(19) 99385-4476",
  address: "R. Oriente, 35",
  city: "Campinas",
  rating: 4.5,
  reviewsCount: 250,
  category: "Pet Shop",
  analyzedStatus: "NO_SITE",
  analyzedAt: "2026-08-13T00:00:00.000Z",
};

const leadRuim: Lead = {
  ...leadBase,
  id: "2",
  title: "Pet Shop Ruim",
  phone: "Ver no Google Maps",
  address: "Loja de suprimentos para animais de estimação",
  category: "Loja de suprimentos para animais de estimação",
  reviewsCount: 0,
};

describe("resumirQualidade", () => {
  it("mede preenchimento por campo", () => {
    const resumo = resumirQualidade([leadBase, leadRuim]);
    const telefone = resumo.campos.find((c) => c.campo === "phone");
    expect(telefone?.preenchidos).toBe(1);
    expect(telefone?.taxa).toBe(0.5);
  });

  it("acusa as suspeitas que a auditoria encontrou", () => {
    const regras = resumirQualidade([leadRuim]).suspeitas.map((s) => s.regra);
    expect(regras).toContain("telefone_invalido");
    expect(regras).toContain("endereco_sem_logradouro");
    expect(regras).toContain("endereco_igual_categoria");
    expect(regras).toContain("nota_sem_avaliacoes");
  });

  it("dá nota cheia quando os campos essenciais vêm completos", () => {
    expect(resumirQualidade([leadBase]).pontuacao).toBe(100);
    expect(resumirQualidade([leadRuim]).pontuacao).toBeLessThan(50);
  });

  it("não quebra com lista vazia", () => {
    const resumo = resumirQualidade([]);
    expect(resumo.total).toBe(0);
    expect(resumo.pontuacao).toBe(0);
    expect(formatarResumo(resumo)).toContain("nenhum lead");
  });

  it("o resumo em texto cabe no log", () => {
    const texto = formatarResumo(resumirQualidade([leadBase, leadRuim]));
    expect(texto).toContain("Qualidade");
    expect(texto).toContain("phone 50%");
  });
});
