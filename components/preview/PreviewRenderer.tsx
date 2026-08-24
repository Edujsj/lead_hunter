"use client";

// ============================================================
// Preview Renderer — lê o Blueprint e monta a página
// ------------------------------------------------------------
// A ordem das seções, o hero e os CTAs vêm do plano; aqui só há
// componentes. Nada nesta camada inventa conteúdo: seção sem
// evidência simplesmente não é emitida pelo blueprint.
// Modal e página pública usam este mesmo componente.
// ============================================================

import { useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight, BadgeCheck, Clock, MapPin, Phone, Quote, ShieldCheck, Star,
} from "lucide-react";

import { Lead, PreviewBlueprint } from "@/lib/types";
import { DesignKit, buildDesignKit } from "@/lib/design/kit";
import { seedFromLead } from "@/lib/design/seed";
import { sanitizePhone } from "@/lib/crawler/fieldGuards";
import { resolveContact } from "@/lib/crawler/whatsappFinder";
import { useGoogleFont } from "./useGoogleFont";

// ─── Utilidades de movimento ──────────────────────────────────────────────────

function Reveal({
  animated,
  delay = 0,
  className,
  children,
}: {
  animated: boolean;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduzir = useReducedMotion();

  if (!animated || reduzir) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Marca ────────────────────────────────────────────────────────────────────

function BrandMark({
  lead,
  kit,
  size,
  onDark,
}: {
  lead: Lead;
  kit: DesignKit;
  size: number;
  onDark: boolean;
}) {
  const [falhou, setFalhou] = useState(false);
  const chip = kit.logoFit.treatment === "chip";

  const iniciais =
    lead.title
      .split(/\s+/)
      .filter((p) => p.length > 2)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || lead.title.slice(0, 2).toUpperCase();

  if (lead.logoUrl && !falhou) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={lead.logoUrl}
        alt={`Logo ${lead.title}`}
        onError={() => setFalhou(true)}
        className="object-contain"
        style={{
          height: size,
          width: "auto",
          maxWidth: size * 3.4,
          background: chip ? "#fff" : "transparent",
          padding: chip ? "6px 10px" : 0,
          borderRadius: chip ? kit.radius.sm : 0,
        }}
      />
    );
  }

  return (
    <span
      aria-label={lead.title}
      className="inline-flex items-center justify-center font-bold shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: kit.radius.sm,
        background: onDark ? "rgba(255,255,255,.16)" : kit.palette.primary,
        color: onDark ? "#fff" : kit.palette.onPrimary,
        fontSize: size * 0.38,
        fontFamily: kit.fonts.headingStack,
      }}
    >
      {iniciais}
    </span>
  );
}

function Estrelas({ nota, tamanho = 16 }: { nota: number; tamanho?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Nota ${nota} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: tamanho, height: tamanho }}
          className={i <= Math.round(nota) ? "fill-amber-400 text-amber-400" : "text-current opacity-25"}
        />
      ))}
    </span>
  );
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export interface PreviewRendererProps {
  lead: Lead;
  blueprint: PreviewBlueprint;
  animated?: boolean;
}

