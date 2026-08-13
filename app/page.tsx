"use client";

import { useState, useMemo } from "react";
import { Lead, FilterType } from "@/lib/types";
import { SearchBar } from "@/components/SearchBar";
import { FilterTabs } from "@/components/FilterTabs";
import { LeadsTable } from "@/components/LeadsTable";
import { ColdMessageModal } from "@/components/ColdMessageModal";
import { LandingPagePreview } from "@/components/LandingPagePreview";
import { DeepCrawlModal } from "@/components/DeepCrawlModal";
import { statusPriority } from "@/components/LeadBadge";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Flame,
  RefreshCw,
  Globe,
  TestTube,
} from "lucide-react";

export default function HomePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [crawlerMode, setCrawlerMode] = useState<"real" | "mock" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [lastQuery, setLastQuery] = useState<{ niche: string; city: string } | null>(null);

  // Modals
  const [messageTarget, setMessageTarget] = useState<Lead | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Lead | null>(null);
  const [deepCrawlTarget, setDeepCrawlTarget] = useState<Lead | null>(null);

  const handleSearch = async (niche: string, city: string) => {
    setLoading(true);
    setError(null);
    setLastQuery({ niche, city });
    setFilter("ALL");
    setCrawlerMode(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, city }),
      });

      if (!res.ok) throw new Error("Falha ao buscar leads");

      const data: { leads: Lead[]; total: number; mode?: "real" | "mock"; scannedAt: string } = await res.json();
      setCrawlerMode(data.mode ?? "mock");
      const sorted = [...data.leads].sort(
        (a, b) => statusPriority(a.analyzedStatus) - statusPriority(b.analyzedStatus)
      );
      setLeads(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    if (filter === "ALL") return leads;
    return leads.filter((l) => l.analyzedStatus === filter);
  }, [leads, filter]);

  // Stats
  const stats = useMemo(() => {
    const hot = leads.filter((l) =>
      ["NO_SITE", "REDIRECTS_TO_WHATSAPP"].includes(l.analyzedStatus)
    ).length;
    const medium = leads.filter((l) =>
      ["REDIRECTS_TO_SOCIAL", "SITE_OFFLINE"].includes(l.analyzedStatus)
    ).length;
    const valid = leads.filter((l) => l.analyzedStatus === "VALID_SITE").length;
    return { total: leads.length, hot, medium, valid };
  }, [leads]);

  return (
    <div className="min-h-screen bg-[#0a0d14]">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium">
            <Target className="w-4 h-4" />
            Motor de Prospecção B2B
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Maps Lead{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
              Hunter
            </span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            Rastreie empresas locais, descubra quem não tem site e feche contratos com scripts prontos.
          </p>
        </header>

        {/* Search */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {/* Crawler mode badge */}
        {crawlerMode && !loading && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border ${
            crawlerMode === "real"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
          }`}>
            {crawlerMode === "real" ? (
              <><Globe className="w-4 h-4" /> Dados <strong>reais</strong> extraídos do Google Maps</>
            ) : (
              <><TestTube className="w-4 h-4" /> Modo <strong>demo</strong> — dados simulados (ative USE_REAL_CRAWLER=true para dados reais)</>
            )}
          </div>
        )}

        {/* Loading notice para crawler (demora mais) */}
        {loading && (
          <div className="flex items-center gap-3 px-4 py-3 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-xl text-sm">
            <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            <span>
              🕷️ Crawler buscando dados reais no Google Maps… Isso pode levar <strong>20–40 segundos</strong>.
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}


        {/* Stats */}
        {leads.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Total Encontrados",
                value: stats.total,
                icon: Target,
                color: "text-slate-300",
                bg: "bg-slate-800/60 border-slate-700",
              },
              {
                label: "🔥 Oportunidades HOT",
                value: stats.hot,
                icon: Flame,
                color: "text-red-400",
                bg: "bg-red-500/10 border-red-500/20",
              },
              {
                label: "⚠️ Oportunidades Médias",
                value: stats.medium,
                icon: TrendingUp,
                color: "text-yellow-400",
                bg: "bg-yellow-500/10 border-yellow-500/20",
              },
              {
                label: "✅ Com Site Válido",
                value: stats.valid,
                icon: CheckCircle,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10 border-emerald-500/20",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className={`${stat.bg} border rounded-xl p-4 flex flex-col gap-1`}
              >
                <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
                <span className={`text-3xl font-black ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {leads.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-sm overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white">Leads Encontrados</h2>
                {lastQuery && (
                  <span className="text-xs text-slate-500">
                    — {lastQuery.niche} em {lastQuery.city}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  id="btn-refresh"
                  onClick={() => lastQuery && handleSearch(lastQuery.niche, lastQuery.city)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-lg text-xs transition-all disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refazer busca
                </button>
                <span className="text-xs text-slate-500">
                  {filteredLeads.length} de {leads.length} leads
                </span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-6 py-3 border-b border-slate-800/50">
              <FilterTabs active={filter} onChange={setFilter} leads={leads} />
            </div>

            {/* Table */}
            <div className="px-6 py-4">
              <LeadsTable
                leads={filteredLeads}
                onMessage={setMessageTarget}
                onPreview={setPreviewTarget}
                onDeepCrawl={setDeepCrawlTarget}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && leads.length === 0 && !error && (
          <div className="text-center py-24 space-y-4">
            <div className="text-6xl">🎯</div>
            <h2 className="text-xl font-bold text-slate-300">Pronto para caçar leads?</h2>
            <p className="text-slate-500 max-w-sm mx-auto">
              Digite um nicho e uma cidade acima para rastrear empresas locais com falhas de presença digital.
            </p>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-violet-400">
              <div className="w-4 h-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
              <span className="text-sm font-medium animate-pulse">
                Rastreando empresas no Google Maps...
              </span>
            </div>
            {Array(5).fill(0).map((_, i) => (
              <div
                key={i}
                className="h-14 bg-slate-800/50 rounded-xl animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ColdMessageModal lead={messageTarget} onClose={() => setMessageTarget(null)} />
      <LandingPagePreview lead={previewTarget} onClose={() => setPreviewTarget(null)} />
      <DeepCrawlModal 
        lead={deepCrawlTarget} 
        onClose={() => setDeepCrawlTarget(null)} 
        onSuccess={(result) => {
          const brand = result.brand_identity;
          if (!brand || !deepCrawlTarget) return;

          // O SVG traçado ganha do bitmap: escala sem borrar no header.
          const logoUrl =
            brand.logoVectorUrl ?? brand.bestLogoUrl ?? brand.logoUrls?.[0];

          // Fotos do Instagram e do site entram na frente das do Maps:
          // são as que a empresa escolheu para se mostrar.
          const gallery = result.gallery ?? { venue: [], products: [], team: [], misc: [] };
          const crawledPhotos = Array.from(
            new Set([
              ...gallery.venue,
              ...gallery.products,
              ...gallery.team,
              ...gallery.misc,
            ])
          ).slice(0, 8);

          const hasBrandData =
            logoUrl ||
            brand.logoDominantColor ||
            brand.primaryColor ||
            brand.photoDominantColor ||
            crawledPhotos.length > 0;
          if (!hasBrandData) return;

          // A identidade descoberta pela IA passa a alimentar o preview:
          // logo no header e cor da marca como primária do design kit.
          setLeads((prev) =>
            prev.map((l) =>
              l.id === deepCrawlTarget.id
                ? {
                    ...l,
                    logoUrl: logoUrl ?? l.logoUrl,
                    logoSource: brand.bestLogoSource ?? l.logoSource,
                    logoVectorUrl: brand.logoVectorUrl,
                    logoHasAlpha: brand.logoHasAlpha,
                    logoLuminance: brand.logoLuminance,
                    logoAspect: brand.logoAspect,
                    brandTypography: brand.typography ?? l.brandTypography,
                    instagramHandle: brand.instagramHandle ?? l.instagramHandle,
                    facebookHandle: brand.facebookHandle ?? l.facebookHandle,
                    photoLuminance: brand.photoLuminance ?? l.photoLuminance,
                    photos: crawledPhotos.length > 0 ? crawledPhotos : l.photos,
                    brandColors: {
                      logoDominant: brand.logoDominantColor,
                      primary: brand.primaryColor,
                      secondary: brand.secondaryColor,
                      photoDominant: brand.photoDominantColor,
                    },
                  }
                : l
            )
          );
        }}
      />
    </div>
  );
}
