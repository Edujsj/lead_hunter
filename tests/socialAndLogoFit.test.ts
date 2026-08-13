// ============================================================
// Perfis sociais, encaixe do logo, vetorização e cartão de visita
// ============================================================

import { describe, it, expect, vi } from "vitest";
import {
  extractProfilesFromUrls,
  facebookFromUrl,
  findSocialProfiles,
  instagramFromUrl,
  parseBingUrls,
  parseDuckDuckGoUrls,
  socialAvatarUrls,
} from "../lib/crawler/socialFinder";
import {
  LogoMask,
  maskToSvg,
  shouldVectorize,
  simplifyPath,
  svgToDataUrl,
  vectorizeLogo,
} from "../lib/crawler/logoVectorizer";
import { buildDesignKit, resolveLogoFit } from "../lib/design/kit";
import { buildLogoCandidates } from "../lib/crawler/logoFinder";
import {
  buildBusinessCard,
  businessCardFiles,
  nameFontSize,
  wrapText,
} from "../lib/export/businessCard";
import type { Lead } from "../lib/types";

// ─── socialFinder ─────────────────────────────────────────────────────────────

describe("instagramFromUrl / facebookFromUrl", () => {
  it("extrai perfis reais", () => {
    expect(instagramFromUrl("https://www.instagram.com/padaria.estrela/")).toBe(
      "padaria.estrela"
    );
    expect(facebookFromUrl("https://www.facebook.com/PadariaEstrela")).toBe(
      "PadariaEstrela"
    );
    expect(facebookFromUrl("https://facebook.com/pg/PadariaEstrela/posts")).toBe(
      "PadariaEstrela"
    );
  });

  it("ignora rotas internas das redes", () => {
    expect(instagramFromUrl("https://instagram.com/explore/tags/pao")).toBeUndefined();
    expect(facebookFromUrl("https://facebook.com/profile.php?id=123")).toBeUndefined();
    expect(facebookFromUrl("https://facebook.com/sharer/sharer.php")).toBeUndefined();
    expect(facebookFromUrl("https://facebook.com/groups/algum")).toBeUndefined();
  });

  it("ignora prefixo de idioma do Facebook", () => {
    expect(facebookFromUrl("https://pt-br.facebook.com/")).toBeUndefined();
    expect(facebookFromUrl("https://facebook.com/pt-br")).toBeUndefined();
  });
});

describe("extractProfilesFromUrls", () => {
  it("pega o primeiro de cada rede", () => {
    const profiles = extractProfilesFromUrls([
      "https://site.com.br",
      "https://facebook.com/EmpresaOficial",
      "https://instagram.com/empresaoficial",
      "https://instagram.com/outraconta",
    ]);
    expect(profiles).toEqual({
      instagram: "empresaoficial",
      facebook: "EmpresaOficial",
    });
  });
});

describe("parseDuckDuckGoUrls", () => {
  it("decodifica o redirecionador e pega links diretos", () => {
    const html = `
      <a href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.instagram.com%2Fpadariaestrela%2F&rut=x">perfil</a>
      <a href="https://www.facebook.com/PadariaEstrela">página</a>
    `;
    const urls = parseDuckDuckGoUrls(html);
    expect(urls).toContain("https://www.instagram.com/padariaestrela/");
    expect(urls.some((u) => u.includes("facebook.com/PadariaEstrela"))).toBe(true);
  });
});

describe("parseBingUrls", () => {
  it("desfaz o redirecionador base64 do Bing", () => {
    const target = "https://www.instagram.com/bardoze/";
    const encoded = Buffer.from(target, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const html = `<a href="https://www.bing.com/ck/a?!&&p=1&u=a1${encoded}&ntb=1">Bar do Zé</a>`;
    expect(parseBingUrls(html)).toContain(target);
  });

  it("ignora segmento que não é base64 válido", () => {
    expect(parseBingUrls('<a href="?u=a1$$$$">x</a>')).toEqual([]);
  });
});

describe("findSocialProfiles", () => {
  it("usa o que já está em mãos sem ir à rede", async () => {
    const fetchImpl = vi.fn();
    const profiles = await findSocialProfiles(
      { title: "Padaria Estrela", city: "Campinas, SP" },
      ["https://instagram.com/padariaestrela", "https://facebook.com/padariaestrela"],
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(profiles.instagram).toBe("padariaestrela");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("busca na web quando a empresa não tem site", async () => {
    // Uma busca só cobre as duas redes — menos requisições, menos throttle
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        '<a href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.instagram.com%2Fbardoze%2F">x</a>' +
        '<a href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.facebook.com%2FBarDoZeOficial%2F">y</a>',
    })) as unknown as typeof fetch;

    const profiles = await findSocialProfiles(
      { title: "Bar do Zé", city: "Campinas, SP" },
      [],
      { fetchImpl }
    );

    expect(profiles.instagram).toBe("bardoze");
    expect(profiles.facebook).toBe("BarDoZeOficial");
  });

  it("não quebra quando a busca falha", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;

    const profiles = await findSocialProfiles({ title: "X" }, [], { fetchImpl });
    expect(profiles).toEqual({});
  });
});

