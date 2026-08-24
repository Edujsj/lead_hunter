// ============================================================
// Classificação de negócio — casos reais e armadilhas conhecidas
// O caso central: CLÍNICA MÉDICA ≠ ODONTOLOGIA.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  calcularConfianca,
  classifyBusiness,
  faixaDeConfianca,
  normalizar,
  proibidosPara,
} from "../lib/intelligence/classifyBusiness";
import { TAXONOMY, forbiddenFor, findNodeById } from "../lib/intelligence/taxonomy";

describe("normalizar", () => {
  it("remove acento, caixa e pontuação", () => {
    expect(normalizar("Clínica Médica São Lucas")).toBe("clinica medica sao lucas");
    expect(normalizar("ODONTO-MAIS!")).toBe("odonto mais");
  });
});

describe("clínica médica não vira odontologia", () => {
  it("clínica médica pesquisada como clínica médica", () => {
    const r = classifyBusiness({
      name: "Clínica Médica São Lucas",
      googleCategory: "Clínica médica",
      searchedNiche: "clínicas médicas",
    });
    expect(r.node.mainNiche).toBe("saude");
    expect(r.node.businessType).toBe("clinica_medica");
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("dermatologia é reconhecida como subnicho de clínica médica", () => {
    const r = classifyBusiness({
      name: "Clínica Dermatológica Dra. Ana Silva",
      googleCategory: "Clínica médica",
      searchedNiche: "clínicas médicas Torres RS",
      websiteTexts: ["Dermatologia clínica", "tratamentos de pele e cabelo"],
    });
    expect(r.node.businessType).toBe("clinica_medica");
    expect(r.node.subNiche).toBe("dermatologia");
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("o vocabulário odontológico fica proibido para clínica médica", () => {
    const r = classifyBusiness({
      name: "Clínica Médica São Lucas",
      googleCategory: "Clínica médica",
    });
    const proibidos = proibidosPara(r.node);
    expect(proibidos).toContain("sorriso");
    expect(proibidos).toContain("clareamento");
    expect(proibidos).toContain("ortodontia");
    expect(proibidos.some((t) => t.includes("implante"))).toBe(true);
  });

  it("odontologia encontrada em busca por clínicas médicas continua odontologia", () => {
    // Caso do briefing: a evidência do nome vence o termo pesquisado
    const r = classifyBusiness({
      name: "OdontoMais Clínica Odontológica",
      googleCategory: "Clínica médica",
      searchedNiche: "clínicas médicas",
    });
    expect(r.node.mainNiche).toBe("odontologia");
    expect(r.node.businessType).toBe("clinica_odontologica");
  });

  it("odontologia legítima pode usar o vocabulário odontológico", () => {
    const r = classifyBusiness({
      name: "Clínica Odontológica Sorriso Certo",
      googleCategory: "Dentista",
    });
    expect(r.node.mainNiche).toBe("odontologia");
    expect(proibidosPara(r.node)).not.toContain("sorriso");
  });
});

describe("casos por nicho", () => {
  const casos: {
    titulo: string;
    entrada: Parameters<typeof classifyBusiness>[0];
    mainNiche: string;
    businessType?: string;
  }[] = [
    {
      titulo: "restaurante",
      entrada: { name: "Cantina Fellini", googleCategory: "Restaurante italiano", searchedNiche: "restaurantes" },
      mainNiche: "alimentacao",
      businessType: "restaurante",
    },
    {
      titulo: "pizzaria",
      entrada: { name: "Pizzaria Dom Pedro", googleCategory: "Pizzaria" },
      mainNiche: "alimentacao",
      businessType: "pizzaria",
    },
    {
      titulo: "oficina",
      entrada: { name: "Auto Center Silva", googleCategory: "Oficina mecânica", searchedNiche: "oficinas" },
      mainNiche: "automotivo",
      businessType: "oficina",
    },
    {
      titulo: "advocacia",
      entrada: { name: "Silva & Costa Advogados Associados", googleCategory: "Escritório de advocacia" },
      mainNiche: "profissional",
      businessType: "advocacia",
    },
    {
      titulo: "imobiliária",
      entrada: { name: "Imobiliária Horizonte", googleCategory: "Imobiliária" },
      mainNiche: "imoveis",
      businessType: "imobiliaria",
    },
    {
      titulo: "salão de beleza",
      entrada: { name: "Studio W", googleCategory: "Salão de beleza", searchedNiche: "salão de beleza" },
      mainNiche: "beleza",
      businessType: "salao",
    },
    {
      titulo: "academia",
      entrada: { name: "Academia Corpo em Forma", googleCategory: "Academia" },
      mainNiche: "fitness",
      businessType: "academia",
    },
    {
      titulo: "clínica veterinária",
      entrada: { name: "Hospital Veterinário +PET", googleCategory: "Hospital veterinário" },
      mainNiche: "saude",
      businessType: "veterinaria",
    },
    {
      titulo: "pet shop",
      entrada: { name: "Atacadão Super Pet", googleCategory: "Pet shop", searchedNiche: "pet shop" },
      mainNiche: "pets",
      businessType: "pet_shop",
    },
    {
      titulo: "contabilidade",
      entrada: { name: "Escritório Contábil Nova Era", googleCategory: "Escritório de contabilidade" },
      mainNiche: "profissional",
      businessType: "contabilidade",
    },
  ];

  for (const caso of casos) {
    it(`classifica ${caso.titulo}`, () => {
      const r = classifyBusiness(caso.entrada);
      expect.soft(r.node.mainNiche, `${caso.titulo} mainNiche`).toBe(caso.mainNiche);
      if (caso.businessType) {
        expect.soft(r.node.businessType, `${caso.titulo} businessType`).toBe(caso.businessType);
      }
      expect.soft(r.confidence, `${caso.titulo} confiança`).toBeGreaterThan(0.5);
    });
  }
});

describe("empresa sem categoria clara", () => {
  it("nome sem sinal nenhum cai no fallback", () => {
    const r = classifyBusiness({ name: "Zulmira Ltda" });
    expect(r.node.id).toContain("generico");
    expect(r.confidence).toBe(0);
    expect(faixaDeConfianca(r.confidence)).toBe("baixa");
  });

  it("sem nenhuma evidência não quebra", () => {
    const r = classifyBusiness({});
    expect(r.node.mainNiche).toBe("generico");
    expect(r.sourcesUsed).toEqual([]);
  });

  it("uma pista isolada não autoriza afirmação — fica na faixa baixa", () => {
    // "Empreendimentos" sugere construtora, "Casa" sugere imobiliária,
    // mas nenhum dos dois se confirma em outra fonte
    for (const nome of ["Empreendimentos Zulmira Ltda", "Casa & Cia", "Central Ltda"]) {
      const r = classifyBusiness({ name: nome });
      expect.soft(faixaDeConfianca(r.confidence), nome).toBe("baixa");
    }
  });

  it("a mesma pista confirmada por outra fonte sobe de faixa", () => {
    const isolado = classifyBusiness({ name: "Casa & Cia" });
    const confirmado = classifyBusiness({
      name: "Casa & Cia Imóveis",
      googleCategory: "Imobiliária",
      searchedNiche: "imobiliárias",
    });
    expect(confirmado.confidence).toBeGreaterThan(isolado.confidence);
    expect(faixaDeConfianca(confirmado.confidence)).not.toBe("baixa");
  });
});

describe("confiança", () => {
  it("cai quando dois nichos empatam", () => {
    const semConcorrente = calcularConfianca({
      melhorScore: 20,
      concorrenteScore: 0,
      fontesDistintas: 3,
    });
    const comEmpate = calcularConfianca({
      melhorScore: 20,
      concorrenteScore: 19,
      fontesDistintas: 3,
    });
    expect(semConcorrente).toBeGreaterThan(comEmpate);
    expect(comEmpate).toBeLessThan(0.8);
  });

  it("sinal isolado não produz confiança alta", () => {
    const r = classifyBusiness({ searchedNiche: "clínicas" });
    expect(r.confidence).toBeLessThan(0.8);
  });

  it("mais fontes concordando elevam a confiança", () => {
    const umaFonte = classifyBusiness({ googleCategory: "Pizzaria" });
    const tresFontes = classifyBusiness({
      name: "Pizzaria Bella Napoli",
      googleCategory: "Pizzaria",
      searchedNiche: "pizzaria",
      website: "https://pizzariabellanapoli.com.br",
    });
    expect(tresFontes.confidence).toBeGreaterThan(umaFonte.confidence);
  });

  it("faixas respeitam os limites do briefing", () => {
    expect(faixaDeConfianca(0.85)).toBe("alta");
    expect(faixaDeConfianca(0.6)).toBe("media");
    expect(faixaDeConfianca(0.3)).toBe("baixa");
  });
});

describe("integridade da taxonomia", () => {
  it("todo nó tem id único", () => {
    const ids = TAXONOMY.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todo nó declara CTA, direção visual e fluxo de seções", () => {
    for (const node of TAXONOMY) {
      expect.soft(node.ctaPrimary, `${node.id} cta`).toBeTruthy();
      expect.soft(node.visualDirection, `${node.id} visual`).toBeTruthy();
      expect.soft(node.sectionFlow.length, `${node.id} seções`).toBeGreaterThanOrEqual(4);
      expect.soft(node.sectionFlow, `${node.id} termina em cta`).toContain("cta");
    }
  });

  it("todo nó de saúde não-odontológica proíbe vocabulário odontológico", () => {
    for (const node of TAXONOMY.filter((n) => n.mainNiche === "saude")) {
      expect.soft(forbiddenFor(node), `${node.id}`).toContain("clareamento");
    }
  });

  it("o fluxo de seções cabe no limite de 4 a 7 seções", () => {
    for (const node of TAXONOMY) {
      expect.soft(node.sectionFlow.length, `${node.id}`).toBeLessThanOrEqual(7);
    }
  });

  it("nós referenciados por id existem", () => {
    expect(findNodeById("saude.clinica_medica.geral")).toBeDefined();
    expect(findNodeById("odontologia.clinica_odontologica.geral")).toBeDefined();
    expect(findNodeById("inexistente")).toBeUndefined();
  });
});
