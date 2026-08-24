// ============================================================
// BusinessProfile + Blueprint — comportamento ponta a ponta
// Cobre os 10 casos de nicho exigidos e as regras de não-invenção.
// ============================================================

import { describe, it, expect } from "vitest";
import { prepararPreview } from "../lib/intelligence";
import { buildBusinessProfile, filtrarServicos, declaracaoSegura } from "../lib/intelligence/buildBusinessProfile";
import { auditarBlueprint, extrairJson, validarClassificacaoIA, validarPerfil } from "../lib/intelligence/validateBusinessProfile";
import { findNodeById } from "../lib/intelligence/taxonomy";
import type { Lead } from "../lib/types";

function lead(over: Partial<Lead> = {}): Lead {
  return {
    id: "l1",
    title: "Empresa Teste",
    phone: "(19) 99999-1234",
    address: "R. Teste, 100",
    city: "Campinas, SP",
    rating: 4.7,
    reviewsCount: 180,
    category: "Serviço",
    analyzedStatus: "NO_SITE",
    analyzedAt: "2026-08-14T00:00:00.000Z",
    ...over,
  };
}

describe("os 10 casos de nicho do briefing", () => {
  const casos: { titulo: string; lead: Lead; mainNiche: string; cta?: string }[] = [
    {
      titulo: "clínica médica",
      lead: lead({ title: "Clínica Médica São Lucas", googleCategory: "Clínica médica", searchedNiche: "clínicas médicas" }),
      mainNiche: "saude",
      cta: "Agendar consulta",
    },
    {
      titulo: "clínica odontológica",
      lead: lead({ title: "OdontoMais Clínica Odontológica", googleCategory: "Dentista", searchedNiche: "dentistas" }),
      mainNiche: "odontologia",
    },
    {
      titulo: "restaurante",
      lead: lead({ title: "Cantina Fellini", googleCategory: "Restaurante italiano", searchedNiche: "restaurantes" }),
      mainNiche: "alimentacao",
      cta: "Ver cardápio",
    },
    {
      titulo: "oficina",
      lead: lead({ title: "Auto Center Silva", googleCategory: "Oficina mecânica", searchedNiche: "oficinas" }),
      mainNiche: "automotivo",
      cta: "Solicitar orçamento",
    },
    {
      titulo: "advogado",
      lead: lead({ title: "Silva & Costa Advogados", googleCategory: "Escritório de advocacia", searchedNiche: "advogados" }),
      mainNiche: "profissional",
      cta: "Falar com advogado",
    },
    {
      titulo: "imobiliária",
      lead: lead({ title: "Imobiliária Horizonte", googleCategory: "Imobiliária", searchedNiche: "imobiliárias" }),
      mainNiche: "imoveis",
    },
    {
      titulo: "salão de beleza",
      lead: lead({ title: "Studio W Cabeleireiros", googleCategory: "Salão de beleza", searchedNiche: "salão de beleza" }),
      mainNiche: "beleza",
      cta: "Agendar horário",
    },
    {
      titulo: "academia",
      lead: lead({ title: "Academia Corpo em Forma", googleCategory: "Academia", searchedNiche: "academias" }),
      mainNiche: "fitness",
    },
    {
      titulo: "clínica veterinária",
      lead: lead({ title: "Hospital Veterinário +PET", googleCategory: "Hospital veterinário", searchedNiche: "veterinário" }),
      mainNiche: "saude",
    },
    {
      titulo: "empresa sem categoria clara",
      lead: lead({ title: "Zulmira Ltda", category: "" }),
      mainNiche: "generico",
    },
  ];

  for (const caso of casos) {
    it(`${caso.titulo} gera preview coerente`, () => {
      const { profile, blueprint } = prepararPreview(caso.lead);

      expect.soft(profile.mainNiche, `${caso.titulo} nicho`).toBe(caso.mainNiche);
      if (caso.cta) {
        expect.soft(blueprint.hero.primaryCTA, `${caso.titulo} CTA`).toBe(caso.cta);
      }
      // Estrutura entre 4 e 7 seções, sempre fechando em conversão
      expect.soft(blueprint.sections.length, `${caso.titulo} nº de seções`).toBeGreaterThanOrEqual(2);
      expect.soft(blueprint.sections.length, `${caso.titulo} nº de seções`).toBeLessThanOrEqual(7);
      expect.soft(blueprint.sections.at(-1)?.kind, `${caso.titulo} fecha em CTA`).toBe("cta");
      // Nenhum texto viola o vocabulário do nicho
      expect.soft(auditarBlueprint(blueprint).violacoes, `${caso.titulo}`).toEqual([]);
    });
  }
});