describe("socialAvatarUrls → candidatos de logo", () => {
  it("empresa sem site entra no ranking pela foto de perfil", () => {
    const avatars = socialAvatarUrls({ instagram: "bardoze", facebook: "BarDoZe" });
    const candidates = buildLogoCandidates(
      { title: "Bar do Zé" },
      { instagramAvatars: avatars.instagram, facebookAvatars: avatars.facebook }
    );

    const sources = candidates.map((c) => c.source);
    expect(sources).toContain("instagram-avatar");
    expect(sources).toContain("facebook-profile");
    expect(candidates[0].url).toContain("unavatar.io/instagram/bardoze");
  });

  it("sem perfil não gera candidato social", () => {
    expect(socialAvatarUrls({})).toEqual({ instagram: [], facebook: [] });
  });
});

// ─── Encaixe do logo ──────────────────────────────────────────────────────────

describe("resolveLogoFit", () => {
  const navDark = "#1e293b";
  const navLight = "#f8fafc";

  it("logo com fundo sólido sempre ganha pastilha", () => {
    const fit = resolveLogoFit(
      { logoUrl: "x.jpg", logoHasAlpha: false, logoLuminance: 0.9 },
      navDark
    );
    expect(fit.treatment).toBe("chip");
  });

  it("traço escuro sobre header escuro ganha pastilha", () => {
    const fit = resolveLogoFit(
      { logoUrl: "x.png", logoHasAlpha: true, logoLuminance: 0.2 },
      navDark
    );
    expect(fit.treatment).toBe("chip");
  });

  it("traço claro sobre header escuro vai direto", () => {
    const fit = resolveLogoFit(
      { logoUrl: "x.png", logoHasAlpha: true, logoLuminance: 0.85 },
      navDark
    );
    expect(fit.treatment).toBe("plain");
  });

  it("traço claro sobre header claro ganha pastilha", () => {
    const fit = resolveLogoFit(
      { logoUrl: "x.png", logoHasAlpha: true, logoLuminance: 0.9 },
      navLight
    );
    expect(fit.treatment).toBe("chip");
  });

  it("detecta logotipo com nome escrito pela proporção", () => {
    expect(resolveLogoFit({ logoUrl: "x", logoAspect: 3.5 }, navDark).isWordmark).toBe(true);
    expect(resolveLogoFit({ logoUrl: "x", logoAspect: 1.1 }, navDark).isWordmark).toBe(false);
  });

  it("largura máxima acompanha a proporção", () => {
    const largo = resolveLogoFit({ logoUrl: "x", logoAspect: 4 }, navDark);
    const quadrado = resolveLogoFit({ logoUrl: "x", logoAspect: 1 }, navDark);
    expect(largo.maxWidth.nav).toBeGreaterThan(quadrado.maxWidth.nav);
  });

  it("sem logo não pede pastilha", () => {
    expect(resolveLogoFit(undefined, navDark).treatment).toBe("plain");
  });

  it("o kit expõe o encaixe resolvido", () => {
    const kit = buildDesignKit({
      title: "Padaria Estrela",
      category: "Restaurantes",
      brand: { logoUrl: "x.jpg", logoHasAlpha: false, logoAspect: 3 },
    });
    expect(kit.logoFit.treatment).toBe("chip");
    expect(kit.logoFit.isWordmark).toBe(true);
  });
});

// ─── Vetorização ──────────────────────────────────────────────────────────────

function maskWithSquare(size = 32, inset = 8): LogoMask {
  const bits = new Array(size * size).fill(0);
  for (let y = inset; y < size - inset; y++) {
    for (let x = inset; x < size - inset; x++) {
      bits[y * size + x] = 1;
    }
  }
  return { width: size, height: size, bits };
}

describe("shouldVectorize", () => {
  it("vetoriza bitmap pequeno e chapado", () => {
    expect(shouldVectorize({ sourceSize: 64, format: "png", colorCount: 2 })).toBe(true);
  });

  it("não mexe em SVG nem em arquivo grande", () => {
    expect(shouldVectorize({ sourceSize: 64, format: "svg", colorCount: 2 })).toBe(false);
    expect(shouldVectorize({ sourceSize: 512, format: "png", colorCount: 2 })).toBe(false);
  });

  it("não vetoriza logo fotográfico", () => {
    expect(shouldVectorize({ sourceSize: 120, format: "jpeg", colorCount: 40 })).toBe(false);
  });
});

