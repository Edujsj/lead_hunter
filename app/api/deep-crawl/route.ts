import { NextRequest, NextResponse } from "next/server";
import { Lead } from "@/lib/types";

let runDeepCrawl: (
  (lead: Lead) => Promise<import("@/lib/crawler/deepCrawler").DeepCrawlResult>
) | null = null;

async function loadDeepCrawler() {
  if (runDeepCrawl) return runDeepCrawl;
  try {
    const mod = await import("@/lib/crawler/deepCrawler");
    runDeepCrawl = mod.runDeepCrawl;
    return runDeepCrawl;
  } catch (err) {
    console.error("[API /deep-crawl] Failed to load deepCrawler:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lead } = body as { lead: Lead };

    if (!lead || !lead.title) {
      return NextResponse.json({ error: "Invalid lead" }, { status: 400 });
    }

    const crawler = await loadDeepCrawler();
    if (!crawler) {
      return NextResponse.json(
        { error: "Deep Crawler unavailable (Playwright missing)" },
        { status: 500 }
      );
    }

    const result = await crawler(lead);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[API /deep-crawl]", err);
    return NextResponse.json({ error: "Internal deep crawl error" }, { status: 500 });
  }
}
