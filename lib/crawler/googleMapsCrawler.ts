// ============================================================
// CRAWLER REAL — Google Maps via Playwright (Chromium Headless)
// Coleta a lista de resultados, guarda a URL de cada lugar e visita uma a
// uma para extrair os detalhes. Todo campo passa pelas guardas de
// lib/crawler/fieldGuards antes de virar Lead.
// ============================================================

import { chromium, Browser, Page } from "playwright";
import { Lead } from "@/lib/types";
import { analyzeUrl } from "@/lib/urlAnalyzer";
import {
  normalizePhone,
  makeLeadId,
  normalizeCityName,
  extractNeighborhood,
  parseOpeningHours,
} from "./parseHelpers";
import {
  parseRatingFromLabel,
  parseReviewCountFromLabel,
  sanitizeAddress,
  sanitizeCategory,
  sanitizePhone,
  splitCardTexts,
} from "./fieldGuards";
import { resumirQualidade, formatarResumo } from "./dataQuality";
import { normalizar } from "@/lib/intelligence/classifyBusiness";
import { collectWhatsAppCandidates } from "./whatsappFinder";

const CRAWLER_TIMEOUT = Math.min(
  parseInt(process.env.CRAWLER_TIMEOUT ?? "30000", 10),
  60000
);
const MAX_RESULTS = Math.min(
  parseInt(process.env.CRAWLER_MAX_RESULTS ?? "15", 10),
  20
);

// ─── Singleton browser ────────────────────────────────────────────────────────
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

// ─── Cookie consent ───────────────────────────────────────────────────────────
async function acceptConsent(page: Page): Promise<void> {
  try {
    const btn = page
      .locator("button")
      .filter({ hasText: /Aceitar tudo|Accept all/i })
      .first();
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
      await page.waitForTimeout(800);
    }
  } catch {
    /* no consent dialog */
  }
}

// ─── Detail panel extraction ──────────────────────────────────────────────────
interface DetailResult {
  phone: string;
  phoneE164: string | undefined;
  website: string;
  /** Endereço completo do painel — mais rico que o resumo do card */
  address: string;
  /** Bloco de nota do painel, ex. "4,4 (6.220)" */
  ratingBlock: string;
  photos: string[];
  openingHours: Record<string, string>;
  isOpenNow: boolean | undefined;
  neighborhood: string | undefined;
}

/**
 * Uses page.evaluate() to scan ALL anchor tags in the DOM for an external
 * website link. This is the most reliable approach — no brittle CSS selectors
 * that break when Google changes internal class names.
 *
 * Priority order:
 *   1. <a data-item-id="authority"> — canonical GMB website link
 *   2. Any <a> whose aria-label (or parent's) contains "site" / "website"
 *   3. Any external <a href="http..."> inside the main panel
 *
 * Filters out: google.com, goo.gl, maps internal links
 */
async function extractWebsiteFromDOM(page: Page): Promise<string> {
  return page.evaluate((): string => {
    const GOOGLE_RE = /google\.|goo\.gl/i;
    const MAPS_RE = /\/maps\//i;

    function isExternal(href: string): boolean {
      if (!href || !href.startsWith("http")) return false;
      if (GOOGLE_RE.test(href)) return false;
      if (MAPS_RE.test(href)) return false;
      return true;
    }

    // Priority 1: canonical GMB website anchor
    const authority = document.querySelector<HTMLAnchorElement>(
      'a[data-item-id="authority"]'
    );
    if (authority && isExternal(authority.href)) return authority.href;

    // Priority 2: any anchor with a "site"-related aria-label on itself or a parent
    const allAnchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("a[href]")
    );

    for (const a of allAnchors) {
      if (!isExternal(a.href)) continue;

      // Check aria-label on the anchor or nearest labelled ancestor
      const selfLabel = (a.getAttribute("aria-label") || "").toLowerCase();
      const parentLabel = (
        a.closest("[aria-label]")?.getAttribute("aria-label") || ""
      ).toLowerCase();
      const combinedLabel = selfLabel + " " + parentLabel;

      if (
        combinedLabel.includes("site") ||
        combinedLabel.includes("website") ||
        combinedLabel.includes("web")
      ) {
        return a.href;
      }
    }

    // Priority 3: first external link inside [role="main"] or [role="complementary"]
    // (catches links in action-button rows: Ligar, Rota, Site)
    const panelLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        '[role="main"] a[href], [role="complementary"] a[href]'
      )
    );
    for (const a of panelLinks) {
      if (isExternal(a.href)) return a.href;
    }

    return "";
  });
}

