import { NextRequest, NextResponse } from "next/server";
import { scanMaps } from "@/lib/mapsScanner";

// Importação dinâmica do crawler (evita erro em builds sem Playwright)
let crawlGoogleMaps: ((niche: string, city: string) => Promise<import("@/lib/types").Lead[]>) | null = null;

async function loadCrawler() {
  if (crawlGoogleMaps) return crawlGoogleMaps;
  try {
    const mod = await import("@/lib/crawler/googleMapsCrawler");
    crawlGoogleMaps = mod.crawlGoogleMaps;
    return crawlGoogleMaps;
  } catch (err) {
    console.error("[API /scan] Playwright não disponível, usando mock:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { niche, city } = body as { niche: string; city: string };

    if (!niche || !city) {
      return NextResponse.json(
        { error: "niche e city são obrigatórios" },
        { status: 400 }
      );
    }

    const useRealCrawler = process.env.USE_REAL_CRAWLER === "true";

    let leads;
    let mode: "real" | "mock" = "mock";

    if (useRealCrawler) {
      const crawler = await loadCrawler();
      if (crawler) {
        try {
          console.log(`[API /scan] 🕷️ Crawler REAL: "${niche}" em "${city}"`);
          leads = await crawler(niche, city);
          mode = "real";
          console.log(`[API /scan] ✅ ${leads.length} leads reais extraídos`);
        } catch (crawlErr) {
          console.error("[API /scan] Crawler falhou, fallback para mock:", crawlErr);
          leads = await scanMaps(niche, city);
          mode = "mock";
        }
      } else {
        leads = await scanMaps(niche, city);
      }
    } else {
      console.log(`[API /scan] 🎭 Modo MOCK: "${niche}" em "${city}"`);
      leads = await scanMaps(niche, city);
    }

    return NextResponse.json({
      leads,
      total: leads.length,
      mode,
      scannedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[API /scan]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
