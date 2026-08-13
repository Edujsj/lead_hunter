"use client";

// ============================================================
// Modal de preview — moldura de browser + a landing page real.
// O conteúdo é o mesmo componente da página pública /preview/[id]
// (components/preview/LandingPage), só que sem animação: o que o
// vendedor mostra na tela é exatamente o que o lead vai abrir.
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X, Globe, Rocket, Copy, Check, Palette, Type, ImageIcon, Download,
  CreditCard, AtSign, Users,
} from "lucide-react";

import { Lead } from "@/lib/types";
import { saveLeadForPreview } from "@/lib/previewStore";
import { buildDesignKit } from "@/lib/design/kit";
import { buildBusinessCard } from "@/lib/export/businessCard";
import { buildStaticSite } from "@/lib/export/staticSite";
import { createZip } from "@/lib/export/zip";
import { LandingPage } from "@/components/preview/LandingPage";
import { LinkCard } from "@/components/preview/LinkCard";

interface LandingPagePreviewProps {
  lead: Lead | null;
  onClose: () => void;
}

const COLOR_SOURCE_LABEL: Record<string, string> = {
  logo: "cor extraída do logo real",
  site: "cor declarada no site",
  niche: "paleta de referência do segmento",
};

export function LandingPagePreview({ lead, onClose }: LandingPagePreviewProps) {
  const handleClose = useCallback(() => onClose(), [onClose]);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    if (!lead) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose, lead]);

  const card = useMemo(() => (lead ? buildBusinessCard(lead) : null), [lead]);

  const kit = useMemo(
    () =>
      lead
        ? buildDesignKit({
            title: lead.title,
            category: lead.category,
            brand: {
              logoUrl: lead.logoUrl,
              logoDominantColor: lead.brandColors?.logoDominant,
              primaryColor: lead.brandColors?.primary,
              secondaryColor: lead.brandColors?.secondary,
              typography: lead.brandTypography,
              logoHasAlpha: lead.logoHasAlpha,
              logoLuminance: lead.logoLuminance,
              logoAspect: lead.logoAspect,
              photoDominantColor: lead.brandColors?.photoDominant,
              photoLuminance: lead.photoLuminance,
              photoCount: lead.photos?.length ?? 0,
            },
          })
        : null,
    [lead]
  );

  if (!lead || !kit) return null;

  const slug = lead.title
    .normalize("NFD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const fakeUrl = `www.${slug}.com.br`;

  function openFullPreview() {
    saveLeadForPreview(lead!);
    window.open(`/preview/${lead!.id}`, "_blank");
  }

  function openCard() {
    saveLeadForPreview(lead!);
    window.open(`/cartao/${lead!.id}`, "_blank");
  }

  function copyLink() {
    saveLeadForPreview(lead!);
    navigator.clipboard.writeText(`${window.location.origin}/preview/${lead!.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  /** Empacota index.html + styles.css + script.js e baixa como .zip */
  function downloadSite() {
    const site = buildStaticSite(lead!);
    const zip = createZip(site.files);
    const blob = new Blob([zip as BlobPart], { type: "application/zip" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${site.slug}-site.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm">
      {/* ── Toolbar de browser ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1e2535] border-b border-slate-700/80 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-400">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400/80 truncate max-w-[180px]">{fakeUrl}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-open-full-preview"
            onClick={openFullPreview}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 border border-violet-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <Rocket className="w-3.5 h-3.5" />
            Abrir site animado
          </button>
          <button
            id="btn-toggle-card"
            onClick={() => setShowCard((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              showCard
                ? "bg-violet-500/20 border-violet-500/40 text-violet-200"
                : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            {showCard ? "Ver site" : "Cartão de visita"}
          </button>
          {showCard && (
            <button
              id="btn-open-card"
              onClick={openCard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 border border-violet-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <Rocket className="w-3.5 h-3.5" />
              Abrir cartão
            </button>
          )}
          <button
            id="btn-download-site"
            onClick={downloadSite}
            title="Baixa index.html, styles.css e script.js prontos para publicar"
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              downloaded
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white"
            }`}
          >
            {downloaded ? (
              <>
                <Check className="w-3.5 h-3.5" /> Baixado!
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Baixar HTML/CSS/JS
              </>
            )}
          </button>
          <button
            id="btn-copy-preview-link"
            onClick={copyLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-all cursor-pointer ${
              copied
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Link copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copiar link
              </>
            )}
          </button>
          <button
            id="btn-close-preview"
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-red-500/20 hover:border-red-500/40 border border-slate-600 text-slate-300 hover:text-red-300 rounded-lg text-xs transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Fechar
          </button>
        </div>
      </div>

      {/* ── Faixa do sistema de design aplicado ── */}
      <div className="flex items-center gap-4 flex-wrap px-4 py-2 bg-[#161c29] border-b border-slate-800 text-[11px] text-slate-400 shrink-0">
        <span className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-slate-300">{kit.archetypeLabel}</span>
          <span className="text-slate-500">· layout {kit.layout}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3.5 h-3.5 rounded-sm border border-white/20"
            style={{ background: kit.palette.primary }}
          />
          <span
            className="w-3.5 h-3.5 rounded-sm border border-white/20"
            style={{ background: kit.palette.accent }}
          />
          <span className={kit.colorSource === "niche" ? "" : "text-emerald-400"}>
            {COLOR_SOURCE_LABEL[kit.colorSource]}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-violet-400" />
          {kit.fonts.heading} / {kit.fonts.body}
        </span>
        <span className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-violet-400" />
          {kit.hasRealLogo ? (
            <span className="text-emerald-400">logo real da marca</span>
          ) : (
            <span>
              sem logo — rode a <strong className="text-violet-300">IA</strong> para buscar
            </span>
          )}
        </span>
      </div>

      {/* ── Landing page ou cartão de visita ── */}
      <div className="flex-1 overflow-y-auto">
        {showCard && card ? (
          <div className="min-h-full bg-slate-900 py-8 px-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-white">Cartão de visita online</h3>
              <p className="text-sm text-slate-400 mt-1">
                Link único no estilo link-in-bio · animado · vai no download em{" "}
                <code className="text-slate-300">cartao/</code>
              </p>
              {(lead.instagramHandle || lead.facebookHandle) && (
                <div className="flex items-center justify-center gap-4 text-xs text-slate-400 mt-2">
                  {lead.instagramHandle && (
                    <span className="flex items-center gap-1.5">
                      <AtSign className="w-3.5 h-3.5 text-pink-400" />@{lead.instagramHandle}
                    </span>
                  )}
                  {lead.facebookHandle && (
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" />/{lead.facebookHandle}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Moldura de celular — é onde o lead vai abrir o link */}
            <div className="mx-auto w-full max-w-[400px] rounded-[34px] border-[10px] border-slate-800 overflow-hidden shadow-2xl bg-slate-950">
              <div className="h-[680px] overflow-y-auto">
                <LinkCard lead={lead} animated />
              </div>
            </div>

            <div className="max-w-[400px] mx-auto mt-6">
              <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">
                Versão impressa (também vai no ZIP)
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[card.front, card.back].map((svg, i) => (
                  <div
                    key={i}
                    className="rounded-lg overflow-hidden shadow-lg [&>svg]:w-full [&>svg]:h-auto"
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <LandingPage lead={lead} />
        )}
      </div>
    </div>
  );
}
