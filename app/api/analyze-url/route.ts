import { NextRequest, NextResponse } from "next/server";
import { analyzeUrl } from "@/lib/urlAnalyzer";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const result = await analyzeUrl(url);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[API /analyze-url]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