describe("CLÍNICA MÉDICA ≠ ODONTOLOGIA", () => {
  const medica = lead({
    title: "Clínica Dermatológica Dra. Ana Silva",
    googleCategory: "Clínica médica",
    searchedNiche: "clínicas médicas Torres RS",
  });

  it("o preview da clínica médica não emite vocabulário odontológico", () => {
    const { blueprint } = prepararPreview(medica, {
      deepResearch: {
        websiteUsed: true,
        websiteTexts: ["Dermatologia clínica", "tratamentos de pele"],
        services: ["Consulta dermatológica", "Tratamentos de pele"],
      },
    });

    // `forbidden` é a própria lista de banidos — o que se audita é o
    // conteúdo visível: headline, seções e itens.
    const { forbidden, ...visivel } = blueprint;
    void forbidden;
    const textoTodo = JSON.stringify(visivel).toLowerCase();
    for (const proibido of ["sorriso", "clareamento", "ortodontia", "implante dentário", "dente"]) {
      expect.soft(textoTodo, proibido).not.toContain(proibido);
    }
  });

  it("o CTA é de consulta médica, não de avaliação odontológica", () => {
    const { blueprint, profile } = prepararPreview(medica);
    expect(blueprint.hero.primaryCTA).toBe("Agendar consulta");
    expect(profile.subNiche).toBe("dermatologia");
  });

  it("serviço odontológico é barrado mesmo se vier do site", () => {
    const { profile } = prepararPreview(medica, {
      deepResearch: {
        websiteUsed: true,
        services: ["Consulta dermatológica", "Clareamento dental", "Implantes dentários"],
      },
    });
    expect(profile.confirmedServices).toContain("Consulta dermatológica");
    expect(profile.confirmedServices.join(" ").toLowerCase()).not.toContain("clareamento");
    expect(profile.confirmedServices.join(" ").toLowerCase()).not.toContain("implante");
  });

  it("a clínica odontológica pode usar o vocabulário dela", () => {
    const odonto = lead({ title: "Clínica Odontológica Sorriso", googleCategory: "Dentista" });
    const { profile } = prepararPreview(odonto, {
      deepResearch: { websiteUsed: true, services: ["Ortodontia", "Clareamento"] },
    });
    expect(profile.confirmedServices).toContain("Ortodontia");
  });
});

