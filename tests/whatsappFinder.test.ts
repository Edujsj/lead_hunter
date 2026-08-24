// ============================================================
// WhatsApp Finder — só lê canais que a empresa publicou
// ============================================================

import { describe, it, expect } from "vitest";
import {
  collectWhatsAppCandidates,
  extractWaMeNumbers,
  extractWaMentions,
  findWhatsAppNumberInText,
  resolveContact,
  resolveWhatsApp,
} from "../lib/crawler/whatsappFinder";

describe("extractWaMeNumbers", () => {
  it("lê link wa.me puro", () => {
    expect(extractWaMeNumbers("https://wa.me/5519993854476")).toEqual([
      "(19) 99385-4476",
    ]);
  });

  it("lê link api.whatsapp.com/send?phone=", () => {
    expect(
      extractWaMeNumbers(
        "https://api.whatsapp.com/send?phone=5519993854476&text=oi"
      )
    ).toEqual(["(19) 99385-4476"]);
  });

  it("lê whatsapp.com/send?phone=", () => {
    expect(
      extractWaMeNumbers("https://whatsapp.com/send?phone=5519993854476")
    ).toEqual(["(19) 99385-4476"]);
  });

  it("ignora número implausível (DDD inexistente)", () => {
    expect(extractWaMeNumbers("https://wa.me/5500912345678")).toEqual([]);
  });

  it("dedup quando o mesmo número aparece duas vezes", () => {
    const texto =
      "Fale conosco: https://wa.me/5519993854476 ou https://wa.me/5519993854476";
    expect(extractWaMeNumbers(texto)).toEqual(["(19) 99385-4476"]);
  });

  it("string vazia não quebra", () => {
    expect(extractWaMeNumbers("")).toEqual([]);
  });
});

describe("extractWaMentions", () => {
  it("lê menção textual sem link", () => {
    expect(extractWaMentions("Whatsapp: (19) 99385-4476")).toEqual([
      "(19) 99385-4476",
    ]);
  });

  it("aceita variação 'zap' e 'wpp'", () => {
    expect(extractWaMentions("chama no zap 19 993854476")).toEqual([
      "(19) 99385-4476",
    ]);
    expect(extractWaMentions("wpp: (19) 99385-4476")).toEqual([
      "(19) 99385-4476",
    ]);
  });

  it("não confunde CNPJ ou CEP com telefone", () => {
    // nenhuma palavra-gatilho por perto — não deve casar
    expect(extractWaMentions("CNPJ 12.345.678/0001-90")).toEqual([]);
  });
});

describe("findWhatsAppNumberInText", () => {
  it("prioriza link sobre menção textual quando os dois aparecem", () => {
    const texto =
      "Whatsapp: (11) 91111-1111 — prefira o link https://wa.me/5519993854476";
    expect(findWhatsAppNumberInText(texto)).toBe("(19) 99385-4476");
  });

  it("sem nenhum dos dois devolve null", () => {
    expect(findWhatsAppNumberInText("Visite nossa loja física")).toBeNull();
  });
});

describe("collectWhatsAppCandidates / resolveWhatsApp", () => {
  it("prioriza o link wa.me do Maps sobre o telefone genérico", () => {
    const candidatos = collectWhatsAppCandidates({
      mapsWebsiteLink: "https://wa.me/5519993854476",
      mapsPhone: "(19) 3231-4492",
    });
    expect(candidatos[0].source).toBe("maps_website_link");
    expect(candidatos[0].number).toBe("(19) 99385-4476");
    // o telefone fixo do Maps continua disponível, só não é o primeiro
    expect(candidatos.some((c) => c.source === "maps_phone")).toBe(true);
  });

  it("cai para a bio do Instagram quando não há link no site", () => {
    const r = resolveWhatsApp({
      websiteTexts: ["Sobre nós", "Fundada em 2010"],
      instagramBio: "📍 Campinas | Zap: (19) 99385-4476",
      mapsPhone: "(19) 3231-4492",
    });
    expect(r?.source).toBe("instagram_bio");
  });

  it("sem nenhuma fonte publicada, devolve null — nunca inventa", () => {
    expect(resolveWhatsApp({})).toBeNull();
  });

  it("e164 sempre tem o DDI 55", () => {
    const r = resolveWhatsApp({ mapsPhone: "(19) 99385-4476" });
    expect(r?.e164).toBe("+5519993854476");
  });
});

describe("resolveContact — o que os renderers realmente usam", () => {
  it("usa o WhatsApp publicado quando existe", () => {
    const r = resolveContact({
      phone: "(19) 3231-4492",
      whatsappNumber: "(19) 99385-4476",
    });
    expect(r.digits).toBe("5519993854476");
    expect(r.hasWhatsApp).toBe(true);
  });

  it("cai para o telefone geral quando não há WhatsApp específico", () => {
    const r = resolveContact({ phone: "(19) 3231-4492" });
    expect(r.digits).toBe("551932314492");
    expect(r.hasWhatsApp).toBe(true);
  });

  it("sem nenhum telefone válido, hasWhatsApp é falso", () => {
    const r = resolveContact({ phone: "Ver no Google Maps" });
    expect(r.hasWhatsApp).toBe(false);
    expect(r.digits).toBe("");
  });

  it("descarta o WhatsApp publicado se ele for lixo e cai para o telefone", () => {
    const r = resolveContact({ phone: "(19) 3231-4492", whatsappNumber: "123" });
    expect(r.digits).toBe("551932314492");
  });
});
