// ============================================================
// Cartão online (link-in-bio) — links e exportação estática
// ============================================================

import { describe, it, expect } from "vitest";
import { buildCardLinks, digitsOnly } from "../lib/design/links";
import {
  buildLinkCardCss,
  buildLinkCardFiles,
  buildLinkCardHtml,
} from "../lib/export/linkCardExport";
import { buildDesignKit } from "../lib/design/kit";
import { kitInputFromLead } from "../lib/design/seed";
import { buildStaticSite } from "../lib/export/staticSite";
import type { Lead } from "../lib/types";

const base: Lead = {
  id: "lead-1",
  title: "Padaria Estrela",
  phone: "(19) 99385-4476",
  address: "R. Itália, 388",
  city: "Campinas, SP",
  rating: 4.8,
  reviewsCount: 214,
  category: "Restaurantes",
  analyzedStatus: "NO_SITE",
  analyzedAt: "2026-08-12T00:00:00.000Z",
};

const completo: Lead = {
  ...base,
  logoUrl: "https://cdn.exemplo.com/logo.png",
  instagramHandle: "padariaestrela",
  facebookHandle: "PadariaEstrelaOficial",
  originalWebsite: "https://padariaestrela.com.br",
};

describe("buildCardLinks", () => {
  it("põe o WhatsApp em primeiro e como destaque", () => {
    const links = buildCardLinks(completo);
    expect(links[0].kind).toBe("whatsapp");
    expect(links[0].primary).toBe(true);
    expect(links[0].href).toBe("https://wa.me/5519993854476");
  });

  it("monta a lista completa na ordem de conversão", () => {
    expect(buildCardLinks(completo).map((l) => l.kind)).toEqual([
      "whatsapp",
      "phone",
      "instagram",
      "facebook",
      "website",
      "maps",
    ]);
  });

  it("só inclui o que a empresa tem", () => {
    const kinds = buildCardLinks(base).map((l) => l.kind);
    expect(kinds).toEqual(["whatsapp", "phone", "maps"]);
  });

  it("não trata link de rede social como site oficial", () => {
    const kinds = buildCardLinks({
      ...base,
      originalWebsite: "https://instagram.com/padariaestrela",
    }).map((l) => l.kind);
    expect(kinds).not.toContain("website");
  });

  it("sem telefone válido não gera WhatsApp nem ligação", () => {
    const kinds = buildCardLinks({ ...base, phone: "—" }).map((l) => l.kind);
    expect(kinds).toEqual(["maps"]);
  });

  it("o link do mapa aponta para a busca com nome e endereço", () => {
    const maps = buildCardLinks(base).find((l) => l.kind === "maps");
    expect(maps?.href).toContain("google.com/maps/search/");
    expect(decodeURIComponent(maps?.href ?? "")).toContain("Padaria Estrela");
  });

  it("digitsOnly limpa a máscara do telefone", () => {
    expect(digitsOnly("(19) 99385-4476")).toBe("19993854476");
  });
});

describe("buildLinkCardHtml", () => {
  const kit = buildDesignKit(kitInputFromLead(completo));

  it("é um documento completo e responsivo", () => {
    const html = buildLinkCardHtml(completo, kit);
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain('name="viewport"');
    expect(html).toContain('<link rel="stylesheet" href="styles.css">');
  });

  it("usa a logo da empresa como avatar", () => {
    const html = buildLinkCardHtml(completo, kit);
    expect(html).toContain('src="https://cdn.exemplo.com/logo.png"');
    expect(html).toContain('rel="icon"');
  });

  it("sem logo cai nas iniciais", () => {
    const html = buildLinkCardHtml(base, buildDesignKit(kitInputFromLead(base)));
    expect(html).toContain('class="initials"');
    expect(html).toContain(">PE<");
  });

  it("renderiza todos os links com ícone", () => {
    const html = buildLinkCardHtml(completo, kit);
    expect(html).toContain("Chamar no WhatsApp");
    expect(html).toContain("@padariaestrela");
    expect(html).toContain("/PadariaEstrelaOficial");
    expect(html).toContain("Como chegar");
    expect((html.match(/<svg/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });

  it("marca o CTA principal e escalona a animação", () => {
    const html = buildLinkCardHtml(completo, kit);
    expect(html).toContain('class="link primary"');
    expect(html).toContain('style="--i:0"');
    expect(html).toContain('style="--i:1"');
  });

  it("escapa conteúdo vindo do lead", () => {
    const html = buildLinkCardHtml(
      { ...completo, title: '<img src=x onerror="alert(1)">' },
      kit
    );
    expect(html).not.toContain('onerror="alert(1)"');
  });

  it("não usa emoji como ícone", () => {
    const html = buildLinkCardHtml(completo, kit);
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});

describe("buildLinkCardCss", () => {
  const kit = buildDesignKit(kitInputFromLead(completo));
  const css = buildLinkCardCss(kit);

  it("herda a paleta da marca", () => {
    expect(css).toContain(`--primary: ${kit.palette.primary};`);
    expect(css).toContain(`--accent: ${kit.palette.accent};`);
  });

  it("tem as animações de entrada e o fundo respirando", () => {
    expect(css).toContain("@keyframes rise");
    expect(css).toContain("@keyframes breathe");
    expect(css).toContain("animation-delay: calc(.3s + var(--i) * .07s)");
  });

  it("respeita prefers-reduced-motion e alvo de toque", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("min-height: 62px");
  });
});

describe("integração com o download", () => {
  it("o cartão online entra no ZIP em cartao/", () => {
    const names = buildStaticSite(completo).files.map((f) => f.name);
    expect(names).toContain("cartao/index.html");
    expect(names).toContain("cartao/styles.css");
  });

  it("buildLinkCardFiles resolve o kit sozinho", () => {
    const files = buildLinkCardFiles(completo);
    expect(files).toHaveLength(2);
    expect(files[0].content).toContain("Padaria Estrela");
  });
});