describe("simplifyPath", () => {
  it("colapsa pontos colineares", () => {
    const line: [number, number][] = [
      [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
    ];
    expect(simplifyPath(line, 0.5)).toEqual([
      [0, 0],
      [4, 0],
    ]);
  });

  it("preserva o vértice de um canto", () => {
    const corner: [number, number][] = [
      [0, 0], [2, 0], [4, 0], [4, 2], [4, 4],
    ];
    const simplified = simplifyPath(corner, 0.5);
    expect(simplified).toContainEqual([4, 0]);
  });
});

describe("maskToSvg", () => {
  it("traça o contorno de uma forma simples", () => {
    const svg = maskToSvg(maskWithSquare());
    expect(svg).toBeTruthy();
    expect(svg).toContain("<svg");
    expect(svg).toContain("viewBox=");
    expect(svg).toMatch(/<path[^>]+d="M/);
  });

  it("recusa máscara vazia ou totalmente preenchida", () => {
    const empty: LogoMask = { width: 8, height: 8, bits: new Array(64).fill(0) };
    const full: LogoMask = { width: 8, height: 8, bits: new Array(64).fill(1) };
    expect(maskToSvg(empty)).toBeNull();
    expect(maskToSvg(full)).toBeNull();
  });

  it("descarta manchas menores que o mínimo", () => {
    const mask: LogoMask = { width: 32, height: 32, bits: new Array(1024).fill(0) };
    mask.bits[0] = 1; // um pixel solto
    expect(maskToSvg(mask, { minArea: 5 })).toBeNull();
  });

  it("usa a cor pedida no preenchimento", () => {
    const svg = maskToSvg(maskWithSquare(), { fill: "#ff0090" });
    expect(svg).toContain('fill="#ff0090"');
  });
});

describe("svgToDataUrl / vectorizeLogo", () => {
  it("gera data URI utilizável em <img src>", () => {
    const url = svgToDataUrl('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>');
    expect(url.startsWith("data:image/svg+xml,")).toBe(true);
    expect(url).not.toContain("<");
    expect(url).not.toContain("#");
  });

  it("ponta a ponta devolve svg e data URI", () => {
    const result = vectorizeLogo(maskWithSquare(), {
      sourceSize: 64,
      format: "png",
      colorCount: 2,
    });
    expect(result?.dataUrl.startsWith("data:image/svg+xml,")).toBe(true);
    expect(result?.pathCount).toBeGreaterThan(0);
  });

  it("devolve null quando não vale a pena", () => {
    expect(
      vectorizeLogo(maskWithSquare(), { sourceSize: 512, format: "png", colorCount: 2 })
    ).toBeNull();
  });
});

// ─── Cartão de visita ─────────────────────────────────────────────────────────

const lead: Lead = {
  id: "lead-1",
  title: "Padaria Estrela",
  phone: "(19) 99999-1234",
  address: "Av. Brasil, 100",
  city: "Campinas, SP",
  rating: 4.8,
  reviewsCount: 214,
  category: "Restaurantes",
  analyzedStatus: "NO_SITE",
  analyzedAt: "2026-08-12T00:00:00.000Z",
  instagramHandle: "padariaestrela",
  facebookHandle: "PadariaEstrelaOficial",
};

describe("wrapText / nameFontSize", () => {
  it("quebra sem cortar palavra", () => {
    const lines = wrapText("Avenida Doutor Barbosa da Cunha, 822, Campinas", 20, 2);
    expect(lines).toHaveLength(2);
    lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(20));
  });

  it("nome longo recebe fonte menor", () => {
    expect(nameFontSize("Bar do Zé")).toBeGreaterThan(
      nameFontSize("Instituto de Odontologia Avançada de Campinas")
    );
  });
});

describe("buildBusinessCard", () => {
  it("gera frente e verso em SVG com sangria", () => {
    const card = buildBusinessCard(lead);
    for (const svg of [card.front, card.back]) {
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain('width="96mm"');
      expect(svg).toContain('height="56mm"');
      expect(svg).toContain('viewBox="0 0 96 56"');
    }
  });

  it("frente traz nome, categoria e cidade", () => {
    const front = buildBusinessCard(lead).front;
    expect(front).toContain("Padaria Estrela");
    expect(front).toContain("RESTAURANTES");
    expect(front).toContain("CAMPINAS");
  });

  it("verso traz contato e os perfis sociais", () => {
    const back = buildBusinessCard(lead).back;
    expect(back).toContain("(19) 99999-1234");
    expect(back).toContain("Av. Brasil, 100");
    expect(back).toContain("@padariaestrela");
    expect(back).toContain("/PadariaEstrelaOficial");
    expect(back).toContain("4.8");
  });

  it("sem logo usa as iniciais", () => {
    const front = buildBusinessCard(lead).front;
    expect(front).toContain(">PE<");
  });

  it("com logo embute a imagem", () => {
    const front = buildBusinessCard({
      ...lead,
      logoUrl: "https://cdn.exemplo.com/logo.png",
    }).front;
    expect(front).toContain('<image href="https://cdn.exemplo.com/logo.png"');
    expect(front).toContain('preserveAspectRatio="xMinYMid meet"');
  });

  it("escapa texto vindo do lead", () => {
    const front = buildBusinessCard({
      ...lead,
      title: '<script>alert("x")</script>',
    }).front;
    expect(front).not.toContain("<script>");
    expect(front).toContain("&lt;script&gt;");
  });

  it("nomes de arquivo saem com slug da empresa", () => {
    expect(businessCardFiles(lead).map((f) => f.name)).toEqual([
      "cartao-padaria-estrela-frente.svg",
      "cartao-padaria-estrela-verso.svg",
    ]);
  });
});