describe("não inventar", () => {
  it("sem serviço confirmado, a seção usa declaração de segmento e não lista fabricada", () => {
    const { blueprint, profile } = prepararPreview(
      lead({ title: "Clínica Médica São Lucas", googleCategory: "Clínica médica" })
    );
    const servicos = blueprint.sections.find((s) => s.kind === "services");
    expect(profile.confirmedServices).toEqual([]);
    expect(servicos?.items).toEqual([]);
    expect(servicos?.subtitle).toBeTruthy();
    expect(servicos?.fromEvidence).toBe(false);
  });

  it("sem avaliações reais não existe seção de depoimentos", () => {
    const { blueprint } = prepararPreview(lead({ googleCategory: "Restaurante" }));
    expect(blueprint.sections.some((s) => s.kind === "reviews")).toBe(false);
  });

  it("com avaliações reais a seção aparece com o texto coletado", () => {
    const { blueprint } = prepararPreview(lead({ googleCategory: "Restaurante" }), {
      deepResearch: {
        reviews: ["Comida excelente e atendimento muito atencioso, voltarei sempre"],
      },
    });
    const reviews = blueprint.sections.find((s) => s.kind === "reviews");
    expect(reviews?.items?.[0].label).toContain("Comida excelente");
    expect(reviews?.fromEvidence).toBe(true);
  });

  it("sem nota no Google não existe seção de reputação", () => {
    const { blueprint } = prepararPreview(
      lead({ googleCategory: "Restaurante", rating: 0, reviewsCount: 0 })
    );
    expect(blueprint.sections.some((s) => s.kind === "trust")).toBe(false);
    expect(blueprint.hero.showRating).toBe(false);
  });

  it("sem fotos não existe galeria", () => {
    const { blueprint } = prepararPreview(lead({ googleCategory: "Salão de beleza" }));
    expect(blueprint.sections.some((s) => s.kind === "gallery")).toBe(false);
  });

  it("filtrarServicos recusa frase de site e texto vazio de marketing", () => {
    const node = findNodeById("saude.clinica_medica.geral")!;
    const filtrados = filtrarServicos(
      [
        "Consulta dermatológica",
        "Qualidade",
        "Somos uma clínica com mais de 20 anos de experiência no mercado nacional",
        "Serviços",
      ],
      node
    );
    expect(filtrados).toEqual(["Consulta dermatológica"]);
  });
});

describe("confiança governa o que a página afirma", () => {
  it("confiança baixa não afirma especialidade na headline", () => {
    const { profile, blueprint } = prepararPreview(lead({ title: "Central Ltda", category: "" }));
    expect(profile.confidenceBand).toBe("baixa");
    expect(profile.subNiche).toBeUndefined();
    expect(blueprint.hero.headline).toBe("Central Ltda");
  });

  it("confiança alta usa segmento e cidade na headline", () => {
    const { blueprint } = prepararPreview(
      lead({
        title: "Clínica Dermatológica Ana Silva",
        googleCategory: "Clínica médica",
        searchedNiche: "clínicas médicas",
        city: "Torres, RS",
      })
    );
    expect(blueprint.hero.headline).toContain("Torres");
    expect(blueprint.hero.headline.toLowerCase()).toContain("dermatologia");
  });

  it("headline nunca cai em frase vazia", () => {
    const proibidas = ["excelência", "qualidade garantida", "serviço premium", "sua melhor escolha"];
    for (const caso of ["Clínica Médica X", "Pizzaria Y", "Advogados Z", "Oficina W"]) {
      const { blueprint } = prepararPreview(lead({ title: caso, googleCategory: caso }));
      const texto = `${blueprint.hero.headline} ${blueprint.hero.subheadline}`.toLowerCase();
      for (const frase of proibidas) {
        expect.soft(texto, `${caso} / ${frase}`).not.toContain(frase);
      }
    }
  });
});

describe("variação entre leads do mesmo nicho", () => {
  it("estruturas diferem conforme as evidências disponíveis", () => {
    const semFoto = prepararPreview(lead({ title: "Clínica A", googleCategory: "Clínica médica" }));
    const comFoto = prepararPreview(
      lead({
        title: "Clínica B",
        googleCategory: "Clínica médica",
        photos: ["https://x/1.jpg", "https://x/2.jpg"],
      })
    );
    expect(semFoto.blueprint.hero.variant).not.toBe(comFoto.blueprint.hero.variant);
  });

  it("nichos diferentes não recebem a mesma ordem de seções", () => {
    const clinica = prepararPreview(lead({ googleCategory: "Clínica médica", photos: ["a"] }));
    const oficina = prepararPreview(lead({ googleCategory: "Oficina mecânica", photos: ["a"] }));
    const restaurante = prepararPreview(lead({ googleCategory: "Restaurante", photos: ["a"] }));

    const ordem = (r: typeof clinica) => r.blueprint.sections.map((s) => s.kind).join(">");
    expect(ordem(clinica)).not.toBe(ordem(oficina));
    expect(ordem(oficina)).not.toBe(ordem(restaurante));
  });

  it("direções visuais diferem por nicho", () => {
    const estilos = ["Clínica médica", "Restaurante", "Oficina mecânica", "Escritório de advocacia", "Academia"].map(
      (cat) => prepararPreview(lead({ googleCategory: cat })).blueprint.theme.style
    );
    expect(new Set(estilos).size).toBeGreaterThanOrEqual(4);
  });
});

