// ============================================================
// Exportação — ZIP válido e site estático coerente com o kit
// ============================================================

import { describe, it, expect } from "vitest";
import { createZip, crc32 } from "../lib/export/zip";
import {
  buildCss,
  buildHtml,
  buildStaticSite,
  escapeHtml,
  slugify,
} from "../lib/export/staticSite";
import { buildDesignKit } from "../lib/design/kit";
import { prepararPreview } from "../lib/intelligence";
import type { Lead } from "../lib/types";

const lead: Lead = {
  id: "lead-1",
  title: "Clínica São Lucas",
  phone: "(19) 99999-1234",
  address: "Av. Brasil, 100",
  city: "Campinas, SP",
  rating: 4.8,
  reviewsCount: 214,
  category: "Clínicas",
  analyzedStatus: "NO_SITE",
  analyzedAt: "2026-08-12T00:00:00.000Z",
};

const leadComMarca: Lead = {
  ...lead,
  logoUrl: "https://cdn.exemplo.com/logo.png",
  photos: [
    "https://cdn.exemplo.com/foto1.jpg",
    "https://cdn.exemplo.com/foto2.jpg",
    "https://cdn.exemplo.com/foto3.jpg",
  ],
  instagramHandle: "clinicasaolucas",
  photoLuminance: 0.3,
  brandColors: { logoDominant: "#7c3aed" },
};