/**
 * Extrai telefone, site, endereço, nota, fotos e horário do painel do lugar.
 *
 * Antes isto clicava no card e voltava com `goBack()`. Era o gargalo: o feed
 * carrega sob demanda e volta ao topo a cada retorno, então os cards do fim da
 * lista já não existiam no DOM na hora do clique — o painel abria em 16% das
 * vezes e telefone, fotos e avaliações caíam juntos. Agora a URL do lugar é
 * capturada na coleta e navegamos direto para ela: sem clique, sem voltar,
 * sem depender de o card continuar renderizado.
 */
async function extractDetailFromPanel(
  page: Page,
  name: string,
  address: string,
  placeUrl: string
): Promise<DetailResult> {
  const empty: DetailResult = {
    phone: "",
    phoneE164: undefined,
    website: "",
    address: "",
    ratingBlock: "",
    photos: [],
    openingHours: {},
    isOpenNow: undefined,
    neighborhood: extractNeighborhood(address),
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (!placeUrl) throw new Error("card sem URL de lugar");

      await page.goto(placeUrl, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });

      // O painel monta em duas etapas: título primeiro, blocos de contato depois
      await page
        .locator('[role="main"]')
        .first()
        .waitFor({ state: "visible", timeout: 8000 })
        .catch(() => {});
      await page.waitForTimeout(1800);

      // ── Website — full DOM scan ───────────────────────────────────────────
      const website = await extractWebsiteFromDOM(page).catch(() => "");
      if (website) {
        console.log(`[crawler]   🌐 ${name}: ${website}`);
      } else {
        console.log(`[crawler]   ⚠️  ${name}: no website found in DOM`);
      }

      // ── Phone — multiple selector strategies ──────────────────────────────
      const phoneRaw = await page
        .locator(
          [
            '[data-item-id*="phone"] [aria-label]',
            '[aria-label*="Telefone"]',
            '[aria-label*="telefone"]',
            'button[data-tooltip*="phone"]',
            '[data-item-id="phone:tel"]',
          ].join(", ")
        )
        .first()
        .getAttribute("aria-label", { timeout: 3000 })
        .catch(() => null);

      const rawPhone = phoneRaw
        ? phoneRaw.replace(/^(Telefone|Phone):\s*/i, "").trim()
        : "";
      // sanitizePhone recusa rótulo de botão e número implausível; o que não
      // passa vira string vazia, nunca um texto de fallback.
      const phone = sanitizePhone(rawPhone);
      const phoneE164 = phone ? normalizePhone(phone) : undefined;

      // ── Nota e avaliações do painel ───────────────────────────────────────
      // O card às vezes traz a contagem só como texto sem aria-label, e nessa
      // variante do DOM ela não vem. O painel mostra sempre: "4,4 (6.220)".
      const notaBloco = await page
        .locator('[role="main"] .F7nice, [role="main"] [class*="F7nice"]')
        .first()
        .innerText({ timeout: 2500 })
        .catch(() => "");

      const avaliacoesTexto =
        notaBloco ||
        (await page
          .locator('[role="main"] span')
          .filter({ hasText: /^\([\d.]+\)$/ })
          .first()
          .innerText({ timeout: 1500 })
          .catch(() => ""));

      // ── Endereço completo do painel ───────────────────────────────────────
      const enderecoRaw = await page
        .locator(
          [
            '[data-item-id="address"]',
            '[data-item-id="address"] [aria-label]',
            'button[aria-label^="Endereço"]',
            'button[aria-label^="Address"]',
          ].join(", ")
        )
        .first()
        .getAttribute("aria-label", { timeout: 2500 })
        .catch(() => null);
      const enderecoPainel = (enderecoRaw ?? "")
        .replace(/^(Endereço|Address):\s*/i, "")
        .trim();

      // ── Opening hours ─────────────────────────────────────────────────────
      const hoursRaw = await page
        .locator(
          [
            '[aria-label*="Horário de funcionamento"]',
            '[aria-label*="horário"]',
            'table[aria-label*="hora"]',
            '[data-item-id*="oh"] table',
          ].join(", ")
        )
        .first()
        .innerText({ timeout: 2000 })
        .catch(() => "");
      const openingHours = parseOpeningHours(hoursRaw);

      // ── Open/Closed status ────────────────────────────────────────────────
      const openStatus = await page
        .locator(
          [
            '[aria-label*="Aberto agora"]',
            '[aria-label*="Fechado agora"]',
            '[class*="open-status"]',
            'span:has-text("Aberto")',
            'span:has-text("Fechado")',
          ].join(", ")
        )
        .first()
        .innerText({ timeout: 2000 })
        .catch(() => null);
      const isOpenNow = openStatus
        ? /aberto/i.test(openStatus)
        : undefined;

      // ── Photos ────────────────────────────────────────────────────────────
      await page.waitForTimeout(600);
      const photos = await page.evaluate((): string[] => {
        const imgs = Array.from(
          document.querySelectorAll<HTMLImageElement>(
            'img[src*="googleusercontent.com"], img[src*="googleapis.com"]'
          )
        );
        return imgs
          .map((img) => img.src || img.getAttribute("src") || "")
          .filter((src) => {
            if (!src || src.length < 40) return false;
            if (
              src.includes("=s40") ||
              src.includes("=s32") ||
              src.includes("=s20")
            )
              return false;
            if (
              src.includes("photo_placeholder") ||
              src.includes("avatar")
            )
              return false;
            return true;
          })
          .map((src) =>
            src
              .replace(/=w\d+-h\d+.*$/, "=w800-h600-k-no")
              .replace(/=s\d+.*$/, "=w800-h600-k-no")
          )
          .slice(0, 6);
      });

      // Sem voltar para a lista: a próxima iteração navega direto para a
      // URL do próximo lugar, capturada na fase de coleta.
      return {
        phone,
        phoneE164,
        website,
        address: enderecoPainel,
        ratingBlock: avaliacoesTexto,
        photos,
        openingHours,
        isOpenNow,
        neighborhood: extractNeighborhood(enderecoPainel || address),
      };
    } catch (err) {
      console.log(
        `[crawler] ⚠️ Panel attempt ${attempt + 1} failed for "${name}": ${err}`
      );
      if (attempt === 0) {
        await page.waitForTimeout(1500);
      } else {
        return empty;
      }
    }
  }
  return empty;
}

