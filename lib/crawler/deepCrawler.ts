// ============================================================
// AI Deep Research Agent — 4-Step Agentic Pipeline
// Produces a structured DeepResearchPayload for website generation
// ============================================================

import { chromium, Browser, Page } from "playwright";
import { Lead, DeepResearchPayload, Testimonial, GallerySection } from "@/lib/types";
import {
  LogoAnalysis,
  analyzeImage,
  analyzeLogo,
  extractBrandAssets,
  fetchAsDataUrl,
} from "./brandExtractor";
import { SocialProfiles, findSocialProfiles, socialAvatarUrls } from "./socialFinder";
import { vectorizeLogo } from "./logoVectorizer";
import {
  InstagramProfile,
  findInstagramHandle,
  scrapeInstagramWithBrowser,
} from "./instagramScraper";
import {
  LogoCandidate,
  findBestLogo,
  rankLogoCandidates,
  validateLogoCandidate,
} from "./logoFinder";
import { DesignKit, buildDesignKit } from "@/lib/design/kit";
import { parseColor } from "@/lib/design/color";
import { prepararPreview } from "@/lib/intelligence";
import { collectWhatsAppCandidates } from "./whatsappFinder";

// Legacy shape for backward-compat with DeepCrawlModal while we migrate
export interface DeepCrawlResult extends DeepResearchPayload {
  texts: string[];
  images: string[];
}

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-webgl",
      "--lang=pt-BR",
    ],
  });
  return _browser;
}

/** Simple check — filters out icons, SVGs, spinners, data URIs */
function isUsefulImage(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("data:")) return false;
  const lower = src.toLowerCase();
  if (
    lower.endsWith(".svg") ||
    lower.includes("icon") ||
    lower.includes("spinner") ||
    lower.includes("pixel") ||
    lower.includes("blank")
  )
    return false;
  return true;
}

/** Classify an image URL into a gallery category */
function classifyImage(
  src: string
): keyof GallerySection {
  const lower = src.toLowerCase();
  if (
    lower.includes("team") ||
    lower.includes("staff") ||
    lower.includes("equipe") ||
    lower.includes("person") ||
    lower.includes("people") ||
    lower.includes("foto-") ||
    lower.includes("profile")
  )
    return "team";
  if (
    lower.includes("product") ||
    lower.includes("produto") ||
    lower.includes("menu") ||
    lower.includes("cardapio") ||
    lower.includes("item")
  )
    return "products";
  if (
    lower.includes("venue") ||
    lower.includes("sala") ||
    lower.includes("interior") ||
    lower.includes("loja") ||
    lower.includes("ambiente") ||
    lower.includes("space") ||
    lower.includes("lh3.googleusercontent")
  )
    return "venue";
  return "misc";
}

// ─── Step 1: Brand & Identity Scraper ─────────────────────────────────────────
interface SiteScrapeResult {
  logoUrls: string[];
  appleTouchIcons: string[];
  favicons: string[];
  manifestIcons: string[];
  socialLinks: string[];
  /** Links "chamar no WhatsApp" publicados no site oficial */
  whatsappLinks: string[];
  primaryColor?: string;
  secondaryColor?: string;
  typography?: string;
  siteTexts: string[];
  siteImages: string[];
}