export function PreviewRenderer({ lead, blueprint, animated = false }: PreviewRendererProps) {
  const kit = useMemo(
    () => buildDesignKit({ ...seedKit(lead), direction: blueprint.theme.style }),
    [lead, blueprint.theme.style]
  );
  useGoogleFont(kit.fonts.googleHref);

  const p = kit.palette;
  const telefone = sanitizePhone(lead.phone).replace(/\D/g, "");
  const temTelefone = telefone.length >= 10;
  const cidade = lead.city?.split(",")[0]?.trim() ?? "";

  // O botão de WhatsApp usa o número que a empresa publicou para esse fim
  // especificamente — pode diferir do telefone geral (que pode ser um fixo).
  const contato = resolveContact(lead);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${lead.title}, ${lead.address}, ${lead.city}`
  )}`;
  const acaoPrimaria = contato.hasWhatsApp
    ? `https://wa.me/${contato.digits}`
    : mapsUrl;

  const fotos = lead.photos ?? [];
  const espacamento =
    blueprint.theme.density === "compacta"
      ? "py-12 md:py-14"
      : blueprint.theme.density === "espacosa"
        ? "py-16 md:py-24"
        : "py-14 md:py-20";

  const tituloEstilo = {
    fontFamily: kit.fonts.headingStack,
    letterSpacing: kit.fonts.serifHeading ? "-0.01em" : "-0.025em",
  };

  // ── Hero ────────────────────────────────────────────────────────────────────
  const selo = blueprint.hero.showRating && (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm"
      style={{
        borderRadius: kit.radius.pill,
        background: "rgba(255,255,255,.14)",
        border: "1px solid rgba(255,255,255,.24)",
        color: "#fff",
      }}
    >
      <Estrelas nota={lead.rating} tamanho={14} />
      <strong>{lead.rating.toFixed(1)}</strong>
      <span className="opacity-75">{lead.reviewsCount} avaliações no Google</span>
    </div>
  );

  const seloClaro = blueprint.hero.showRating && (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm"
      style={{
        borderRadius: kit.radius.pill,
        background: p.card,
        border: `1px solid ${p.border}`,
        color: p.text,
      }}
    >
      <Estrelas nota={lead.rating} tamanho={14} />
      <strong>{lead.rating.toFixed(1)}</strong>
      <span style={{ color: p.textMuted }}>{lead.reviewsCount} avaliações no Google</span>
    </div>
  );

  const ctas = (sobreEscuro: boolean) => (
    <div className="flex flex-wrap gap-3">
      <a
        href={acaoPrimaria}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-6 py-4 font-semibold transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          borderRadius: kit.radius.pill,
          background: p.accent,
          color: p.onAccent,
          minHeight: 52,
        }}
      >
        {contato.hasWhatsApp ? blueprint.hero.primaryCTA : "Ver no mapa"}
        <ArrowRight className="w-4 h-4" />
      </a>
      {temTelefone && blueprint.hero.secondaryCTA && (
        <a
          href={`tel:+55${telefone}`}
          className="inline-flex items-center gap-2 px-6 py-4 font-semibold transition-colors"
          style={{
            borderRadius: kit.radius.pill,
            border: `1.5px solid ${sobreEscuro ? "rgba(255,255,255,.4)" : p.border}`,
            color: sobreEscuro ? "#fff" : p.text,
            minHeight: 52,
          }}
        >
          <Phone className="w-4 h-4" />
          {lead.phone}
        </a>
      )}
    </div>
  );

  const textoHero = (sobreEscuro: boolean, centralizado = false) => (
    <div className={centralizado ? "text-center flex flex-col items-center" : ""}>
      {blueprint.hero.eyebrow && (
        <p
          className="text-xs font-semibold uppercase tracking-[0.18em] mb-4"
          style={{ color: sobreEscuro ? "rgba(255,255,255,.75)" : p.brandText }}
        >
          {blueprint.hero.eyebrow}
        </p>
      )}
      <h1
        className="font-bold mb-4 text-balance"
        style={{
          ...tituloEstilo,
          fontSize: "clamp(2rem, 6vw, 3.5rem)",
          lineHeight: 1.08,
          color: sobreEscuro ? "#fff" : p.text,
        }}
      >
        {blueprint.hero.headline}
      </h1>
      <p
        className="mb-7 max-w-xl"
        style={{
          fontSize: "clamp(1rem, 2.4vw, 1.2rem)",
          lineHeight: 1.6,
          color: sobreEscuro ? "rgba(255,255,255,.85)" : p.textMuted,
        }}
      >
        {blueprint.hero.subheadline}
      </p>
      <div className={`mb-7 ${centralizado ? "flex justify-center" : ""}`}>
        {sobreEscuro ? selo : seloClaro}
      </div>
      {ctas(sobreEscuro)}
    </div>
  );

  const imagemHero = (arredondado: boolean) => (
    <div
      className="relative overflow-hidden w-full h-full"
      style={{ borderRadius: arredondado ? kit.radius.lg : 0, minHeight: 280 }}
    >
      {fotos[0] ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotos[0]}
            alt={`${lead.title} — ${lead.category}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: kit.heroOverlay }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: kit.gradients.hero }} />
      )}
    </div>
  );

  const hero = () => {
    switch (blueprint.hero.variant) {
      case "split":
        return (
          <section className="grid md:grid-cols-2 items-stretch">
            <div
              className="px-6 md:px-12 py-14 md:py-20 flex items-center"
              style={{ background: kit.gradients.hero }}
            >
              <div className="max-w-xl w-full">{textoHero(true)}</div>
            </div>
            <div className="min-h-[260px] md:min-h-[520px]">{imagemHero(false)}</div>
          </section>
        );

      case "editorial":
        return (
          <section style={{ background: p.surface }} className="pt-14 md:pt-20 px-6">
            <div className="max-w-3xl mx-auto">{textoHero(false, true)}</div>
            {fotos[0] && (
              <div className="max-w-5xl mx-auto mt-12 h-[280px] md:h-[420px] -mb-12 relative z-10">
                {imagemHero(true)}
              </div>
            )}
          </section>
        );

      case "minimal":
        return (
          <section style={{ background: p.surface }} className="px-6 py-16 md:py-24">
            <div className="max-w-4xl mx-auto">{textoHero(false)}</div>
          </section>
        );

      case "bold":
        return (
          <section className="relative" style={{ minHeight: 460 }}>
            <div className="absolute inset-0">{imagemHero(false)}</div>
            <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 md:py-28">
              <div className="max-w-2xl">{textoHero(true)}</div>
            </div>
          </section>
        );

      case "overlay":
      default:
        return (
          <section className="relative" style={{ minHeight: 480 }}>
            <div className="absolute inset-0">{imagemHero(false)}</div>
            <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 md:py-24">
              <div className="max-w-2xl">{textoHero(true)}</div>
            </div>
          </section>
        );
    }
  };

  // ── Seções ──────────────────────────────────────────────────────────────────
  const cabecalho = (titulo?: string, subtitulo?: string, centralizado = true) =>
    titulo || subtitulo ? (
      <div className={`${centralizado ? "text-center max-w-2xl mx-auto" : "max-w-2xl"} mb-10`}>
        {titulo && (
          <h2
            className="font-bold text-balance"
            style={{ ...tituloEstilo, fontSize: "clamp(1.5rem, 4vw, 2.25rem)", color: p.text }}
          >
            {titulo}
          </h2>
        )}
        {subtitulo && (
          <p className="mt-3" style={{ color: p.textMuted, lineHeight: 1.6 }}>
            {subtitulo}
          </p>
        )}
      </div>
    ) : null;

  const renderSecao = (secao: PreviewBlueprint["sections"][number], indice: number) => {
    const key = `${secao.kind}-${indice}`;

    switch (secao.kind) {
      case "trust":
        return (
          <section key={key} className={espacamento} style={{ background: p.surface }}>
            <div className="max-w-5xl mx-auto px-6">
              <Reveal animated={animated}>
                <div
                  className="flex flex-wrap items-center gap-x-10 gap-y-6 p-6 md:p-8"
                  style={{
                    background: p.card,
                    border: `1px solid ${p.border}`,
                    borderRadius: kit.radius.lg,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="grid place-items-center w-14 h-14 font-bold text-xl"
                      style={{
                        borderRadius: kit.radius.md,
                        background: p.primaryLight,
                        color: p.brandText,
                      }}
                    >
                      {lead.rating.toFixed(1)}
                    </span>
                    <span>
                      <Estrelas nota={lead.rating} />
                      <span className="block text-sm mt-1" style={{ color: p.textMuted }}>
                        {lead.reviewsCount} avaliações no Google
                      </span>
                    </span>
                  </div>
                  <span className="flex items-center gap-2 text-sm" style={{ color: p.textMuted }}>
                    <ShieldCheck className="w-5 h-5" style={{ color: p.brandText }} />
                    Empresa verificada no Google Maps
                  </span>
                  {lead.isOpenNow !== undefined && (
                    <span className="flex items-center gap-2 text-sm" style={{ color: p.textMuted }}>
                      <Clock className="w-5 h-5" style={{ color: p.brandText }} />
                      {lead.isOpenNow ? "Aberto agora" : "Fechado agora"}
                    </span>
                  )}
                </div>
              </Reveal>
            </div>
          </section>
        );

      case "services": {
        const itens = secao.items ?? [];
        return (
          <section key={key} className={espacamento} style={{ background: p.surfaceAlt }}>
            <div className="max-w-5xl mx-auto px-6">
              <Reveal animated={animated}>{cabecalho(secao.title, secao.subtitle)}</Reveal>

              {itens.length === 0 ? null : secao.variant === "menu" ? (
                <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4 max-w-3xl mx-auto">
                  {itens.map((item, i) => (
                    <Reveal animated={animated} delay={i * 0.04} key={item.label}>
                      <div
                        className="flex items-baseline gap-3 pb-3"
                        style={{ borderBottom: `1px solid ${p.border}` }}
                      >
                        <span className="font-medium" style={{ color: p.text }}>
                          {item.label}
                        </span>
                      </div>
                    </Reveal>
                  ))}
                </div>
              ) : secao.variant === "areas" ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {itens.map((item, i) => (
                    <Reveal animated={animated} delay={i * 0.04} key={item.label}>
                      <div
                        className="flex items-start gap-3 p-5 h-full"
                        style={{
                          background: p.card,
                          borderLeft: `3px solid ${p.primary}`,
                          borderRadius: kit.radius.sm,
                        }}
                      >
                        <span className="font-semibold" style={{ color: p.text }}>
                          {item.label}
                        </span>
                      </div>
                    </Reveal>
                  ))}
                </div>
              ) : secao.variant === "cards" ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {itens.map((item, i) => (
                    <Reveal animated={animated} delay={i * 0.05} key={item.label}>
                      <div
                        className="p-6 h-full"
                        style={{
                          background: p.card,
                          border: `1px solid ${p.border}`,
                          borderRadius: kit.radius.md,
                        }}
                      >
                        <BadgeCheck className="w-6 h-6 mb-3" style={{ color: p.brandText }} />
                        <h3 className="font-semibold" style={{ color: p.text }}>
                          {item.label}
                        </h3>
                        {item.detail && (
                          <p className="text-sm mt-2" style={{ color: p.textMuted }}>
                            {item.detail}
                          </p>
                        )}
                      </div>
                    </Reveal>
                  ))}
                </div>
              ) : (
                <ul className="max-w-2xl mx-auto divide-y" style={{ borderColor: p.border }}>
                  {itens.map((item, i) => (
                    <Reveal animated={animated} delay={i * 0.04} key={item.label}>
                      <li className="flex items-center gap-3 py-4">
                        <BadgeCheck className="w-5 h-5 shrink-0" style={{ color: p.brandText }} />
                        <span style={{ color: p.text }}>{item.label}</span>
                      </li>
                    </Reveal>
                  ))}
                </ul>
              )}
            </div>
          </section>
        );
      }

      case "gallery":
        return (
          <section key={key} className={espacamento} style={{ background: p.surface }}>
            <div className="max-w-5xl mx-auto px-6">
              <Reveal animated={animated}>{cabecalho(secao.title)}</Reveal>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {fotos.slice(0, 6).map((src, i) => (
                  <Reveal animated={animated} delay={i * 0.04} key={src}>
                    <div
                      className="relative overflow-hidden aspect-[4/3]"
                      style={{ borderRadius: kit.radius.md, background: p.surfaceAlt }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`${lead.title} — foto ${i + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );

      case "reviews":
        return (
          <section key={key} className={espacamento} style={{ background: p.surfaceAlt }}>
            <div className="max-w-5xl mx-auto px-6">
              <Reveal animated={animated}>
                {cabecalho(secao.title, `Avaliações publicadas no Google`)}
              </Reveal>
              <div className="grid md:grid-cols-3 gap-4">
                {(secao.items ?? []).map((item, i) => (
                  <Reveal animated={animated} delay={i * 0.06} key={i}>
                    <figure
                      className="p-6 h-full flex flex-col gap-3"
                      style={{
                        background: p.card,
                        border: `1px solid ${p.border}`,
                        borderRadius: kit.radius.md,
                      }}
                    >
                      <Quote className="w-5 h-5 opacity-40" style={{ color: p.brandText }} />
                      <blockquote className="text-sm flex-1" style={{ color: p.text, lineHeight: 1.6 }}>
                        {item.label}
                      </blockquote>
                      {item.detail && (
                        <figcaption className="text-xs" style={{ color: p.textMuted }}>
                          {item.detail}
                        </figcaption>
                      )}
                    </figure>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );

      case "about":
        return (
          <section key={key} className={espacamento} style={{ background: p.surface }}>
            <div className="max-w-3xl mx-auto px-6">
              <Reveal animated={animated}>
                {cabecalho(secao.title, undefined, false)}
                <p style={{ color: p.textMuted, fontSize: "1.05rem", lineHeight: 1.7 }}>
                  {secao.subtitle}
                </p>
              </Reveal>
            </div>
          </section>
        );

      case "process":
        return (
          <section key={key} className={espacamento} style={{ background: p.surfaceAlt }}>
            <div className="max-w-4xl mx-auto px-6">
              <Reveal animated={animated}>{cabecalho(secao.title)}</Reveal>
              <ol className="grid sm:grid-cols-3 gap-6">
                {(secao.items ?? []).map((item, i) => (
                  <Reveal animated={animated} delay={i * 0.08} key={item.label}>
                    <li className="flex flex-col gap-2">
                      <span
                        className="grid place-items-center w-9 h-9 font-bold text-sm"
                        style={{
                          borderRadius: kit.radius.pill,
                          background: p.primary,
                          color: p.onPrimary,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span className="font-semibold" style={{ color: p.text }}>
                        {item.label}
                      </span>
                      {item.detail && (
                        <span className="text-sm" style={{ color: p.textMuted }}>
                          {item.detail}
                        </span>
                      )}
                    </li>
                  </Reveal>
                ))}
              </ol>
            </div>
          </section>
        );

      case "location":
        return (
          <section key={key} className={espacamento} style={{ background: p.surface }}>
            <div className="max-w-5xl mx-auto px-6">
              <Reveal animated={animated}>
                <div
                  className="flex flex-wrap items-center justify-between gap-6 p-6 md:p-8"
                  style={{
                    background: p.card,
                    border: `1px solid ${p.border}`,
                    borderRadius: kit.radius.lg,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="w-6 h-6 mt-0.5 shrink-0" style={{ color: p.brandText }} />
                    <div>
                      <h2 className="font-semibold" style={{ ...tituloEstilo, color: p.text }}>
                        {secao.title}
                      </h2>
                      <p className="text-sm mt-1" style={{ color: p.textMuted }}>
                        {lead.address}
                        {cidade ? `, ${cidade}` : ""}
                      </p>
                    </div>
                  </div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 font-semibold text-sm"
                    style={{
                      borderRadius: kit.radius.pill,
                      border: `1.5px solid ${p.border}`,
                      color: p.text,
                      minHeight: 48,
                    }}
                  >
                    Como chegar
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </Reveal>
            </div>
          </section>
        );

      case "cta":
        return (
          <section key={key} className={espacamento} style={{ background: kit.gradients.cta }}>
            <div className="max-w-2xl mx-auto px-6 text-center">
              <Reveal animated={animated}>
                <h2
                  className="font-bold text-white mb-4 text-balance"
                  style={{ ...tituloEstilo, fontSize: "clamp(1.6rem, 4.5vw, 2.4rem)" }}
                >
                  {contato.hasWhatsApp ? blueprint.hero.primaryCTA : "Encontre a gente"}
                </h2>
                <p className="text-white/85 mb-8">
                  {cidade ? `${lead.title} — ${cidade}` : lead.title}
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <a
                    href={acaoPrimaria}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-7 py-4 font-semibold transition-transform hover:scale-[1.03]"
                    style={{
                      borderRadius: kit.radius.pill,
                      background: "#fff",
                      color: p.primaryDark,
                      minHeight: 52,
                    }}
                  >
                    {contato.hasWhatsApp ? blueprint.hero.primaryCTA : "Ver no mapa"}
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </Reveal>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="overflow-x-hidden"
      style={{ background: p.surface, color: p.text, fontFamily: kit.fonts.bodyStack }}
    >
      <nav
        className="sticky top-0 z-40 flex items-center justify-between gap-4 px-5 md:px-8 py-3"
        style={{ background: p.primary, color: p.onPrimary }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <BrandMark lead={lead} kit={kit} size={kit.logoSizes.nav} onDark />
          {!kit.logoFit.isWordmark && (
            <span
              className="font-semibold truncate"
              style={{ ...tituloEstilo, fontSize: "clamp(.95rem,2.5vw,1.1rem)" }}
            >
              {lead.title}
            </span>
          )}
        </div>
        <a
          href={acaoPrimaria}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold shrink-0"
          style={{
            borderRadius: kit.radius.pill,
            background: p.accent,
            color: p.onAccent,
            minHeight: 44,
          }}
        >
          <Phone className="w-4 h-4" />
          <span className="hidden sm:inline">
            {contato.hasWhatsApp ? blueprint.hero.primaryCTA : "Como chegar"}
          </span>
          <span className="sm:hidden">Contato</span>
        </a>
      </nav>

      {hero()}

      {blueprint.sections.map(renderSecao)}

      <footer
        className="py-8 px-6"
        style={{ background: p.primaryDark, color: "rgba(255,255,255,.72)" }}
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-3">
            <BrandMark lead={lead} kit={kit} size={kit.logoSizes.footer} onDark />
            {!kit.logoFit.isWordmark && (
              <span className="font-semibold text-white">{lead.title}</span>
            )}
          </span>
          <span className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 opacity-60" />
              {lead.address}
              {cidade ? `, ${cidade}` : ""}
            </span>
            {temTelefone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-4 h-4 opacity-60" />
                {lead.phone}
              </span>
            )}
          </span>
        </div>
      </footer>
    </div>
  );
}

function seedKit(lead: Lead) {
  return { title: lead.title, category: lead.category, brand: seedFromLead(lead) };
}