// ─── Phase 1: Collect card list ───────────────────────────────────────────────
interface RawCard {
  name: string;
  /** Rótulo cru de acessibilidade — nota e contagem vêm misturadas nele */
  ratingLabel: string;
  reviewLabel: string;
  /** Todos os textos do card; a triagem acontece fora do browser */
  spans: string[];
  /** URL do lugar, capturada enquanto o card estava no DOM */
  placeUrl: string;
}

async function collectCards(page: Page): Promise<RawCard[]> {
  await page.waitForSelector('[role="feed"]', { timeout: CRAWLER_TIMEOUT });
  await page.waitForTimeout(1500);

  // Scroll to load more results
  const feed = page.locator('[role="feed"]').first();
  for (let i = 0; i < 4; i++) {
    await feed.evaluate((el) => el.scrollBy(0, 500)).catch(() => {});
    await page.waitForTimeout(500);
  }

  const cards = await page.evaluate((max: number) => {
    const results: {
      name: string;
      ratingLabel: string;
      reviewLabel: string;
      spans: string[];
      placeUrl: string;
    }[] = [];
    const seen = new Set<string>();

    const nameEls = document.querySelectorAll('[class*="fontHeadlineSmall"]');

    for (const nameEl of Array.from(nameEls).slice(0, max * 2)) {
      const name = (nameEl as HTMLElement).innerText?.trim() ?? "";
      if (!name || seen.has(name) || name.length < 2) continue;
      seen.add(name);

      const container =
        nameEl.closest("[jsaction]") ??
        nameEl.parentElement?.parentElement;

      // O rótulo do Maps traz nota e contagem juntas ("4,5 estrelas 250
      // avaliações"). Levamos o rótulo inteiro e separamos fora do browser,
      // onde dá para testar — era aqui que reviewsCount zerava.
      const ratingEl = container?.querySelector(
        'span[aria-label*="estrela"], span[aria-label*="star"], span[role="img"][aria-label]'
      );
      const ratingLabel = ratingEl?.getAttribute("aria-label") ?? "";

      const reviewEl = container?.querySelector(
        'span[aria-label*="avalia"], span[aria-label*="review"]'
      );
      const reviewLabel = reviewEl?.getAttribute("aria-label") ?? "";

      // O card também mostra a contagem como texto solto "(250)"
      const reviewTexto =
        Array.from(container?.querySelectorAll("span") ?? [])
          .map((s) => (s as HTMLElement).innerText?.trim() ?? "")
          .find((t) => /^\(\s*[\d.]+\s*\)$/.test(t)) ?? "";

      // Textos soltos do card — a separação entre categoria e endereço
      // acontece fora daqui, com as guardas de campo
      const spans = Array.from(container?.querySelectorAll("span") ?? [])
        .map((s) => (s as HTMLElement).innerText?.trim() ?? "")
        .filter(Boolean);

      // O link do lugar é capturado agora, enquanto o card está no DOM.
      // Depois navegamos direto para ele: sem clique, sem voltar, sem
      // depender de o card continuar carregado na lista.
      const placeLink =
        container?.querySelector<HTMLAnchorElement>('a[href*="/maps/place/"]')?.href ??
        "";

      results.push({
        name,
        ratingLabel,
        reviewLabel: [reviewLabel, reviewTexto].filter(Boolean).join(" "),
        spans,
        placeUrl: placeLink,
      });
      if (results.length >= max) break;
    }

    return results;
  }, MAX_RESULTS);

  return cards;
}