describe("zip", () => {
  it("calcula o CRC-32 conhecido", () => {
    // Valor canônico para a string "123456789"
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it("gera um arquivo com assinaturas e índice central válidos", () => {
    const zip = createZip([
      { name: "index.html", content: "<h1>oi</h1>" },
      { name: "styles.css", content: "body{color:red}" },
    ]);
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

    // Assinatura do primeiro cabeçalho local
    expect(view.getUint32(0, true)).toBe(0x04034b50);

    // Fim do índice central nos últimos 22 bytes, com 2 entradas
    const endOffset = zip.length - 22;
    expect(view.getUint32(endOffset, true)).toBe(0x06054b50);
    expect(view.getUint16(endOffset + 8, true)).toBe(2);
    expect(view.getUint16(endOffset + 10, true)).toBe(2);
  });

  it("grava o conteúdo sem compressão e recuperável", () => {
    const content = "corpo do arquivo";
    const zip = createZip([{ name: "a.txt", content }]);
    const text = new TextDecoder().decode(zip);
    expect(text).toContain("a.txt");
    expect(text).toContain(content);
  });

  it("aceita lista vazia", () => {
    const zip = createZip([]);
    expect(zip.length).toBe(22);
  });
});

describe("helpers", () => {
  it("escapa HTML perigoso", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("gera slug sem acento nem símbolo", () => {
    expect(slugify("Clínica São Lucas & Cia")).toBe("clinica-sao-lucas-cia");
    expect(slugify("!!!")).toBe("empresa");
  });
});

describe("buildStaticSite", () => {
  it("entrega o site, o leia-me e o cartão de visita", () => {
    const site = buildStaticSite(lead);
    expect(site.files.map((f) => f.name)).toEqual([
      "index.html",
      "styles.css",
      "script.js",
      "LEIA-ME.txt",
      "cartao/index.html",
      "cartao/styles.css",
      "cartao-clinica-sao-lucas-frente.svg",
      "cartao-clinica-sao-lucas-verso.svg",
    ]);
    expect(site.slug).toBe("clinica-sao-lucas");
  });

  it("o HTML é um documento completo e referencia os assets", () => {
    const html = buildStaticSite(lead).files[0].content;
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('<link rel="stylesheet" href="styles.css">');
    expect(html).toContain('<script src="script.js"></script>');
    expect(html).toContain('name="viewport"');
  });

  it("leva os dados reais do lead para dentro da página", () => {
    const html = buildStaticSite(lead).files[0].content;
    expect(html).toContain("Clínica São Lucas");
    expect(html).toContain("Av. Brasil, 100");
    expect(html).toContain("https://wa.me/5519999991234");
    expect(html).toContain("tel:+5519999991234");
  });

  it("o botão de WhatsApp usa o número publicado, não o telefone geral", () => {
    // Telefone do Maps é um fixo; o WhatsApp real veio de outro canal
    const html = buildStaticSite({
      ...lead,
      phone: "(19) 3231-4492",
      whatsappNumber: "(11) 98888-7777",
    }).files[0].content;

    expect(html).toContain("https://wa.me/5511988887777");
    expect(html).not.toContain("wa.me/551932314492");
    // "Ligar" continua usando o telefone geral
    expect(html).toContain("tel:+551932314492");
  });

  it("sem WhatsApp publicado nem telefone geral, o CTA cai para o mapa", () => {
    const html = buildStaticSite({ ...lead, phone: "Ver no Google Maps" }).files[0].content;
    expect(html).toContain("Ver no mapa");
    expect(html).not.toContain("wa.me/55");
  });

  it("usa o logo real quando existe e o lockup quando não existe", () => {
    const comLogo = buildStaticSite(leadComMarca).files[0].content;
    expect(comLogo).toContain('src="https://cdn.exemplo.com/logo.png"');
    expect(comLogo).toContain('rel="icon"');

    const semLogo = buildStaticSite(lead).files[0].content;
    expect(semLogo).toContain('class="lockup"');
    expect(semLogo).toContain(">CS<");
  });

  it("nicho visual ganha galeria com as fotos reais", () => {
    // Salão vive de mostrar o trabalho; o fluxo dele abre com a galeria
    const salao: Lead = {
      ...leadComMarca,
      title: "Studio W Cabeleireiros",
      category: "Salão de beleza",
      googleCategory: "Salão de beleza",
    };
    const html = buildStaticSite(salao).files[0].content;
    expect(html).toContain("foto2.jpg");
    expect(html).toContain("foto3.jpg");
  });

  it("clínica médica não abre com galeria — o fluxo do nicho é outro", () => {
    // Diferenciação por nicho: aqui a ordem é reputação, especialidades,
    // sobre, localização. Foto entra no hero, não como vitrine.
    const html = buildStaticSite(leadComMarca).files[0].content;
    expect(html).not.toContain("foto3.jpg");
  });

  it("omite a galeria quando não há fotos", () => {
    const html = buildStaticSite({ ...lead, category: "Salão de beleza" }).files[0].content;
    expect(html).not.toContain("gallery");
  });

  it("não usa emoji como ícone", () => {
    const html = buildStaticSite(leadComMarca).files[0].content;
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it("o hero do HTML exportado vem do blueprint, não do arquétipo de categoria", () => {
    // Regressão real: a dermatologista recebia "Seu sorriso é nossa
    // especialidade" porque o hero do exportador lia o NICHE_DB antigo.
    const derma: Lead = {
      ...lead,
      title: "Clínica Dermatológica Dra. Ana Silva",
      category: "Clínica médica",
      googleCategory: "Clínica médica",
      searchedNiche: "clínicas médicas",
    };
    const html = buildStaticSite(derma).files[0].content.toLowerCase();

    for (const proibido of ["sorriso", "odontológico", "clareamento", "ortodontia"]) {
      expect.soft(html, proibido).not.toContain(proibido);
    }
    expect(html).toContain("dermatologia");
  });

  it("o CTA do HTML exportado é o do nicho", () => {
    const oficina: Lead = { ...lead, category: "Oficina mecânica", googleCategory: "Oficina mecânica" };
    expect(buildStaticSite(oficina).files[0].content).toContain("Solicitar orçamento");

    const restaurante: Lead = { ...lead, category: "Restaurante", googleCategory: "Restaurante" };
    expect(buildStaticSite(restaurante).files[0].content).toContain("Ver cardápio");
  });

  it("escapa conteúdo vindo do lead", () => {
    const malicioso: Lead = { ...lead, title: '<img src=x onerror="alert(1)">' };
    const html = buildStaticSite(malicioso).files[0].content;
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain("&lt;img src=x");
  });
});

describe("buildCss", () => {
  it("expõe a paleta do kit como variáveis CSS", () => {
    const kit = buildDesignKit({
      title: leadComMarca.title,
      category: leadComMarca.category,
      brand: { logoUrl: leadComMarca.logoUrl, logoDominantColor: "#7c3aed" },
    });
    const css = buildCss(kit);

    expect(css).toContain(`--primary: ${kit.palette.primary};`);
    expect(css).toContain(`--accent: ${kit.palette.accent};`);
    expect(css).toContain(`--radius-md: ${kit.radius.md};`);
    expect(css).toContain(kit.fonts.heading);
  });

  it("respeita prefers-reduced-motion e é responsivo", () => {
    const kit = buildDesignKit({ title: lead.title, category: lead.category });
    const css = buildCss(kit);
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain("min-height: 48px");
  });
});

describe("adaptação ao acervo de imagens", () => {
  it("foto escura leva o hero para full-bleed sobreposto", () => {
    const kit = buildDesignKit({
      title: "Bar do Zé",
      category: "Restaurantes",
      brand: { photoCount: 5, photoLuminance: 0.2 },
    });
    expect(kit.mediaMood).toBe("dark");
    expect(kit.layout).toBe("overlay");
  });

  it("foto clara leva o hero para composição editorial", () => {
    const kit = buildDesignKit({
      title: "Bar do Zé",
      category: "Restaurantes",
      brand: { photoCount: 5, photoLuminance: 0.75 },
    });
    expect(kit.mediaMood).toBe("light");
    expect(kit.layout).toBe("editorial");
    // Foto clara precisa de véu mais forte para o texto sobreviver
    const comFoto = { ...lead, photos: ["x.jpg"] };
    const { blueprint } = prepararPreview(comFoto);
    expect(buildHtml(comFoto, kit, blueprint)).toContain("hero-media");
  });

  it("sem foto, o layout continua sendo o do hash", () => {
    const a = buildDesignKit({ title: "Bar do Zé", category: "Restaurantes" });
    const b = buildDesignKit({ title: "Bar do Zé", category: "Restaurantes" });
    expect(a.mediaMood).toBe("none");
    expect(a.layout).toBe(b.layout);
  });

  it("logo real ganha tamanho de assinatura", () => {
    const comLogo = buildDesignKit({
      title: lead.title,
      category: lead.category,
      brand: { logoUrl: "https://x/logo.png" },
    });
    const semLogo = buildDesignKit({ title: lead.title, category: lead.category });
    expect(comLogo.logoSizes.nav).toBeGreaterThan(semLogo.logoSizes.nav);
    expect(comLogo.logoSizes.hero).toBeGreaterThanOrEqual(88);
  });
});
