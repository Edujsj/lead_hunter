// ============================================================
// Logo Finder — montagem de candidatos, leitura de dimensões,
// validação por rede e ranking.
// ============================================================

import { describe, it, expect, vi } from "vitest";
import {
  LogoCandidate,
  buildLogoCandidates,
  extractDomain,
  findBestLogo,
  imageSizeFromBuffer,
  instagramHandle,
  isSocialUrl,
  rankLogoCandidates,
  scoreLogoCandidate,
  validateLogoCandidate,
} from "../lib/crawler/logoFinder";

// ─── Fixtures binárias ────────────────────────────────────────────────────────
function pngOf(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(32);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buf.set([0, 0, 0, 13], 8);
  buf.set([0x49, 0x48, 0x44, 0x52], 12); // IHDR
  new DataView(buf.buffer).setUint32(16, width, false);
  new DataView(buf.buffer).setUint32(20, height, false);
  return buf;
}

function gifOf(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(20);
  buf.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0); // GIF89a
  new DataView(buf.buffer).setUint16(6, width, true);
  new DataView(buf.buffer).setUint16(8, height, true);
  return buf;
}

function jpegOf(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(24);
  const view = new DataView(buf.buffer);
  buf.set([0xff, 0xd8], 0);
  buf.set([0xff, 0xc0], 2);
  view.setUint16(4, 17, false); // comprimento do segmento
  buf[6] = 8; // precisão
  view.setUint16(7, height, false);
  view.setUint16(9, width, false);
  return buf;
}

function icoOf(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(22);
  buf.set([0x00, 0x00, 0x01, 0x00, 0x01, 0x00], 0);
  buf[6] = width === 256 ? 0 : width;
  buf[7] = height === 256 ? 0 : height;
  return buf;
}

const svgBytes = new TextEncoder().encode(
  '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><path d="M0 0"/></svg>'
);

describe("extractDomain", () => {
  it("extrai o domínio sem www", () => {
    expect(extractDomain("https://www.clinicasaolucas.com.br/contato")).toBe(
      "clinicasaolucas.com.br"
    );
    expect(extractDomain("clinicasaolucas.com.br")).toBe("clinicasaolucas.com.br");
  });

  it("devolve null para entrada inválida", () => {
    expect(extractDomain(undefined)).toBeNull();
    expect(extractDomain("")).toBeNull();
    expect(extractDomain("not a url at all")).toBeNull();
  });
});

describe("instagramHandle", () => {
  it("pega o handle do perfil", () => {
    expect(instagramHandle("https://instagram.com/clinicasaolucas")).toBe(
      "clinicasaolucas"
    );
    expect(instagramHandle("https://www.instagram.com/pet.shop_amigo/")).toBe(
      "pet.shop_amigo"
    );
  });

  it("ignora URLs que não são de perfil", () => {
    expect(instagramHandle("https://instagram.com/p/CxYz123/")).toBeNull();
    expect(instagramHandle("https://outrosite.com/foo")).toBeNull();
    expect(instagramHandle(undefined)).toBeNull();
  });
});

describe("isSocialUrl", () => {
  it("reconhece redes sociais e agregadores de link", () => {
    expect(isSocialUrl("https://wa.me/5511999998888")).toBe(true);
    expect(isSocialUrl("https://linktr.ee/empresa")).toBe(true);
    expect(isSocialUrl("https://minhaempresa.com.br")).toBe(false);
  });
});

describe("imageSizeFromBuffer", () => {
  it("lê PNG, GIF, JPEG, ICO e SVG", () => {
    expect(imageSizeFromBuffer(pngOf(512, 512))).toEqual({
      width: 512,
      height: 512,
      format: "png",
    });
    expect(imageSizeFromBuffer(gifOf(64, 32))).toEqual({
      width: 64,
      height: 32,
      format: "gif",
    });
    expect(imageSizeFromBuffer(jpegOf(800, 600))).toEqual({
      width: 800,
      height: 600,
      format: "jpeg",
    });
    expect(imageSizeFromBuffer(svgBytes)).toEqual({
      width: 240,
      height: 80,
      format: "svg",
    });
  });

  it("trata a dimensão 0 do ICO como 256", () => {
    expect(imageSizeFromBuffer(icoOf(256, 256))).toEqual({
      width: 256,
      height: 256,
      format: "ico",
    });
    expect(imageSizeFromBuffer(icoOf(16, 16))?.width).toBe(16);
  });

  it("devolve null para conteúdo que não é imagem", () => {
    expect(imageSizeFromBuffer(new TextEncoder().encode("<!DOCTYPE html><html>"))).toBeNull();
    expect(imageSizeFromBuffer(new Uint8Array(4))).toBeNull();
  });
});

