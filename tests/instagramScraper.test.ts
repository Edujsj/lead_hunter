// ============================================================
// Instagram — descoberta de handle e parsing do HTML público
// ============================================================

import { describe, it, expect, vi } from "vitest";
import {
  fetchInstagramProfile,
  findInstagramHandle,
  instagramHandleFromUrl,
  isFeedPhotoUrl,
  parseInstagramHtml,
  upgradeInstagramImage,
} from "../lib/crawler/instagramScraper";

const PROFILE_HTML = `<!DOCTYPE html><html><head>
<meta property="og:image" content="https://scontent.cdninstagram.com/v/t51.2885-19/profile_150x150.jpg?_nc_ht=x&amp;oh=1" />
<meta property="og:title" content="Padaria Estrela (@padariaestrela) • Fotos e vídeos do Instagram" />
<meta property="og:description" content="1.234 seguidores · Pães artesanais em Campinas" />
</head><body>
<script>window._d={"profile_pic_url_hd":"https:\\/\\/scontent.cdninstagram.com\\/v\\/t51.2885-19\\/profile_hd.jpg?_nc\\u0026oh=2",
"edges":[{"display_url":"https:\\/\\/scontent.cdninstagram.com\\/v\\/p1080x1080\\/post1.jpg"},
{"display_url":"https:\\/\\/scontent.cdninstagram.com\\/v\\/p1080x1080\\/post2.jpg"},
{"thumbnail_src":"https:\\/\\/scontent.cdninstagram.com\\/v\\/s150x150\\/post3.jpg"}]}</script>
</body></html>`;

describe("instagramHandleFromUrl", () => {
  it("extrai o handle de URLs de perfil", () => {
    expect(instagramHandleFromUrl("https://instagram.com/padariaestrela")).toBe(
      "padariaestrela"
    );
    expect(
      instagramHandleFromUrl("https://www.instagram.com/pet.shop_amigo/?hl=pt-br")
    ).toBe("pet.shop_amigo");
  });

  it("ignora post, reel e páginas institucionais", () => {
    expect(instagramHandleFromUrl("https://instagram.com/p/CxYz123/")).toBeNull();
    expect(instagramHandleFromUrl("https://instagram.com/reel/abc/")).toBeNull();
    expect(instagramHandleFromUrl("https://instagram.com/explore/tags/x")).toBeNull();
    expect(instagramHandleFromUrl("https://facebook.com/empresa")).toBeNull();
    expect(instagramHandleFromUrl(undefined)).toBeNull();
  });
});

describe("findInstagramHandle", () => {
  it("pega o primeiro handle válido da lista", () => {
    const handle = findInstagramHandle([
      undefined,
      "https://wa.me/5519999999999",
      "https://instagram.com/p/abc/",
      "https://www.instagram.com/cantinafellini/",
      "https://instagram.com/outro",
    ]);
    expect(handle).toBe("cantinafellini");
  });

  it("devolve null quando nenhuma URL é de perfil", () => {
    expect(findInstagramHandle(["https://site.com.br", null])).toBeNull();
  });
});

describe("upgradeInstagramImage", () => {
  it("remove o sufixo de resolução e a query", () => {
    expect(
      upgradeInstagramImage("https://cdn.com/v/s150x150/foto.jpg?_nc_ht=abc")
    ).toBe("https://cdn.com/v/foto.jpg");
    expect(upgradeInstagramImage("https://cdn.com/v/p1080x1080/foto.jpg")).toBe(
      "https://cdn.com/v/foto.jpg"
    );
  });
});

describe("isFeedPhotoUrl", () => {
  it("aceita foto de feed em resolução utilizável", () => {
    expect(isFeedPhotoUrl("https://cdn.com/v/t51/p1080x1080/foto.jpg")).toBe(true);
    expect(isFeedPhotoUrl("https://cdn.com/v/t51/foto.webp")).toBe(true);
  });

  it("descarta avatar de conta sugerida e asset de interface", () => {
    expect(isFeedPhotoUrl("https://cdn.com/v/t51/s150x150/avatar.jpg")).toBe(false);
    expect(isFeedPhotoUrl("https://cdn.com/rsrc.php/sprite.svg")).toBe(false);
    expect(isFeedPhotoUrl("https://cdn.com/static/bundle.js")).toBe(false);
  });
});

describe("parseInstagramHtml", () => {
  it("prefere a foto de perfil em alta à og:image", () => {
    const parsed = parseInstagramHtml(PROFILE_HTML);
    expect(parsed.profilePicUrl).toBe(
      "https://scontent.cdninstagram.com/v/t51.2885-19/profile_hd.jpg?_nc&oh=2"
    );
  });

  it("extrai nome e bio dos metadados", () => {
    const parsed = parseInstagramHtml(PROFILE_HTML);
    expect(parsed.fullName).toBe("Padaria Estrela");
    expect(parsed.bio).toContain("Pães artesanais");
  });

  it("coleta as fotos do feed já em alta resolução", () => {
    const parsed = parseInstagramHtml(PROFILE_HTML);
    expect(parsed.postImages).toEqual([
      "https://scontent.cdninstagram.com/v/post1.jpg",
      "https://scontent.cdninstagram.com/v/post2.jpg",
      "https://scontent.cdninstagram.com/v/post3.jpg",
    ]);
  });

  it("não devolve nada para HTML vazio ou sem perfil", () => {
    expect(parseInstagramHtml("").postImages).toEqual([]);
    const shell = parseInstagramHtml("<html><body>Faça login</body></html>");
    expect(shell.profilePicUrl).toBeUndefined();
    expect(shell.postImages).toEqual([]);
  });
});

describe("fetchInstagramProfile", () => {
  it("busca e parseia o perfil", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => PROFILE_HTML,
    })) as unknown as typeof fetch;

    const profile = await fetchInstagramProfile("padariaestrela", { fetchImpl });
    expect(profile.handle).toBe("padariaestrela");
    expect(profile.fullName).toBe("Padaria Estrela");
    expect(profile.postImages.length).toBe(3);
  });

  it("devolve perfil vazio quando o Instagram bloqueia", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 429,
      text: async () => "",
    })) as unknown as typeof fetch;

    const profile = await fetchInstagramProfile("bloqueado", { fetchImpl });
    expect(profile).toEqual({ handle: "bloqueado", postImages: [] });
  });

  it("não propaga erro de rede", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ETIMEDOUT");
    }) as unknown as typeof fetch;

    const profile = await fetchInstagramProfile("offline", { fetchImpl });
    expect(profile.postImages).toEqual([]);
  });
});