async function scrapeOfficialSite(
  page: Page,
  lead: Lead
): Promise<SiteScrapeResult> {
  const noSite: SiteScrapeResult = {
    logoUrls: [],
    appleTouchIcons: [],
    favicons: [],
    manifestIcons: [],
    socialLinks: [],
    whatsappLinks: [],
    primaryColor: undefined,
    secondaryColor: undefined,
    typography: undefined,
    siteTexts: [],
    siteImages: [],
  };

  const url = lead.originalWebsite;
  if (
    !url ||
    url.includes("instagram.com") ||
    url.includes("facebook.com") ||
    url.includes("wa.me") ||
    url.includes("whatsapp.com") ||
    url.includes("linktr.ee") ||
    url.includes("beacons.ai")
  ) {
    // O "site" já é o próprio link de contato — não há página para visitar,
    // mas se for um link de WhatsApp o número está ali dentro do texto.
    if (url && (url.includes("wa.me") || url.includes("whatsapp.com"))) {
      return { ...noSite, whatsappLinks: [url] };
    }
    return noSite;
  }

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(1000);

    // Brand assets
    const brand = await extractBrandAssets(page, url);

    // Text content
    const siteTexts = await page.evaluate((): string[] => {
      const els = document.querySelectorAll("h1, h2, h3, p, li");
      return Array.from(els)
        .map((el) => (el as HTMLElement).innerText?.trim())
        .filter((t) => t && t.length > 30)
        .slice(0, 12);
    });

    // Images
    const siteImages = await page.evaluate((): string[] => {
      const imgs = document.querySelectorAll<HTMLImageElement>("img");
      return Array.from(imgs)
        .map((img) => img.src || img.currentSrc || img.getAttribute("data-src") || "")
        .filter(Boolean);
    });

    return {
      logoUrls: brand.logoUrls,
      appleTouchIcons: brand.appleTouchIcons ?? [],
      favicons: brand.favicons ?? [],
      manifestIcons: brand.manifestIcons ?? [],
      socialLinks: brand.socialLinks ?? [],
      whatsappLinks: brand.whatsappLinks ?? [],
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      typography: brand.typography,
      siteTexts,
      siteImages,
    };
  } catch (e) {
    console.log(`[DeepResearch] Error scraping official site:`, e);
    return noSite;
  }
}

// ─── Step 2: Social Proof — Web Search ────────────────────────────────────────
interface WebSearchResult {
  snippets: string[];
  topUrls: string[];
  reviewSnippets: string[];
}

