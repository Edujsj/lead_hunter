"use client";

import { Lead, DeepResearchPayload } from "@/lib/types";
import {
  X,
  BrainCircuit,
  Check,
  Copy,
  Loader2,
  Globe,
  Image as ImageIcon,
  TextSelect,
  Palette,
  Star,
  Layers,
  Code2,
  MessageSquareQuote,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";

// Backward-compat legacy shape still returned by route
interface DeepCrawlResult extends DeepResearchPayload {
  texts: string[];
  images: string[];
}

interface DeepCrawlModalProps {
  lead: Lead | null;
  onClose: () => void;
  onSuccess?: (result: DeepCrawlResult) => void;
}

const PIPELINE_STEPS = [
  {
    id: "brand",
    icon: Palette,
    label: "Brand & Identity",
    description: "Extracting logo, colors, typography",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
  },
  {
    id: "social",
    icon: Globe,
    label: "Social Proof",
    description: "Searching reviews & mentions",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    id: "images",
    icon: ImageIcon,
    label: "Visual Assets",
    description: "Collecting HD photos & gallery",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
  },
  {
    id: "copy",
    icon: Sparkles,
    label: "AI Copywriting",
    description: "Generating headlines, FAQs, value prop",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
];

type TabId = "brand" | "gallery" | "reviews" | "copy" | "json" | "prompt";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "brand", label: "Brand", icon: Palette },
  { id: "gallery", label: "Gallery", icon: ImageIcon },
  { id: "reviews", label: "Reviews", icon: MessageSquareQuote },
  { id: "copy", label: "Copy Seeds", icon: TextSelect },
  { id: "json", label: "JSON", icon: Code2 },
  { id: "prompt", label: "AI Prompt", icon: BrainCircuit },
];