// ─── Main exported function ───────────────────────────────────────────────────
export async function crawlGoogleMaps(
  niche: string,
  city: string
): Promise<Lead[]> {
  const cityName = normalizeCityName(city);
  const log = (msg: string) => console.log(`[crawler] ${msg}`);

  const browser = await getBrowser();
  const context = await browser.newContext({
    locale: "pt-BR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
  });

  const page = await context.newPage();

  try {
    log(`Navigating: ${niche} em ${city}`);
    try {
      await page.goto(
        `https://www.google.com/maps/search/${encodeURIComponent(
          `${niche} em ${city}`
        )}?hl=pt-BR`,
        { waitUntil: "domcontentloaded", timeout: CRAWLER_TIMEOUT }
      );
    } catch (e) {
      log(`page.goto timeout ignored (DOM partially loaded): ${e}`);
    }

    await acceptConsent(page);

    // Phase 1: collect cards (~5s)
    log("Collecting business list...");
    const cards = await collectCards(page);
    log(`${cards.length} businesses found`);

    if (cards.length === 0) {
      log("⚠️ No results — Google may have shown CAPTCHA");
      return [];
    }

    const leads: Lead[] = [];

    // Phase 2: click each card for details
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      log(`[${i + 1}/${cards.length}] ${card.name}`);

      // Categoria e endereço saem dos textos do card pelas guardas de campo
      const { category, address } = splitCardTexts(card.spans, {
        name: card.name,
        fallbackCategory: niche,
      });

      const detail = await extractDetailFromPanel(page, card.name, address, card.placeUrl);

      // Analyze URL with timeout
      let analyzedStatus: Lead["analyzedStatus"] = "NO_SITE";
      if (detail.website) {
        try {
          const result = await Promise.race([
            analyzeUrl(detail.website),
            new Promise<{ status: Lead["analyzedStatus"] }>((r) =>
              setTimeout(() => r({ status: "SITE_OFFLINE" }), 8000)
            ),
          ]);
          analyzedStatus = result.status;
          log(`   → ${analyzedStatus} (${detail.website})`);
        } catch {
          analyzedStatus = "SITE_OFFLINE";
        }
      }

      // O painel traz o endereço completo; o card traz a versão curta
      const enderecoFinal =
        sanitizeAddress(detail.address, category) || address || cityName;

      // Quando o "site" do Maps é na verdade um link "chamar no WhatsApp"
      // (é o que gera REDIRECTS_TO_WHATSAPP), o número já está ali dentro
      // do link — e é o número que o próprio dono configurou para receber
      // mensagem, o que costuma valer mais que o telefone genérico do card.
      const whatsapp = collectWhatsAppCandidates({
        mapsWebsiteLink: detail.website,
        mapsPhone: detail.phone,
      })[0];

      leads.push({
        id: makeLeadId(card.name, cityName),
        title: card.name,
        phone: detail.phone,
        phoneE164: detail.phoneE164,
        whatsappNumber: whatsapp?.number,
        whatsappE164: whatsapp?.e164,
        whatsappSource: whatsapp?.source,
        address: enderecoFinal,
        neighborhood: detail.neighborhood,
        city: cityName,
        rating:
          parseRatingFromLabel(card.ratingLabel) ||
          parseRatingFromLabel(detail.ratingBlock),
        // O painel é a fonte mais confiável: o card nem sempre publica a
        // contagem, e quando publica é só como texto solto.
        reviewsCount:
          parseReviewCountFromLabel(detail.ratingBlock) ||
          parseReviewCountFromLabel(`${card.reviewLabel} ${card.ratingLabel}`),
        category: sanitizeCategory(category, niche),
        // Contexto de descoberta: a categoria crua do Maps e o termo que o
        // usuário pesquisou entram separados. A classificação usa os dois
        // como evidências independentes em vez de adivinhar por uma string.
        googleCategory: sanitizeCategory(category, "") || undefined,
        searchedNiche: niche,
        normalizedCategory: normalizar(sanitizeCategory(category, niche)),
        originalWebsite: detail.website || undefined,
        analyzedStatus,
        analyzedAt: new Date().toISOString(),
        photos: detail.photos.length > 0 ? detail.photos : undefined,
        openingHours:
          Object.keys(detail.openingHours).length > 0
            ? detail.openingHours
            : undefined,
        isOpenNow: detail.isOpenNow,
      });
    }

    log(`✅ ${leads.length} leads extracted`);
    // Relatório de qualidade a cada rastreamento — regressão como a do
    // reviewsCount zerado aparece aqui, não na reclamação do cliente.
    log(formatarResumo(resumirQualidade(leads)));
    return leads;
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}