async function searchWebForSocialProof(
  lead: Lead
): Promise<WebSearchResult> {
  const empty: WebSearchResult = {
    snippets: [],
    topUrls: [],
    reviewSnippets: [],
  };

  try {
    // General search for mentions
    const q1 = encodeURIComponent(`"${lead.title}" ${lead.city} ${lead.category}`);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${q1}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) return empty;
    const html = await res.text();

    // Extract text snippets
    const rawSnippets = html
      .split('class="result__snippet')
      .slice(1)
      .map((chunk) => chunk.split("</a>")[0]);
    const snippets = rawSnippets
      .map((s) => s.replace(/<[^>]+>/g, "").trim())
      .filter((t) => t.length > 20)
      .slice(0, 8);

    // Extract URLs
    const linkMatches = [...html.matchAll(/href="([^"]+uddg=[^"]+)"/g)];
    const topUrls = linkMatches
      .map((m) => {
        try {
          return decodeURIComponent(m[1].split("uddg=")[1].split("&")[0]);
        } catch {
          return "";
        }
      })
      .filter((u) => u && !u.includes("google") && !u.includes("duckduckgo"))
      // Guarda mais que os 5 primeiros: os links de Instagram e Facebook
      // costumam aparecer depois dos diretórios e são o que alimenta a
      // descoberta de perfil das empresas sem site.
      .slice(0, 12);

    // Second search specifically for reviews
    const q2 = encodeURIComponent(
      `"${lead.title}" avaliações review site:google.com OR site:tripadvisor.com OR site:facebook.com`
    );
    const res2 = await fetch(`https://html.duckduckgo.com/html/?q=${q2}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    let reviewSnippets: string[] = [];
    if (res2.ok) {
      const html2 = await res2.text();
      const raw2 = html2
        .split('class="result__snippet')
        .slice(1)
        .map((chunk) => chunk.split("</a>")[0]);
      reviewSnippets = raw2
        .map((s) => s.replace(/<[^>]+>/g, "").trim())
        .filter((t) => t.length > 20)
        .slice(0, 5);
    }

    return { snippets, topUrls, reviewSnippets };
  } catch (e) {
    console.log(`[DeepResearch] Web search error:`, e);
    return empty;
  }
}

// ─── Step 3: Extract images via DuckDuckGo Image Search API ─────────────────
async function searchDuckDuckGoImages(query: string): Promise<string[]> {
  try {
    // 1. Get VQD token
    const res1 = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(
        query
      )}&t=h_&iar=images&iax=images&ia=images`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }
    );
    const html = await res1.text();
    const vqdMatch = html.match(/vqd=([\d-]+)/);
    if (!vqdMatch) return [];
    
    // 2. Fetch images JSON
    const res2 = await fetch(
      `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqdMatch[1]}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      }
    );
    const data = await res2.json();
    if (data.results && Array.isArray(data.results)) {
      return data.results.map((r: any) => r.image as string).filter(Boolean);
    }
    return [];
  } catch (err) {
    console.log(`[DeepResearch] DDG Image search failed:`, err);
    return [];
  }
}

/**
 * Texto público da página do Facebook, best-effort.
 *
 * Sem login o Facebook devolve pouco, mas o suficiente às vezes traz o
 * número que a página divulga no "Sobre" ou num link de WhatsApp embutido.
 * `fetch` puro (sem Playwright) e timeout curto: se falhar, segue sem isso —
 * mesmo padrão de tolerância a falha do resto do arquivo.
 */
async function fetchFacebookPublicText(handle: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`https://www.facebook.com/${handle}/`, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

// ─── Instagram — foto de perfil (logo) + acervo do feed ───────────────────────
async function resolveInstagram(
  page: Page,
  lead: Lead,
  siteData: SiteScrapeResult,
  searchUrls: string[]
): Promise<InstagramProfile | null> {
  const handle = findInstagramHandle([
    lead.originalWebsite,
    ...siteData.socialLinks,
    ...searchUrls,
  ]);
  if (!handle) return null;

  const profile = await scrapeInstagramWithBrowser(page, handle);
  return profile;
}

/**
 * Média das fotos: cor dominante e luminância. É o que decide se o site
 * vai ser claro ou escuro e qual paleta usar quando não há logo.
 */
async function analyzePhotos(
  page: Page,
  photos: string[]
): Promise<{ dominant?: string; luminance?: number }> {
  const sample = photos.slice(0, 3);
  if (sample.length === 0) return {};

  const analyses = await Promise.all(
    sample.map(async (url) => {
      const dataUrl = await fetchAsDataUrl(url).catch(() => undefined);
      if (!dataUrl) return undefined;
      return analyzeImage(page, dataUrl).catch(() => undefined);
    })
  );

  const valid = analyses.filter((a): a is NonNullable<typeof a> => Boolean(a));
  if (valid.length === 0) return {};

  const luminance =
    valid.reduce((sum, a) => sum + a.luminance, 0) / valid.length;
  const dominant = valid.find((a) => a.dominant)?.dominant;

  return { dominant, luminance };
}

// ─── Logo da marca — múltiplas fontes + cor dominante ─────────────────────────
async function resolveBrandLogo(
  page: Page,
  lead: Lead,
  siteData: SiteScrapeResult,
  instagram: InstagramProfile | null,
  social: SocialProfiles
): Promise<{
  best?: LogoCandidate;
  candidates: LogoCandidate[];
  dominantColor?: string;
  analysis?: LogoAnalysis;
  vectorUrl?: string;
}> {
  const lookup = {
    title: lead.title,
    city: lead.city,
    originalWebsite: lead.originalWebsite,
  };

  const avatars = socialAvatarUrls(social);

  const found = await findBestLogo(lookup, {
    logoUrls: siteData.logoUrls,
    manifestIcons: siteData.manifestIcons,
    instagramProfilePic: instagram?.profilePicUrl,
    instagramAvatars: avatars.instagram,
    facebookAvatars: avatars.facebook,
    appleTouchIcons: siteData.appleTouchIcons,
    favicons: siteData.favicons,
  });

  let candidates = found.candidates;

  // Último recurso: empresa sem site nem Instagram — procura o logo na web.
  if (candidates.length === 0) {
    const images = await searchDuckDuckGoImages(`"${lead.title}" ${lead.city} logo`);
    const validated = await Promise.all(
      images.slice(0, 6).map((url) =>
        validateLogoCandidate({ url, source: "image-search" }).catch(() => null)
      )
    );
    candidates = rankLogoCandidates(
      validated.filter((c): c is LogoCandidate => c !== null)
    );
  }

  const best = candidates[0];
  if (!best) return { candidates: [] };

  // A cor sai dos pixels do logo, não do CSS: é a identidade que o dono
  // reconhece quando abre o preview. A mesma leitura devolve transparência,
  // claro/escuro e proporção — o que define o encaixe no header.
  const dataUrl = await fetchAsDataUrl(best.url);
  const analysis = dataUrl ? await analyzeLogo(page, dataUrl) : undefined;

  // Bitmap pequeno e chapado vira SVG para não borrar quando ampliado
  let vectorUrl: string | undefined;
  if (analysis) {
    const vector = vectorizeLogo(
      analysis.mask,
      {
        sourceSize: Math.max(best.width ?? 0, best.height ?? 0),
        format: best.format,
        colorCount: analysis.colorCount,
      },
      { fill: analysis.dominant ?? "#111827" }
    );
    vectorUrl = vector?.dataUrl;
  }

  return { best, candidates, dominantColor: analysis?.dominant, analysis, vectorUrl };
}

// ─── Step 4: AI Content Generation (Groq or fallback) ────────────────────────
async function generateCopywritingSeeds(
  lead: Lead,
  context: {
    texts: string[];
    services: string[];
    reviews: string[];
  },
  kit: DesignKit,
  assets: { logoUrl?: string; images: string[] }
): Promise<{
  valueProp: string;
  heroHeadlineIdeas: string[];
  painPointsSolved: string[];
  faqItems: { q: string; a: string }[];
  prompt: string;
}> {
  const fallback = {
    valueProp: `${lead.title} oferece serviços de ${lead.category} de alta qualidade em ${lead.city}.`,
    heroHeadlineIdeas: [
      `${lead.title}: Referência em ${lead.category} em ${lead.city}`,
      `Qualidade e confiança em ${lead.category} — ${lead.title}`,
      `O melhor de ${lead.category} pertinho de você, em ${lead.city}`,
    ],
    painPointsSolved: [
      `Dificuldade em encontrar um ${lead.category} de confiança`,
      `Falta de atendimento personalizado e de qualidade`,
      `Preços justos sem abrir mão da excelência`,
    ],
    faqItems: [
      {
        q: `Como funciona o atendimento?`,
        a: `Entre em contato pelo WhatsApp e agende seu horário.`,
      },
      {
        q: `Onde ficam localizados?`,
        a: `Estamos em ${lead.address}, ${lead.city}.`,
      },
      {
        q: `Quais formas de pagamento aceitas?`,
        a: `Aceitamos cartão, Pix e dinheiro.`,
      },
    ],
    prompt: "",
  };

  if (!process.env.GROQ_API_KEY) {
    fallback.prompt = buildFallbackPrompt(lead, context, kit, assets);
    return fallback;
  }

  try {
    const systemMsg = `Você é um Especialista em Copywriting e Marketing Digital. 
Sua tarefa é analisar os dados de uma empresa local e gerar:
1. Uma proposta de valor concisa (1 frase)
2. 3 ideias de headline para o hero section do site
3. 3 principais problemas que a empresa resolve para os clientes
4. 3 itens de FAQ para o site
5. Um prompt detalhado para uma IA gerar o código de uma Landing Page de alta conversão

Responda SOMENTE em JSON válido com esta estrutura exata:
{
  "valueProp": "string",
  "heroHeadlineIdeas": ["string", "string", "string"],
  "painPointsSolved": ["string", "string", "string"],
  "faqItems": [
    {"q": "string", "a": "string"},
    {"q": "string", "a": "string"},
    {"q": "string", "a": "string"}
  ],
  "prompt": "string (o prompt completo para gerar o site)"
}`;

    const userMsg = `Empresa: ${lead.title}
Segmento: ${lead.category}
Localização: ${lead.address} - ${lead.city}
Avaliação no Google: ${lead.rating} estrelas (${lead.reviewsCount} avaliações)
WhatsApp: ${lead.phone}

Textos extraídos do site/web:
${context.texts.slice(0, 6).join("\n")}

Serviços identificados:
${context.services.slice(0, 8).join(", ")}

Avaliações de clientes:
${context.reviews.slice(0, 4).join("\n")}

Identidade visual já resolvida (use-a no prompt da landing page, não invente outra):
${designDirectives(kit, assets)}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[DeepResearch] Groq error:", await res.text());
      fallback.prompt = buildFallbackPrompt(lead, context, kit, assets);
      return fallback;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(content);

    return {
      valueProp: parsed.valueProp || fallback.valueProp,
      heroHeadlineIdeas:
        parsed.heroHeadlineIdeas || fallback.heroHeadlineIdeas,
      painPointsSolved:
        parsed.painPointsSolved || fallback.painPointsSolved,
      faqItems: parsed.faqItems || fallback.faqItems,
      // Mesmo quando a IA devolve um prompt, o brief de design é anexado:
      // o modelo não conhece a paleta/tipografia resolvidas aqui.
      prompt: parsed.prompt
        ? `${parsed.prompt}\n\n${designDirectives(kit, assets)}`
        : buildFallbackPrompt(lead, context, kit, assets),
    };
  } catch (e) {
    console.error("[DeepResearch] Groq call failed:", e);
    fallback.prompt = buildFallbackPrompt(lead, context, kit, assets);
    return fallback;
  }
}

/**
 * Bloco de design que vai junto do prompt da landing page.
 * Sai do DesignKit — mesmas cores, fontes e layout que o preview
 * renderiza, para que o site gerado não destoe do que o lead viu.
 */
function designDirectives(
  kit: DesignKit,
  assets: { logoUrl?: string; images: string[] }
): string {
  const p = kit.palette;
  const layoutBrief: Record<string, string> = {
    overlay: "Hero full-bleed: foto ocupando toda a largura, overlay escuro em gradiente e texto alinhado à esquerda.",
    split: "Hero dividido em duas colunas: painel sólido na cor primária com o texto à esquerda, foto recortada à direita.",
    editorial: "Hero editorial: fundo claro, headline centralizada em fonte serifada e foto larga em moldura arredondada abaixo.",
  };

  return `[SISTEMA DE DESIGN — obrigatório]
Arquétipo: ${kit.archetypeLabel} (tom: ${kit.mood})
Layout do hero: ${layoutBrief[kit.layout] ?? kit.layout}
Cores (HEX, contraste WCAG AA já validado):
  primária ${p.primary} (texto sobre ela: ${p.onPrimary})
  primária escura ${p.primaryDark} | primária clara ${p.primaryLight}
  acento/CTA ${p.accent} (texto sobre ele: ${p.onAccent})
  fundo ${p.surface} | faixa alternada ${p.surfaceAlt} | card ${p.card}
  texto ${p.text} | texto secundário ${p.textMuted} | borda ${p.border}
Tipografia: títulos "${kit.fonts.heading}", corpo "${kit.fonts.body}" (Google Fonts)
Raio de borda: ${kit.radius.md} nos cards, ${kit.radius.pill} nos botões
Origem da cor: ${kit.colorSource === "logo" ? "extraída dos pixels do logo real da empresa" : kit.colorSource === "site" ? "declarada no site da empresa" : "paleta de referência do segmento"}

[ASSETS VISUAIS]
Logo: ${assets.logoUrl ?? "não encontrado — use um lockup tipográfico com a inicial em bloco na cor primária"}
Imagens da empresa:
${assets.images.length > 0 ? assets.images.map((u, i) => `${i + 1}. ${u}`).join("\n") : "Nenhuma — use imagens do Unsplash relevantes ao segmento"}

[REGRAS DE QUALIDADE]
- Ícones em SVG (Lucide/Heroicons), nunca emoji
- Alvos de toque com no mínimo 44x44px
- Transições de 150–300ms e respeito a prefers-reduced-motion
- Responsivo em 375px, 768px, 1024px e 1440px
- Contraste mínimo de 4.5:1 em todo texto
- Zero placeholders — site pronto para publicar`;
}

function buildFallbackPrompt(
  lead: Lead,
  context: { texts: string[]; services: string[]; reviews: string[] },
  kit: DesignKit,
  assets: { logoUrl?: string; images: string[] }
): string {
  return `Aja como um Desenvolvedor Web e UX Designer Especialista.
Crie o código completo (HTML/CSS/JavaScript ou React) de uma Landing Page de alta conversão.

[DADOS DA EMPRESA]
Nome: ${lead.title}
Segmento: ${lead.category}
Localização: ${lead.address} - ${lead.city}
Avaliação no Google Maps: ${lead.rating} estrelas (${lead.reviewsCount} avaliações)
WhatsApp: ${lead.phone}

[CONTEÚDO EXTRAÍDO]
Textos do site/web:
${context.texts.slice(0, 6).join("\n")}

Serviços:
${context.services.join(", ")}

Avaliações de clientes:
${context.reviews.slice(0, 3).join("\n")}

${designDirectives(kit, assets)}

[SEÇÕES]
Hero, Prova social (nota do Google), Serviços, Diferenciais, Depoimentos, Localização, CTA final, Rodapé
CTA principal: botão de WhatsApp flutuante + botão no hero`;
}

// ─── Extract services from text ───────────────────────────────────────────────
function extractServices(texts: string[]): string[] {
  const services: string[] = [];
  const serviceKeywords = /serviço|atendimento|oferece|especialidade|realizamos|trabalhamos/i;

  for (const t of texts) {
    if (serviceKeywords.test(t) && t.length < 120) {
      services.push(t.trim());
    }
  }
  return services.slice(0, 8);
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export async function runDeepCrawl(lead: Lead): Promise<DeepCrawlResult> {
  const log = (msg: string) => console.log(`[DeepResearch] ${msg}`);
  const sourcesVisited: string[] = [];
  const gallery: GallerySection = { venue: [], products: [], team: [], misc: [] };
  const allImages = new Set<string>();

  // Include Maps photos already collected during GMB scrape
  if (lead.photos && lead.photos.length > 0) {
    lead.photos.forEach((p) => {
      allImages.add(p);
      gallery.venue.push(p);
    });
  }

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  });

  let confidence: "high" | "medium" | "low" = "low";

  try {
    const page = await context.newPage();

    // ── STEP 1: Brand & Identity ────────────────────────────────────────────
    log("Step 1/5 — Scraping official site...");
    const siteData = await scrapeOfficialSite(page, lead);

    if (lead.originalWebsite && siteData.siteTexts.length > 0) {
      sourcesVisited.push(lead.originalWebsite);
      confidence = "medium";
    }

    // Classify and add site images to gallery
    siteData.siteImages.forEach((src) => {
      if (src && isUsefulImage(src)) {
        try {
          const u = new URL(src, lead.originalWebsite).toString();
          if (!allImages.has(u)) {
            allImages.add(u);
            const cat = classifyImage(u);
            if (gallery[cat].length < 5) gallery[cat].push(u);
          }
        } catch {}
      }
    });

    // ── STEP 2: Social Proof & Web Search ──────────────────────────────────
    log("Step 2/6 — Searching web for social proof...");
    const webSearch = await searchWebForSocialProof(lead);

    if (webSearch.snippets.length > 0) sourcesVisited.push("duckduckgo.com");

    // ── STEP 3: Redes sociais — perfis e acervo do feed ────────────────────
    log("Step 3/6 — Finding social profiles...");

    // Para empresa sem site, a rede social é a única identidade que existe:
    // vale uma busca dedicada em vez de torcer para aparecer no resultado geral.
    const social = await findSocialProfiles(
      { title: lead.title, city: lead.city, category: lead.category, originalWebsite: lead.originalWebsite },
      [...siteData.socialLinks, ...webSearch.topUrls]
    );
    log(
      `  Instagram: ${social.instagram ? "@" + social.instagram : "—"} | Facebook: ${social.facebook ?? "—"}`
    );
    if (social.instagram) sourcesVisited.push(`instagram.com/${social.instagram}`);
    if (social.facebook) sourcesVisited.push(`facebook.com/${social.facebook}`);

    const instagram = social.instagram
      ? await resolveInstagram(page, lead, siteData, [
          `https://instagram.com/${social.instagram}`,
        ])
      : await resolveInstagram(page, lead, siteData, webSearch.topUrls);
    if (instagram) {
      log(
        `  @${instagram.handle} — perfil: ${instagram.profilePicUrl ? "sim" : "não"}, ${instagram.postImages.length} fotos do feed`
      );
      // Foto do feed é a melhor imagem que existe de uma empresa local:
      // é o ambiente e o produto reais, tirados por quem conhece o lugar.
      instagram.postImages.forEach((src) => {
        if (!allImages.has(src)) {
          allImages.add(src);
          const cat = classifyImage(src);
          if (gallery[cat].length < 8) gallery[cat].push(src);
        }
      });
    } else {
      log("  Nenhum perfil do Instagram encontrado");
    }

    // ── WhatsApp — o canal que a própria empresa publicou para contato ─────
    // Só lê o que o negócio já tornou público para ser procurado: link no
    // site, bio do Instagram, texto da página do Facebook. Não tenta achar
    // o número pessoal do proprietário — isso não é escopo desta função.
    const facebookText = social.facebook
      ? await fetchFacebookPublicText(social.facebook)
      : "";
    const whatsapp = collectWhatsAppCandidates({
      mapsWebsiteLink: lead.originalWebsite,
      websiteTexts: [...siteData.whatsappLinks, ...siteData.siteTexts],
      instagramBio: instagram?.bio,
      facebookText,
      mapsPhone: lead.phone,
    })[0];
    if (whatsapp) {
      log(`  📱 WhatsApp: ${whatsapp.number} (fonte: ${whatsapp.source})`);
      sourcesVisited.push(`whatsapp:${whatsapp.source}`);
    } else {
      log("  Nenhum WhatsApp publicado encontrado além do telefone do Maps");
    }

    // ── STEP 4: Logo da marca ───────────────────────────────────────────────
    log("Step 4/6 — Hunting brand logo...");
    const logo = await resolveBrandLogo(page, lead, siteData, instagram, social);
    if (logo.best) {
      log(`  Logo: ${logo.best.source} (${logo.best.width ?? "?"}x${logo.best.height ?? "?"}) → ${logo.best.url}`);
      sourcesVisited.push(`logo:${logo.best.source}`);
    } else {
      log("  Nenhum logo utilizável encontrado — preview usará lockup tipográfico");
    }
    if (logo.analysis) {
      log(
        `  Encaixe: ${logo.analysis.hasAlpha ? "com transparência" : "fundo sólido"}, luminância ${logo.analysis.luminance.toFixed(2)}, proporção ${logo.analysis.aspect.toFixed(2)}, ${logo.analysis.colorCount} cores`
      );
    }
    if (logo.dominantColor) log(`  Cor dominante do logo: ${logo.dominantColor}`);
    if (logo.vectorUrl) log("  Logo vetorizado (bitmap pequeno → SVG)");

    // ── STEP 5: Imagens externas + leitura do acervo ───────────────────────
    log("Step 5/6 — Fetching images and reading the visual mood...");
    if (allImages.size < 6) {
      const query = `"${lead.title}" ${lead.city} instagram`;
      log(`  Searching images for: ${query}`);
      const extImages = await searchDuckDuckGoImages(query);
      sourcesVisited.push("DuckDuckGo Images");

      extImages.slice(0, 15).forEach((src) => {
        if (src && isUsefulImage(src)) {
          try {
            if (!allImages.has(src)) {
              allImages.add(src);
              const cat = classifyImage(src);
              if (gallery[cat].length < 8) gallery[cat].push(src);
            }
          } catch {}
        }
      });
    }

    const photoAnalysis = await analyzePhotos(page, Array.from(allImages));
    if (photoAnalysis.luminance !== undefined) {
      log(
        `  Acervo: luminância ${photoAnalysis.luminance.toFixed(2)}, cor ${photoAnalysis.dominant ?? "—"}`
      );
    }

    await page.close();

    // ── STEP 6: AI Copywriting ───────────────────────────────────────────────
    log("Step 6/6 — Generating AI copy seeds...");
    const allTexts = [...siteData.siteTexts, ...webSearch.snippets];
    const services = extractServices(allTexts);

    // Build testimonials from review snippets
    const testimonials: Testimonial[] = [
      ...webSearch.reviewSnippets.slice(0, 3).map(
        (quote): Testimonial => ({
          quote,
          author: "Cliente verificado",
          source: "web",
        })
      ),
    ];

    const finalImages = Array.from(allImages).slice(0, 10);

    // O kit de design é resolvido antes da IA para que o prompt já saia
    // com a paleta e a tipografia definitivas.
    const kit = buildDesignKit({
      title: lead.title,
      category: lead.category,
      brand: {
        logoUrl: logo.vectorUrl ?? logo.best?.url,
        logoDominantColor: logo.dominantColor,
        logoHasAlpha: logo.analysis?.hasAlpha,
        logoLuminance: logo.analysis?.luminance,
        logoAspect: logo.analysis?.aspect,
        primaryColor: siteData.primaryColor,
        secondaryColor: siteData.secondaryColor,
        typography: siteData.typography,
        photoDominantColor: photoAnalysis.dominant,
        photoLuminance: photoAnalysis.luminance,
        photoCount: finalImages.length,
      },
    });

    const copySeeds = await generateCopywritingSeeds(
      lead,
      {
        texts: allTexts,
        services,
        reviews: webSearch.reviewSnippets,
      },
      kit,
      { logoUrl: logo.best?.url, images: finalImages }
    );

    if (logo.best || allTexts.length > 4 || testimonials.length > 0) {
      confidence = "high";
    }

    // O Deep Crawl deixa de ser um sistema paralelo: o que ele descobriu
    // do site vira evidência do BusinessProfile, e é o profile que decide
    // o que o preview pode afirmar.
    const inteligencia = prepararPreview(
      { ...lead, originalWebsite: lead.originalWebsite },
      {
        deepResearch: {
          services,
          websiteTexts: siteData.siteTexts,
          reviews: webSearch.reviewSnippets,
          websiteUsed: siteData.siteTexts.length > 0,
        },
      }
    );
    log(
      `🧠 Perfil: ${inteligencia.profile.label} (${inteligencia.profile.nodeId}) — confiança ${inteligencia.profile.confidence} [${inteligencia.profile.confidenceBand}], ${inteligencia.profile.confirmedServices.length} serviços confirmados`
    );

    const payload: DeepResearchPayload = {
      business_profile: inteligencia.profile,
      preview_blueprint: inteligencia.blueprint,
      brand_identity: {
        logoUrls: logo.candidates.map((c) => c.url),
        bestLogoUrl: logo.best?.url,
        bestLogoSource: logo.best?.source,
        logoCandidates: logo.candidates.map((c) => ({
          url: c.url,
          source: c.source,
          width: c.width,
          height: c.height,
          format: c.format,
        })),
        logoDominantColor: logo.dominantColor,
        logoVectorUrl: logo.vectorUrl,
        logoHasAlpha: logo.analysis?.hasAlpha,
        logoLuminance: logo.analysis?.luminance,
        logoAspect: logo.analysis?.aspect,
        photoDominantColor: photoAnalysis.dominant,
        photoLuminance: photoAnalysis.luminance,
        instagramHandle: social.instagram ?? instagram?.handle,
        facebookHandle: social.facebook,
        whatsappNumber: whatsapp?.number,
        whatsappE164: whatsapp?.e164,
        whatsappSource: whatsapp?.source,
        // Normalizado para HEX — o site pode ter declarado rgb(), hsl() ou
        // canais soltos do Tailwind (`--primary: 0 75% 15%`).
        primaryColor: parseColor(siteData.primaryColor) ?? undefined,
        secondaryColor: parseColor(siteData.secondaryColor) ?? undefined,
        brandVibe: inferBrandVibe(lead.category),
        typography: siteData.typography,
      },
      design_brief: {
        archetypeId: kit.archetypeId,
        archetypeLabel: kit.archetypeLabel,
        layout: kit.layout,
        headingFont: kit.fonts.heading,
        bodyFont: kit.fonts.body,
        primary: kit.palette.primary,
        accent: kit.palette.accent,
        colorSource: kit.colorSource,
      },
      gallery,
      testimonials,
      copywriting_seed: {
        valueProp: copySeeds.valueProp,
        heroHeadlineIdeas: copySeeds.heroHeadlineIdeas,
        painPointsSolved: copySeeds.painPointsSolved,
        faqItems: copySeeds.faqItems,
        services: services.length > 0 ? services : [lead.category],
      },
      social_proof: {
        googleRating: lead.rating,
        reviewCount: lead.reviewsCount,
        topReviews: webSearch.reviewSnippets.slice(0, 3),
        mentions: webSearch.topUrls,
      },
      operational: {
        services: services.length > 0 ? services : [lead.category],
        differentiators: copySeeds.painPointsSolved,
      },
      prompt: copySeeds.prompt,
      metadata: {
        crawledAt: new Date().toISOString(),
        sourcesVisited,
        confidence,
      },
    };

    log(`✅ Deep research complete — confidence: ${confidence}`);

    // Return legacy shape (texts + images) for backward compatibility
    return {
      ...payload,
      texts: allTexts.slice(0, 8),
      images: finalImages,
    };
  } finally {
    await context.close();
  }
}

/** Infer brand vibe/tone from business category */
function inferBrandVibe(category: string): string {
  const cat = category.toLowerCase();
  if (/clínica|médico|saúde|dentista|fisio/.test(cat))
    return "profissional, confiável, acolhedor";
  if (/restaurante|lanchonete|café|pizz|buffet/.test(cat))
    return "aconchegante, apetitoso, familiar";
  if (/academia|personal|pilates|yoga|fitness/.test(cat))
    return "energético, motivacional, saudável";
  if (/salão|estética|beleza|barber|nail/.test(cat))
    return "elegante, moderno, sofisticado";
  if (/advogado|jurídico|contabilidade|consultoria/.test(cat))
    return "sério, profissional, confiável";
  if (/pet|veterinário|banho|tosa/.test(cat))
    return "carinhoso, seguro, especializado";
  if (/escola|cursinho|aula|ensino|coach/.test(cat))
    return "inspirador, transformador, educativo";
  return "profissional, moderno, confiável";
}
