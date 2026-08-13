// ============================================================
// Design Kit — paleta adaptada por empresa, com contraste garantido
// ============================================================

import { describe, it, expect } from "vitest";
import {
  contrastRatio,
  ensureContrast,
  isNeutral,
  parseColor,
  readableOn,
} from "../lib/design/color";
import {
  auditKitContrast,
  buildDesignKit,
  deriveAccent,
  googleFontsHref,
  hashString,
  pickBrandColor,
} from "../lib/design/kit";
import { ARCHETYPES, resolveArchetype } from "../lib/design/niches";

describe("color", () => {
  it("normaliza hex curto, longo, rgb e hsl", () => {
    expect(parseColor("#FFF")).toBe("#ffffff");
    expect(parseColor("#1E3A5F")).toBe("#1e3a5f");
    expect(parseColor("#1e3a5fcc")).toBe("#1e3a5f");
    expect(parseColor("rgb(30, 58, 95)")).toBe("#1e3a5f");
    expect(parseColor("rgba(30 58 95 / 0.5)")).toBe("#1e3a5f");
    expect(parseColor("hsl(210, 52%, 25%)")).toBe("#1f4061");
    // Tailwind/shadcn guardam canais soltos em `--primary`
    expect(parseColor("0 75% 15%")).toBe("#430a0a");
    expect(parseColor("36 60% 49%")).toBe("#c88c32");
  });

  it("devolve null para entrada inválida", () => {
    expect(parseColor("")).toBeNull();
    expect(parseColor("nope")).toBeNull();
    expect(parseColor(undefined)).toBeNull();
  });

  it("calcula contraste WCAG conhecido", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 3);
  });

  it("escolhe preto ou branco pelo maior contraste", () => {
    expect(readableOn("#ffffff")).toBe("#0f172a");
    expect(readableOn("#0f172a")).toBe("#ffffff");
  });

  it("ensureContrast atinge a razão pedida preservando o matiz", () => {
    // Amarelo saturado é ilegível sobre branco até escurecer
    const fixed = ensureContrast("#facc15", "#ffffff", 4.5);
    expect(contrastRatio(fixed, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(fixed).not.toBe("#000000"); // escureceu, não virou preto
  });

  it("classifica cinza/quase-branco/quase-preto como neutro", () => {
    expect(isNeutral("#808080")).toBe(true);
    expect(isNeutral("#fdfdfd")).toBe(true);
    expect(isNeutral("#050505")).toBe(true);
    expect(isNeutral("#0284c7")).toBe(false);
  });
});

describe("resolveArchetype", () => {
  it("mapeia categorias reais para o arquétipo certo", () => {
    expect(resolveArchetype("Clínicas").id).toBe("health");
    expect(resolveArchetype("Oficina Mecânica").id).toBe("auto");
    expect(resolveArchetype("Restaurantes").id).toBe("food");
    expect(resolveArchetype("Salões de Beleza").id).toBe("beauty");
    expect(resolveArchetype("Academias").id).toBe("fitness");
    expect(resolveArchetype("Pet Shop").id).toBe("pet");
  });

  it("cai no genérico quando não conhece a categoria", () => {
    expect(resolveArchetype("Serralheria Artística").id).toBe("generic");
  });
});

describe("pickBrandColor", () => {
  it("prefere a cor do logo à cor declarada no site", () => {
    const picked = pickBrandColor({
      logoDominantColor: "#c026d3",
      primaryColor: "#0284c7",
    });
    expect(picked).toEqual({ color: "#c026d3", source: "logo" });
  });

  it("ignora cor de logo monocromático e usa a do site", () => {
    const picked = pickBrandColor({
      logoDominantColor: "#3a3a3a",
      primaryColor: "#0284c7",
    });
    expect(picked).toEqual({ color: "#0284c7", source: "site" });
  });

  it("sem sinal de marca, sinaliza o fallback de nicho", () => {
    expect(pickBrandColor(undefined).source).toBe("niche");
    expect(pickBrandColor({ logoDominantColor: "#ffffff" }).source).toBe("niche");
  });
});