describe("scoreLogoCandidate", () => {
  it("prioriza logo do site sobre favicon de serviço", () => {
    const site = scoreLogoCandidate({
      url: "https://x.com/logo.png",
      source: "site-logo-img",
      width: 300,
      height: 100,
      format: "png",
    });
    const google = scoreLogoCandidate({
      url: "https://google.com/s2/favicons",
      source: "google-favicon",
      width: 64,
      height: 64,
      format: "png",
    });
    expect(site).toBeGreaterThan(google);
  });

  it("premia SVG e penaliza bitmap minúsculo", () => {
    const svg = scoreLogoCandidate({
      url: "https://x.com/logo.svg",
      source: "site-favicon",
      format: "svg",
      width: 0,
      height: 0,
    });
    const tiny = scoreLogoCandidate({
      url: "https://x.com/icon.png",
      source: "site-favicon",
      format: "png",
      width: 16,
      height: 16,
    });
    expect(svg).toBeGreaterThan(tiny);
  });

  it("penaliza URL com cara de placeholder", () => {
    const normal = scoreLogoCandidate({
      url: "https://x.com/marca.png",
      source: "site-logo-img",
      format: "png",
      width: 200,
      height: 200,
    });
    const junk = scoreLogoCandidate({
      url: "https://x.com/placeholder.png",
      source: "site-logo-img",
      format: "png",
      width: 200,
      height: 200,
    });
    expect(junk).toBeLessThan(normal);
  });

  it("penaliza proporção de faixa", () => {
    const square = scoreLogoCandidate({
      url: "https://x.com/a.png", source: "unavatar", format: "png", width: 256, height: 256,
    });
    const banner = scoreLogoCandidate({
      url: "https://x.com/b.png", source: "unavatar", format: "png", width: 1600, height: 100,
    });
    expect(banner).toBeLessThan(square);
  });
});

describe("buildLogoCandidates", () => {
  it("monta a lista a partir do site e dos serviços por domínio", () => {
    const candidates = buildLogoCandidates(
      {
        title: "Clínica São Lucas",
        city: "São Paulo",
        originalWebsite: "https://www.saolucas.com.br",
      },
      {
        logoUrls: ["https://www.saolucas.com.br/img/logo.png"],
        appleTouchIcons: ["https://www.saolucas.com.br/apple-touch-icon.png"],
        favicons: ["https://www.saolucas.com.br/favicon.ico"],
      }
    );

    const bySource = Object.fromEntries(candidates.map((c) => [c.source, c.url]));
    expect(bySource["site-logo-img"]).toContain("/img/logo.png");
    expect(bySource["apple-touch-icon"]).toContain("apple-touch-icon");
    expect(bySource["site-favicon"]).toContain("favicon.ico");
    expect(bySource["unavatar"]).toContain("saolucas.com.br");
    expect(bySource["ddg-icon"]).toContain("saolucas.com.br");
    expect(bySource["google-favicon"]).toContain("saolucas.com.br");
  });

  it("usa o avatar do Instagram quando a empresa só tem rede social", () => {
    const candidates = buildLogoCandidates({
      title: "Pet Amigo",
      originalWebsite: "https://instagram.com/petamigo",
    });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      source: "instagram-avatar",
      url: "https://unavatar.io/instagram/petamigo",
    });
  });

  it("não gera candidatos por domínio a partir de link de WhatsApp", () => {
    const candidates = buildLogoCandidates({
      title: "Oficina do Zé",
      originalWebsite: "https://wa.me/5511999998888",
    });
    expect(candidates).toHaveLength(0);
  });

  it("descarta data: URI e duplicatas", () => {
    const candidates = buildLogoCandidates(
      { title: "X" },
      {
        logoUrls: [
          "data:image/png;base64,AAA",
          "https://x.com/logo.png",
          "https://x.com/logo.png",
        ],
      }
    );
    expect(candidates).toHaveLength(1);
  });

  it("empresa sem site nenhum não produz candidatos", () => {
    expect(buildLogoCandidates({ title: "Sem Site Ltda" })).toHaveLength(0);
  });
});