export function DeepCrawlModal({ lead, onClose, onSuccess }: DeepCrawlModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeepCrawlResult | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("brand");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!lead) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveStep(0);

    // Cycle through pipeline steps while waiting
    const stepInterval = setInterval(() => {
      setActiveStep((s) => (s < PIPELINE_STEPS.length - 1 ? s + 1 : s));
    }, 7000);

    fetch("/api/deep-crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead }),
    })
      .then((res) => res.json())
      .then((data: DeepCrawlResult & { error?: string }) => {
        clearInterval(stepInterval);
        if (data.error) throw new Error(data.error);
        setActiveStep(PIPELINE_STEPS.length - 1);
        setTimeout(() => {
          setResult(data);
          setLoading(false);
          if (onSuccess) onSuccess(data);
        }, 600);
      })
      .catch((err) => {
        clearInterval(stepInterval);
        setError(err.message || "Deep crawl error");
        setLoading(false);
      });

    return () => clearInterval(stepInterval);
  }, [lead]);

  if (!lead) return null;

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const confidenceColor = {
    high: "text-emerald-400",
    medium: "text-amber-400",
    low: "text-slate-400",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Deep Research Agent
              </h2>
              <p className="text-xs text-slate-400">{lead.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {result && (
              <span
                className={`text-xs font-medium ${confidenceColor[result.metadata?.confidence ?? "low"]}`}
              >
                {result.metadata?.confidence?.toUpperCase()} confidence
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── LOADING — Pipeline Steps ── */}
          {loading && (
            <div className="space-y-6">
              <div className="flex flex-col items-center py-6">
                <div className="relative w-16 h-16 mb-4">
                  <Loader2 className="w-full h-full text-indigo-500 animate-spin opacity-30" />
                  <BrainCircuit className="w-7 h-7 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <p className="text-slate-300 font-semibold">
                  Running 4-step research pipeline…
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  This may take 20–40 seconds
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PIPELINE_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const isDone = i < activeStep;
                  const isActive = i === activeStep;
                  return (
                    <div
                      key={step.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-500 ${
                        isDone
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : isActive
                          ? `${step.bgColor} ${step.borderColor}`
                          : "bg-slate-800/30 border-slate-800"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isDone
                            ? "bg-emerald-500/20"
                            : isActive
                            ? step.bgColor
                            : "bg-slate-800"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isActive ? (
                          <Icon
                            className={`w-4 h-4 ${step.color} animate-pulse`}
                          />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            isDone
                              ? "text-emerald-300"
                              : isActive
                              ? "text-white"
                              : "text-slate-500"
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {!loading && error && (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                <X className="w-6 h-6" />
              </div>
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          )}

          {/* ── RESULT — Tabbed View ── */}
          {!loading && result && (
            <div className="space-y-5">

              {/* Summary stats bar */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: "Logos", value: result.brand_identity?.logoUrls?.length ?? 0, icon: Palette, color: "text-violet-400" },
                  { label: "Images", value: result.images?.length ?? 0, icon: ImageIcon, color: "text-pink-400" },
                  { label: "Reviews", value: result.testimonials?.length ?? 0, icon: Star, color: "text-amber-400" },
                  { label: "Services", value: result.copywriting_seed?.services?.length ?? 0, icon: Layers, color: "text-blue-400" },
                  { label: "Sources", value: result.metadata?.sourcesVisited?.length ?? 0, icon: Globe, color: "text-emerald-400" },
                  { label: "Texts", value: result.texts?.length ?? 0, icon: TextSelect, color: "text-slate-400" },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50">
                    <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                    <p className="text-lg font-black text-white">{s.value}</p>
                    <p className="text-[10px] text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab: Brand */}
              {activeTab === "brand" && (
                <div className="space-y-4">
                  {/* Melhor logo + design resolvido */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
                      <ImageIcon className="w-4 h-4 text-violet-400" />
                      Logo escolhido
                    </h4>
                    {result.brand_identity?.bestLogoUrl ? (
                      <div className="flex items-center gap-4 flex-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={result.brand_identity.bestLogoUrl}
                          alt="Logo da marca"
                          className="h-16 w-auto max-w-[160px] object-contain bg-white rounded-lg p-2 border border-slate-700"
                        />
                        <div className="text-xs space-y-1">
                          <p className="text-slate-400">
                            Fonte:{" "}
                            <span className="text-emerald-400 font-medium">
                              {result.brand_identity.bestLogoSource}
                            </span>
                          </p>
                          <p className="text-slate-400">
                            {result.brand_identity.logoCandidates?.length ?? 0} candidatos validados
                          </p>
                          {result.brand_identity.logoDominantColor && (
                            <p className="text-slate-400 flex items-center gap-2">
                              Cor dominante
                              <span
                                className="w-4 h-4 rounded border border-white/20 inline-block"
                                style={{ background: result.brand_identity.logoDominantColor }}
                              />
                              <span className="font-mono text-white">
                                {result.brand_identity.logoDominantColor}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Nenhum logo utilizável encontrado — o preview usa um lockup
                        tipográfico com a inicial da empresa.
                      </p>
                    )}
                  </div>

                  {/* Design kit aplicado no preview */}
                  {result.design_brief && (
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                        <Palette className="w-4 h-4 text-violet-400" />
                        Design aplicado no preview
                      </h4>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                        <span className="text-slate-200">{result.design_brief.archetypeLabel}</span>
                        <span>layout {result.design_brief.layout}</span>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded border border-white/20"
                            style={{ background: result.design_brief.primary }}
                          />
                          <span
                            className="w-4 h-4 rounded border border-white/20"
                            style={{ background: result.design_brief.accent }}
                          />
                        </span>
                        <span>
                          {result.design_brief.headingFont} / {result.design_brief.bodyFont}
                        </span>
                        <span
                          className={
                            result.design_brief.colorSource === "niche"
                              ? "text-slate-500"
                              : "text-emerald-400"
                          }
                        >
                          cor via {result.design_brief.colorSource}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Colors */}
                  {(result.brand_identity?.primaryColor || result.brand_identity?.secondaryColor) ? (
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                        <Palette className="w-4 h-4 text-violet-400" />
                        Brand Colors
                      </h4>
                      <div className="flex gap-3 flex-wrap">
                        {result.brand_identity.primaryColor && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-lg border border-white/10 shadow-lg"
                              style={{ backgroundColor: result.brand_identity.primaryColor }}
                            />
                            <div>
                              <p className="text-xs text-slate-400">Primary</p>
                              <p className="text-sm font-mono text-white">
                                {result.brand_identity.primaryColor}
                              </p>
                            </div>
                          </div>
                        )}
                        {result.brand_identity.secondaryColor && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-lg border border-white/10 shadow-lg"
                              style={{ backgroundColor: result.brand_identity.secondaryColor }}
                            />
                            <div>
                              <p className="text-xs text-slate-400">Secondary</p>
                              <p className="text-sm font-mono text-white">
                                {result.brand_identity.secondaryColor}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                      <p className="text-xs text-slate-500">No brand colors detected from the website.</p>
                    </div>
                  )}

                  {/* Typography */}
                  {result.brand_identity?.typography && (
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1">Typography detected</p>
                      <p
                        className="text-2xl font-bold text-white"
                        style={{ fontFamily: result.brand_identity.typography }}
                      >
                        {result.brand_identity.typography}
                      </p>
                    </div>
                  )}

                  {/* Brand Vibe */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-1">Brand Vibe</p>
                    <p className="text-slate-200 font-medium capitalize">
                      {result.brand_identity?.brandVibe ?? "—"}
                    </p>
                  </div>

                  {/* Logos */}
                  {result.brand_identity?.logoUrls?.length > 0 && (
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-3">Logo URLs found</p>
                      <div className="flex flex-wrap gap-3">
                        {result.brand_identity.logoUrls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Logo {i + 1}
                          </a>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {result.brand_identity.logoUrls.slice(0, 3).map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={url}
                            alt={`Logo ${i + 1}`}
                            className="h-12 w-auto object-contain bg-white/10 rounded-lg p-1 border border-slate-700"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Gallery */}
              {activeTab === "gallery" && (
                <div className="space-y-4">
                  {(["venue", "products", "team", "misc"] as const).map((cat) => {
                    const imgs = result.gallery?.[cat] ?? [];
                    if (imgs.length === 0) return null;
                    return (
                      <div key={cat} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">
                          {cat === "venue" ? "🏢 Venue / Space" : cat === "products" ? "📦 Products" : cat === "team" ? "👥 Team" : "📷 Other"}
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {imgs.map((src, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={src}
                              alt={`${cat} ${i + 1}`}
                              className="h-24 w-36 object-cover rounded-lg border border-slate-700 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(src, "_blank")}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* All images fallback */}
                  {result.images?.length > 0 && !result.gallery && (
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-3">All extracted images</p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {result.images.map((src, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={src}
                            alt={`img ${i + 1}`}
                            className="h-24 w-36 object-cover rounded-lg border border-slate-700 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {(!result.gallery ||
                    Object.values(result.gallery).every((v) => v.length === 0)) &&
                    (!result.images || result.images.length === 0) && (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        No images extracted. The business may not have a website or social media with accessible photos.
                      </div>
                    )}
                </div>
              )}

              {/* Tab: Reviews */}
              {activeTab === "reviews" && (
                <div className="space-y-3">
                  {/* Google rating */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-4xl font-black text-amber-400">
                        {result.social_proof?.googleRating ?? lead.rating}
                      </p>
                      <div className="flex gap-0.5 justify-center mt-1">
                        {Array(5).fill(0).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < Math.round(lead.rating) ? "text-amber-400 fill-amber-400" : "text-slate-600"}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {result.social_proof?.reviewCount ?? lead.reviewsCount} reviews
                      </p>
                    </div>
                    <div className="border-l border-slate-700 pl-4">
                      <p className="text-sm text-slate-300 font-medium">Google Maps</p>
                      <p className="text-xs text-slate-500 mt-0.5">Verified rating</p>
                    </div>
                  </div>

                  {/* Testimonials */}
                  {result.testimonials?.length > 0 ? (
                    result.testimonials.map((t, i) => (
                      <div
                        key={i}
                        className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-2"
                      >
                        <p className="text-sm text-slate-200 italic">
                          &ldquo;{t.quote}&rdquo;
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-400 font-medium">
                            — {t.author}
                          </p>
                          <span className="text-xs text-slate-600 bg-slate-700/50 px-2 py-0.5 rounded-full">
                            {t.source}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-6 text-slate-500 text-sm">
                      No review snippets found. Try enabling a Groq API key for richer extraction.
                    </p>
                  )}
                </div>
              )}

              {/* Tab: Copy Seeds */}
              {activeTab === "copy" && (
                <div className="space-y-4">
                  {/* Value Prop */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Value Proposition</p>
                    <p className="text-white font-semibold">
                      {result.copywriting_seed?.valueProp}
                    </p>
                  </div>

                  {/* Headlines */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Hero Headlines</p>
                    <div className="space-y-2">
                      {result.copywriting_seed?.heroHeadlineIdeas?.map((h, i) => (
                        <div key={i} className="flex items-start justify-between gap-2">
                          <p className="text-slate-200 text-sm font-medium">
                            {i + 1}. {h}
                          </p>
                          <button
                            onClick={() => copyText(h, `headline-${i}`)}
                            className="shrink-0 p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            {copied === `headline-${i}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pain Points */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Pain Points Solved</p>
                    <ul className="space-y-2">
                      {result.copywriting_seed?.painPointsSolved?.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* FAQ */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">FAQ Items</p>
                    <div className="space-y-3">
                      {result.copywriting_seed?.faqItems?.map((faq, i) => (
                        <div key={i} className="border-l-2 border-indigo-500/50 pl-3">
                          <p className="text-sm font-semibold text-white">Q: {faq.q}</p>
                          <p className="text-sm text-slate-400 mt-0.5">A: {faq.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Services */}
                  {result.copywriting_seed?.services?.length > 0 && (
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Services Identified</p>
                      <div className="flex flex-wrap gap-2">
                        {result.copywriting_seed.services.map((s, i) => (
                          <span
                            key={i}
                            className="text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-full"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: JSON */}
              {activeTab === "json" && (
                <div>
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() =>
                        copyText(
                          JSON.stringify(
                            {
                              brand_identity: result.brand_identity,
                              gallery: result.gallery,
                              testimonials: result.testimonials,
                              copywriting_seed: result.copywriting_seed,
                              social_proof: result.social_proof,
                              operational: result.operational,
                              metadata: result.metadata,
                            },
                            null,
                            2
                          ),
                          "json"
                        )
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        copied === "json"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600"
                      }`}
                    >
                      {copied === "json" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copied === "json" ? "Copied!" : "Copy JSON"}
                    </button>
                  </div>
                  <pre className="bg-[#0d1117] border border-slate-800 p-4 rounded-xl text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed h-[350px] overflow-y-auto">
                    {JSON.stringify(
                      {
                        brand_identity: result.brand_identity,
                        gallery: result.gallery,
                        testimonials: result.testimonials,
                        copywriting_seed: result.copywriting_seed,
                        social_proof: result.social_proof,
                        operational: result.operational,
                        metadata: result.metadata,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}

              {/* Tab: AI Prompt */}
              {activeTab === "prompt" && (
                <div>
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => result?.prompt && copyText(result.prompt, "prompt")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        copied === "prompt"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500"
                      }`}
                    >
                      {copied === "prompt" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copied === "prompt" ? "Copied!" : "Copy Prompt"}
                    </button>
                  </div>
                  <pre className="bg-[#0d1117] border border-slate-800 p-4 rounded-xl text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed h-[360px] overflow-y-auto">
                    {result?.prompt || "No prompt generated."}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