describe("deriveAccent", () => {
  it("mantém o acento do nicho quando ele já contrasta em matiz", () => {
    expect(deriveAccent("#0284c7", "#a16207")).toBe("#a16207");
  });

  it("gira para o complementar quando acento e primária se confundem", () => {
    const accent = deriveAccent("#0284c7", "#0891b2");
    expect(accent).not.toBe("#0891b2");
    expect(contrastRatio(accent, "#0284c7")).toBeGreaterThan(1.2);
  });
});

describe("buildDesignKit", () => {
  const base = { title: "Clínica São Lucas", category: "Clínicas" };

  it("é determinístico para a mesma empresa", () => {
    const a = buildDesignKit(base);
    const b = buildDesignKit(base);
    expect(a.layout).toBe(b.layout);
    expect(a.palette).toEqual(b.palette);
  });

  it("usa a paleta do nicho quando não há dado de marca", () => {
    const kit = buildDesignKit(base);
    expect(kit.archetypeId).toBe("health");
    expect(kit.colorSource).toBe("niche");
    expect(kit.hasRealLogo).toBe(false);
  });

  it("adota a cor do logo real como primária", () => {
    const kit = buildDesignKit({
      ...base,
      brand: { logoUrl: "https://ex.com/logo.png", logoDominantColor: "#7c3aed" },
    });
    expect(kit.colorSource).toBe("logo");
    expect(kit.hasRealLogo).toBe(true);
    // Mesmo matiz do logo, luminosidade ajustada para servir de fundo de botão
    expect(kit.palette.primary).not.toBe("#0284c7");
    expect(kit.palette.primary.toLowerCase()).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("gera layouts diferentes para empresas diferentes do mesmo nicho", () => {
    const names = [
      "Clínica São Lucas",
      "Clínicas Gomes",
      "Instituto Clínicas Pereira",
      "Clínicas Express",
      "Clínicas Max",
      "Clínicas VIP",
    ];
    const layouts = new Set(
      names.map((title) => buildDesignKit({ title, category: "Clínicas" }).layout)
    );
    expect(layouts.size).toBeGreaterThan(1);
  });

  it("todo arquétipo passa no contraste mínimo WCAG AA", () => {
    for (const archetype of ARCHETYPES) {
      const kit = buildDesignKit({
        title: `Empresa ${archetype.id}`,
        category: archetype.aliases[0],
      });
      const audit = auditKitContrast(kit);
      expect.soft(audit["text/surface"], `${archetype.id} text/surface`).toBeGreaterThanOrEqual(4.5);
      expect.soft(audit["textMuted/surface"], `${archetype.id} textMuted/surface`).toBeGreaterThanOrEqual(4.5);
      expect.soft(audit["onPrimary/primary"], `${archetype.id} onPrimary/primary`).toBeGreaterThanOrEqual(4.5);
      expect.soft(audit["onAccent/accent"], `${archetype.id} onAccent/accent`).toBeGreaterThanOrEqual(4.5);
      expect.soft(audit["brandText/card"], `${archetype.id} brandText/card`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("mantém contraste mesmo com cor de marca difícil", () => {
    // Amarelo puro e ciano claro são os casos que costumam quebrar
    for (const brandColor of ["#ffe600", "#00e5ff", "#ff0090", "#003049"]) {
      const kit = buildDesignKit({
        title: "Marca Difícil",
        category: "Restaurantes",
        brand: { logoDominantColor: brandColor },
      });
      const audit = auditKitContrast(kit);
      expect.soft(audit["onPrimary/primary"], brandColor).toBeGreaterThanOrEqual(4.5);
      expect.soft(audit["text/surface"], brandColor).toBeGreaterThanOrEqual(4.5);
      expect.soft(audit["brandText/card"], brandColor).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("monta o href do Google Fonts com as duas famílias", () => {
    const kit = buildDesignKit({ title: "Bella Hair", category: "Salão de Beleza" });
    expect(kit.fonts.googleHref).toContain("family=Playfair+Display");
    expect(kit.fonts.googleHref).toContain("family=Inter");
    expect(kit.fonts.googleHref).toContain("display=swap");
  });

  it("googleFontsHref não duplica famílias repetidas", () => {
    const href = googleFontsHref(["IBM Plex Sans", "IBM Plex Sans"]);
    expect(href.match(/family=/g)).toHaveLength(1);
  });

  it("hashString é estável e não negativo", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).toBeGreaterThanOrEqual(0);
  });
});