// ─── Rede (fetch mockado) ─────────────────────────────────────────────────────
function fakeFetch(
  responses: Record<string, { status?: number; type?: string; body?: Uint8Array }>
) {
  return vi.fn(async (url: string | URL | Request) => {
    const key = String(url);
    const entry = responses[key];
    if (!entry) return { ok: false, status: 404, headers: new Headers() } as Response;
    const body = entry.body ?? pngOf(256, 256);
    return {
      ok: (entry.status ?? 200) < 400,
      status: entry.status ?? 200,
      headers: new Headers({ "content-type": entry.type ?? "image/png" }),
      arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    } as unknown as Response;
  });
}

describe("validateLogoCandidate", () => {
  const candidate: LogoCandidate = {
    url: "https://x.com/logo.png",
    source: "site-logo-img",
  };

  it("enriquece o candidato com formato e dimensões", async () => {
    const result = await validateLogoCandidate(candidate, {
      fetchImpl: fakeFetch({ "https://x.com/logo.png": { body: pngOf(320, 120) } }),
    });
    expect(result).toMatchObject({ width: 320, height: 120, format: "png" });
  });

  it("rejeita imagem pequena demais para um header", async () => {
    const result = await validateLogoCandidate(candidate, {
      fetchImpl: fakeFetch({ "https://x.com/logo.png": { body: pngOf(16, 16) } }),
    });
    expect(result).toBeNull();
  });

  it("rejeita resposta que não é imagem", async () => {
    const result = await validateLogoCandidate(candidate, {
      fetchImpl: fakeFetch({
        "https://x.com/logo.png": { type: "text/html", body: pngOf(256, 256) },
      }),
    });
    expect(result).toBeNull();
  });

  it("rejeita 404 e erro de rede", async () => {
    expect(
      await validateLogoCandidate(candidate, { fetchImpl: fakeFetch({}) })
    ).toBeNull();

    const boom = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    expect(
      await validateLogoCandidate(candidate, { fetchImpl: boom as unknown as typeof fetch })
    ).toBeNull();
  });

  it("aceita SVG mesmo sem dimensão declarada", async () => {
    const result = await validateLogoCandidate(candidate, {
      fetchImpl: fakeFetch({
        "https://x.com/logo.png": { type: "image/svg+xml", body: svgBytes },
      }),
    });
    expect(result?.format).toBe("svg");
  });
});

describe("rankLogoCandidates / findBestLogo", () => {
  it("ordena do melhor para o pior", () => {
    const ranked = rankLogoCandidates([
      { url: "a", source: "google-favicon", format: "png", width: 64, height: 64 },
      { url: "b", source: "site-logo-img", format: "svg", width: 0, height: 0 },
      { url: "c", source: "ddg-icon", format: "ico", width: 32, height: 32 },
    ]);
    expect(ranked.map((c) => c.url)).toEqual(["b", "a", "c"]);
  });

  it("escolhe o logo do site quando ele e o favicon estão disponíveis", async () => {
    const fetchImpl = fakeFetch({
      "https://saolucas.com.br/logo.png": { body: pngOf(400, 160) },
      "https://unavatar.io/saolucas.com.br?fallback=false": { body: pngOf(64, 64) },
      "https://icons.duckduckgo.com/ip3/saolucas.com.br.ico": { body: icoOf(64, 64) },
      "https://www.google.com/s2/favicons?sz=256&domain_url=https://saolucas.com.br":
        { body: pngOf(64, 64) },
    });

    const result = await findBestLogo(
      { title: "Clínica São Lucas", originalWebsite: "https://saolucas.com.br" },
      { logoUrls: ["https://saolucas.com.br/logo.png"] },
      { fetchImpl }
    );

    expect(result.url).toBe("https://saolucas.com.br/logo.png");
    expect(result.source).toBe("site-logo-img");
    expect(result.candidates.length).toBeGreaterThan(1);
  });

  it("devolve vazio quando nenhum candidato responde", async () => {
    const result = await findBestLogo(
      { title: "Fantasma", originalWebsite: "https://fantasma.com.br" },
      {},
      { fetchImpl: fakeFetch({}) }
    );
    expect(result.url).toBeUndefined();
    expect(result.candidates).toEqual([]);
  });
});