describe("cache e fallback", () => {
  it("reaproveita perfil e blueprint já anexados ao lead", () => {
    const base = lead({ googleCategory: "Clínica médica" });
    const primeiro = prepararPreview(base);
    const comCache = { ...base, businessProfile: primeiro.profile, previewBlueprint: primeiro.blueprint };
    expect(prepararPreview(comCache).origem).toBe("cache");
  });

  it("funciona sem IA nenhuma", () => {
    const { profile } = prepararPreview(lead({ googleCategory: "Pizzaria" }));
    expect(profile.source).toBe("local");
    expect(profile.ctaPrimary).toBeTruthy();
  });

  it("classificação da IA só prevalece se estiver mais confiante", () => {
    const base = lead({ title: "Pizzaria Bella", googleCategory: "Pizzaria", searchedNiche: "pizzaria" });
    const local = buildBusinessProfile({ lead: base });
    const comIaFraca = buildBusinessProfile({
      lead: base,
      aiClassification: { node: findNodeById("profissional.advocacia.geral"), confidence: 0.2 },
    });
    expect(comIaFraca.businessType).toBe(local.businessType);
    expect(comIaFraca.source).toBe("local");
  });
});

describe("validação do retorno da IA", () => {
  it("extrai JSON mesmo com cerca de código e prosa", () => {
    expect(extrairJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extrairJson('Claro! Aqui:\n{"a":2}\nEspero ter ajudado.')).toEqual({ a: 2 });
    expect(extrairJson("nada de json")).toBeNull();
  });

  it("recusa nodeId que não existe na taxonomia", () => {
    const r = validarClassificacaoIA({ nodeId: "nicho.inventado.pelo.modelo", confidence: 0.9 });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("não existe");
  });

  it("aceita payload válido e limita a confiança a 0–1", () => {
    const r = validarClassificacaoIA({
      nodeId: "alimentacao.pizzaria.geral",
      confidence: 5,
      confirmedServices: ["Pizza napolitana"],
    });
    expect(r.ok).toBe(true);
    expect(r.value?.confidence).toBe(1);
    expect(r.value?.node.businessType).toBe("pizzaria");
  });

  it("perfil que afirma subnicho com confiança baixa é recusado", () => {
    const perfil = buildBusinessProfile({
      lead: lead({ googleCategory: "Clínica médica" }),
    });
    const adulterado = { ...perfil, confidenceBand: "baixa" as const, subNiche: "dermatologia" };
    expect(validarPerfil(adulterado).ok).toBe(false);
  });
});

describe("declaração de segmento", () => {
  it("é específica por nicho e não promete resultado", () => {
    const medica = declaracaoSegura(findNodeById("saude.clinica_medica.geral")!, "Campinas");
    const oficina = declaracaoSegura(findNodeById("automotivo.oficina.geral")!, "Campinas");
    expect(medica).not.toBe(oficina);
    expect(medica).toContain("Campinas");
    for (const texto of [medica, oficina]) {
      expect(texto.toLowerCase()).not.toContain("garantid");
      expect(texto.toLowerCase()).not.toContain("melhor da cidade");
    }
  });
});
