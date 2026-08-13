// ============================================================
// CRAWLER REAL — Google Maps via Playwright (Chromium Headless)
// Extracts business data by clicking each card's detail panel.
// ============================================================

import { chromium, Browser, Page } from "playwright";
import { Lead } from "@/lib/types";
import { analyzeUrl } from "@/lib/urlAnalyzer";
import {
  cleanPhone,
  normalizePhone,
  parseReviewCount,
  parseRating,
  makeLeadId,
  normalizeCityName,
  extractNeighborhood,
  parseOpeningHours,
} from "./parseHelpers";

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
 * Clicks a business card, waits for the panel to open (URL change),
 * extracts website via DOM scan, phone, photos, hours, status.
 * Falls back to page.goBack() for navigation — more reliable than
 * clicking locale-specific "Back" buttons.
 */
async function extractDetailFromPanel(
  page: Page,
  name: string,
  address: string
): Promise<DetailResult> {
  const empty: DetailResult = {
    phone: "",
    phoneE164: undefined,
    website: "",
    photos: [],
    openingHours: {},
    isOpenNow: undefined,
    neighborhood: extractNeighborhood(address),
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const urlBefore = page.url();

      const safeNameFull = name.replace(/"/g, '\\"');
      const safeNameShort = name.slice(0, 30).replace(/"/g, '\\"');
      
      const link = page.locator(`a.hfpxzc[aria-label="${safeNameFull}"]`).first();
      if (await link.count() > 0) {
        // O locator é tipado como HTMLElement | SVGElement; só o primeiro
        // tem .click(), e o seletor `a.hfpxzc` sempre casa com uma âncora.
        await link.evaluate((el) => (el as HTMLElement).click());
      } else {
        // Fallback
        await page
          .locator(`[role="feed"] [class*="fontHeadlineSmall"]:has-text("${safeNameShort}")`)
          .first()
          .click({ timeout: 4000, force: true });
      }

      // Wait for the panel URL to change (most reliable confirmation of open)
      try {
        await page.waitForURL((url) => url.toString() !== urlBefore, {
          timeout: 5000,
        });
      } catch {
        // URL may not change on inline panel — wait a bit instead
        await page.waitForTimeout(2000);
      }

      // Extra wait for async panel content to render
      await page.waitForTimeout(2500);

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
      const phone = rawPhone ? cleanPhone(rawPhone) : "";
      const phoneE164 = rawPhone ? normalizePhone(rawPhone) : undefined;

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

      // ── Navigate back to list ─────────────────────────────────────────────
      // Use browser history back — more reliable than clicking locale-specific
      // "Voltar"/"Back" buttons whose aria-label varies by Google Maps version
      try {
        await page.goBack({ timeout: 4000, waitUntil: "domcontentloaded" });
        await page.waitForTimeout(800);
      } catch {
        await page
          .locator('[aria-label="Voltar"], [aria-label="Back"]')
          .first()
          .click({ timeout: 1500 })
          .catch(() => {});
        await page.waitForTimeout(600);
      }

      return {
        phone,
        phoneE164,
        website,
        photos,
        openingHours,
        isOpenNow,
        neighborhood: extractNeighborhood(address),
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
async function collectCards(page: Page): Promise<
  {
    name: string;
    rating: string;
    reviewCount: string;
    category: string;
    address: string;
  }[]
> {
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
      rating: string;
      reviewCount: string;
      category: string;
      address: string;
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

      // Rating
      const ratingEl = container?.querySelector(
        'span[aria-label*="estrela"], span[aria-label*="star"]'
      );
      const ratingText =
        ratingEl?.getAttribute("aria-label")?.match(/[\d,\.]+/)?.[0] ?? "";

      // Reviews
      const reviewEl = container?.querySelector('span[aria-label*="avalia"]');
      const reviewText =
        reviewEl?.getAttribute("aria-label")?.replace(/\D/g, "") ?? "0";

      // Text spans for category and address extraction
      const spans = Array.from(container?.querySelectorAll("span") ?? [])
        .map((s) => (s as HTMLElement).innerText?.trim())
        .filter((t) => t && t.length > 1 && t !== "·")
        .filter((t) => t !== name)
        .filter(
          (t) =>
            !/^[\d,\.]+([\d,\.]+)?$/.test(t) && !t.includes("avaliações")
        );

      // Category: first short span that looks like a business type
      const category = spans.find((s) => s.length < 40) ?? "";
      // Address: a longer span that differs from category
      const address =
        spans.find((s) => s.length > 5 && s !== category) ?? "";

      results.push({
        name,
        rating: ratingText,
        reviewCount: reviewText,
        category,
        address,
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

      const detail = await extractDetailFromPanel(page, card.name, card.address);

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

      leads.push({
        id: makeLeadId(card.name, cityName),
        title: card.name,
        phone: detail.phone || "Ver no Google Maps",
        phoneE164: detail.phoneE164,
        address: card.address || cityName,
        neighborhood: detail.neighborhood,
        city: cityName,
        rating: parseRating(card.rating),
        reviewsCount: parseReviewCount(card.reviewCount),
        category: card.category || niche,
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
    return leads;
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}
