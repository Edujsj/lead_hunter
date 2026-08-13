"use client";

// ============================================================
// Landing Page do preview — fonte única
// ------------------------------------------------------------
// O modal (LandingPagePreview) e a página /preview/[id] renderizam
// ESTE componente. A única diferença é `animated`: o modal mostra a
// versão estática, o link público mostra a mesma página com motion.
// Todo o visual vem do DesignKit (lib/design/kit.ts), que por sua vez
// é derivado da marca real quando a IA encontrou logo/cores.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  AlarmClock, Award, BadgeCheck, BookOpen, Building2, CalendarCheck, Car,
  CheckCircle, ChefHat, ChevronRight, ClipboardList, Clock, CreditCard, Dumbbell,
  ExternalLink, Gem, GraduationCap, Heart, Hotel, MapPin, Palette, Phone,
  PiggyBank, Quote, Salad, Search, Settings, ShieldCheck, Smile, Sparkles,
  Star, Stethoscope, TrendingUp, Trophy, Truck, Users, Zap,
  type LucideIcon,
} from "lucide-react";

import { Lead } from "@/lib/types";
import { DesignKit, buildDesignKit } from "@/lib/design/kit";
import { kitInputFromLead } from "@/lib/design/seed";

// ─── Fontes ───────────────────────────────────────────────────────────────────

/**
 * Injeta o <link> do Google Fonts do kit. Cada empresa pode usar um par
 * tipográfico diferente, então não dá para declarar as fontes no layout —
 * elas entram sob demanda e ficam em cache para os próximos previews.
 */
export function useGoogleFont(href: string) {
  useEffect(() => {
    if (!href || typeof document === "undefined") return;
    if (document.querySelector(`link[data-preview-font="${href}"]`)) return;

    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = "https://fonts.gstatic.com";
    preconnect.crossOrigin = "anonymous";

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.previewFont = href;

    document.head.appendChild(preconnect);
    document.head.appendChild(link);
  }, [href]);
}

// ─── Ícones (regra do design system: SVG, nunca emoji) ────────────────────────
const ICON_BY_EMOJI: Record<string, LucideIcon> = {
  "🏥": Building2, "😊": Smile, "👨‍👩‍👧": Users, "🔍": Search, "⚙️": Settings,
  "📋": ClipboardList, "🥗": Salad, "👨‍🍳": ChefHat, "🚗": Car, "✨": Sparkles,
  "📅": CalendarCheck, "🎨": Palette, "🏋️": Dumbbell, "👨‍🏫": GraduationCap,
  "🕐": Clock, "❤️": Heart, "💉": Stethoscope, "🏨": Hotel, "🧑‍⚕️": Stethoscope,
  "🚚": Truck, "💳": CreditCard, "📈": TrendingUp, "⏰": AlarmClock,
  "💰": PiggyBank, "👩‍🏫": GraduationCap, "👥": Users, "📚": BookOpen,
  "🏆": Trophy, "⚡": Zap, "💎": Gem,
};

function iconFor(emoji: string): LucideIcon {
  return ICON_BY_EMOJI[emoji] ?? BadgeCheck;
}

// ─── Blocos auxiliares ────────────────────────────────────────────────────────

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
  const inView = useInView(ref, { once: true, margin: "-80px" });

  if (!animated) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Logo real da empresa; sem logo, um lockup tipográfico com a inicial */
function BrandMark({
  lead,
  kit,
  onDark,
  size = 40,
  maxWidth,
  onAspect,
  /** `true` no cartão do hero, onde o fundo já é claro */
  forcePlain = false,
}: {
  lead: Lead;
  kit: DesignKit;
  onDark: boolean;
  size?: number;
  maxWidth?: number;
  onAspect?: (ratio: number) => void;
  forcePlain?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const needsChip = !forcePlain && kit.logoFit.treatment === "chip";
  const initials = lead.title
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  if (lead.logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={lead.logoUrl}
        alt={`Logo ${lead.title}`}
        onError={() => setFailed(true)}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalHeight > 0) {
            onAspect?.(img.naturalWidth / img.naturalHeight);
          }
        }}
        className="object-contain"
        style={{
          height: size,
          width: "auto",
          maxWidth: maxWidth ?? size * 3.4,
          borderRadius: needsChip ? kit.radius.sm : 0,
          // Pastilha clara só quando o arquivo precisa: logo com fundo sólido
          // ou traço escuro que sumiria sobre a cor da marca.
          background: needsChip ? "#ffffff" : "transparent",
          padding: needsChip ? "6px 10px" : 0,
          boxShadow: needsChip ? "0 2px 10px rgba(0,0,0,0.16)" : "none",
        }}
      />
    );
  }

  return (
    <span
      aria-label={lead.title}
      className="inline-flex items-center justify-center font-black shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: kit.radius.sm,
        background: onDark ? "rgba(255,255,255,0.18)" : kit.palette.primary,
        color: onDark ? "#ffffff" : kit.palette.onPrimary,
        fontSize: size * 0.4,
        letterSpacing: "-0.02em",
      }}
    >
      {initials || lead.title.slice(0, 2).toUpperCase()}
    </span>
  );
}

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Nota ${rating} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={
            i <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-current opacity-25"
          }
        />
      ))}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export interface LandingPageProps {
  lead: Lead;
  /** `true` na página pública /preview/[id]; `false` no modal do dashboard */
  animated?: boolean;
}

export function LandingPage({ lead, animated = false }: LandingPageProps) {
  const kit = useMemo(() => buildDesignKit(kitInputFromLead(lead)), [lead]);

  useGoogleFont(kit.fonts.googleHref);

  const [heroImgOk, setHeroImgOk] = useState(true);
  // A IA já mede a proporção; o onLoad cobre o lead que ainda não passou por ela
  const [measuredAspect, setMeasuredAspect] = useState(kit.logoFit.aspect);
  const isWordmark =
    kit.hasRealLogo && (kit.logoFit.isWordmark || measuredAspect >= 2.2);
  const p = kit.palette;
  const phone = lead.phone.replace(/\D/g, "");
  const waUrl = `https://wa.me/55${phone}`;
  const cityName = lead.city.split(",")[0].trim();
  const content = kit.content;

  // Só foto real entra no hero. Sem foto, a composição de marca (gradiente +
  // logo + tipografia) é melhor que uma stock photo genérica de banco de imagem.
  const heroPhoto = lead.photos?.[0];
  const hasPhoto = Boolean(heroPhoto) && heroImgOk;
  // A primeira foto já é o hero — a galeria mostra o resto do acervo.
  const galleryPhotos = (lead.photos ?? []).slice(1, 7);

  const headingStyle = {
    fontFamily: kit.fonts.headingStack,
    letterSpacing: kit.fonts.serifHeading ? "-0.01em" : "-0.025em",
  };

  const sectionLabel = (text: string) => (
    <span
      className="text-xs font-bold uppercase tracking-[0.18em]"
      style={{ color: p.brandText }}
    >
      {text}
    </span>
  );

  // ── Hero ────────────────────────────────────────────────────────────────────
  const ratingBadge = (onDark: boolean) => (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm"
      style={{
        borderRadius: kit.radius.pill,
        background: onDark ? "rgba(255,255,255,0.14)" : p.card,
        border: `1px solid ${onDark ? "rgba(255,255,255,0.22)" : p.border}`,
        color: onDark ? "#ffffff" : p.text,
      }}
    >
      <StarRow rating={lead.rating} size={14} />
      <strong>{lead.rating.toFixed(1)}</strong>
      <span style={{ opacity: 0.7 }}>({lead.reviewsCount} avaliações no Google)</span>
    </div>
  );

  const ctaRow = (onDark: boolean) => (
    <div className="flex flex-wrap gap-3">
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-7 py-4 font-bold text-base shadow-lg transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          borderRadius: kit.radius.pill,
          background: p.accent,
          color: p.onAccent,
          minHeight: 48,
        }}
      >
        <Phone className="w-5 h-5" />
        Falar no WhatsApp
      </a>
      <a
        href={`tel:+55${phone}`}
        className="inline-flex items-center gap-2 px-7 py-4 font-bold text-base transition-colors"
        style={{
          borderRadius: kit.radius.pill,
          border: `2px solid ${onDark ? "rgba(255,255,255,0.45)" : p.border}`,
          color: onDark ? "#ffffff" : p.text,
          background: onDark ? "rgba(255,255,255,0.08)" : "transparent",
          minHeight: 48,
        }}
      >
        {lead.phone}
      </a>
    </div>
  );

  /**
   * Logo grande antes da headline. É o primeiro elemento que o dono do
   * negócio olha: se a marca dele está lá em tamanho de assinatura, a
   * página deixa de ser "um modelo" e passa a ser "o site da minha empresa".
   */
  const heroLogo = (onDark: boolean, centered: boolean) =>
    kit.hasRealLogo ? (
      <div className={`mb-6 flex ${centered ? "justify-center" : ""}`}>
        <div
          className="inline-flex items-center px-5 py-4"
          style={{
            borderRadius: kit.radius.lg,
            background: onDark ? "rgba(255,255,255,0.94)" : p.card,
            boxShadow: "0 14px 40px rgba(15,23,42,0.22)",
          }}
        >
          <BrandMark
            lead={lead}
            kit={kit}
            onDark={false}
            forcePlain
            size={kit.logoSizes.hero}
            maxWidth={kit.logoFit.maxWidth.hero}
          />
        </div>
      </div>
    ) : null;

  const heroCopy = (onDark: boolean, centered = false) => (
    <div className={centered ? "text-center flex flex-col items-center" : ""}>
      {heroLogo(onDark, centered)}
      {ratingBadge(onDark)}
      <h1
        className="text-4xl md:text-6xl font-black leading-[1.05] mt-6 mb-4"
        style={{ ...headingStyle, color: onDark ? "#ffffff" : p.text }}
      >
        {content.hero}
      </h1>
      <p
        className="text-lg md:text-xl mb-7 max-w-xl leading-relaxed"
        style={{ color: onDark ? "rgba(255,255,255,0.85)" : p.textMuted }}
      >
        {content.description}
      </p>
      <div
        className={`flex flex-wrap gap-4 text-sm mb-8 ${centered ? "justify-center" : ""}`}
        style={{ color: onDark ? "rgba(255,255,255,0.75)" : p.textMuted }}
      >
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="w-4 h-4" />
          {lead.address}, {cityName}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Phone className="w-4 h-4" />
          {lead.phone}
        </span>
      </div>
      {ctaRow(onDark)}
    </div>
  );

  /**
   * Painel visual: foto real da empresa ou composição de marca.
   * `withBrandComposition` fica falso quando o texto do hero já é
   * sobreposto ao painel — senão o nome apareceria duas vezes.
   */
  const visual = (rounded: boolean, withBrandComposition = true) => (
    <div
      className="relative overflow-hidden w-full h-full"
      style={{ borderRadius: rounded ? kit.radius.lg : 0, minHeight: 320 }}
    >
      {hasPhoto ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroPhoto}
            alt={`${lead.title} — ${lead.category}`}
            onError={() => setHeroImgOk(false)}
            className="w-full h-full object-cover absolute inset-0"
          />
          <div className="absolute inset-0" style={{ background: kit.heroOverlay }} />
        </>
      ) : (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-center"
          style={{ background: kit.gradients.hero }}
        >
          {withBrandComposition && (
            <>
              <BrandMark lead={lead} kit={kit} onDark size={72} />
              <div
                className="text-2xl md:text-3xl font-black text-white leading-tight"
                style={headingStyle}
              >
                {lead.title}
              </div>
              <div className="text-white/70 text-sm uppercase tracking-[0.2em]">
                {lead.category} · {cityName}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  const hero = () => {
    if (kit.layout === "split") {
      return (
        <section className="grid md:grid-cols-2 items-stretch">
          <div
            className="px-6 md:px-12 py-16 md:py-24 flex items-center"
            style={{ background: kit.gradients.hero }}
          >
            <div className="max-w-xl">{heroCopy(true)}</div>
          </div>
          <div className="min-h-[320px] md:min-h-[560px]">{visual(false)}</div>
        </section>
      );
    }

    if (kit.layout === "editorial") {
      return (
        <section style={{ background: p.surface }} className="pt-16 pb-0 px-6">
          <div className="max-w-3xl mx-auto">{heroCopy(false, true)}</div>
          <div className="max-w-5xl mx-auto mt-14 h-[340px] md:h-[420px] -mb-16 relative z-10">
            {visual(true)}
          </div>
        </section>
      );
    }

    // overlay
    return (
      <section className="relative" style={{ minHeight: 560 }}>
        <div className="absolute inset-0">{visual(false, false)}</div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-24">
          <div className="max-w-2xl">{heroCopy(true)}</div>
        </div>
      </section>
    );
  };

  const spacerForEditorial = kit.layout === "editorial" ? "pt-28" : "";

  return (
    <div
      style={{
        background: p.surface,
        color: p.text,
        fontFamily: kit.fonts.bodyStack,
      }}
      className="overflow-x-hidden"
    >
      {/* ── NAV ── */}
      <nav
        className="sticky top-0 z-40 flex items-center justify-between gap-4 px-5 md:px-8 py-3"
        style={{ background: p.primary, color: p.onPrimary }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <BrandMark
            lead={lead}
            kit={kit}
            onDark
            size={kit.logoSizes.nav}
            maxWidth={kit.logoFit.maxWidth.nav}
            onAspect={setMeasuredAspect}
          />
          {/* Logotipo largo já traz o nome escrito — repetir ao lado polui */}
          {!isWordmark && (
            <span
              className="font-bold text-base md:text-lg truncate"
              style={{ ...headingStyle, letterSpacing: "-0.01em" }}
            >
              {lead.title}
            </span>
          )}
        </div>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold shrink-0 transition-transform hover:scale-105"
          style={{
            borderRadius: kit.radius.pill,
            background: p.accent,
            color: p.onAccent,
            minHeight: 44,
          }}
        >
          <Phone className="w-4 h-4" />
          <span className="hidden sm:inline">{lead.phone}</span>
          <span className="sm:hidden">Contato</span>
        </a>
      </nav>

      {hero()}

      {/* ── PROVA SOCIAL ── */}
      <div className={`px-6 ${spacerForEditorial}`}>
        <Reveal animated={animated} className="max-w-5xl mx-auto">
          <div
            className="p-6 flex flex-wrap gap-x-10 gap-y-5 items-center"
            style={{
              background: p.card,
              border: `1px solid ${p.border}`,
              borderRadius: kit.radius.lg,
              marginTop: kit.layout === "overlay" ? -44 : 24,
              position: "relative",
              zIndex: 20,
              boxShadow: "0 18px 50px rgba(15,23,42,0.10)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 flex items-center justify-center font-black"
                style={{
                  borderRadius: kit.radius.sm,
                  background: p.primaryLight,
                  color: p.brandText,
                }}
              >
                {lead.rating.toFixed(1)}
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: p.textMuted }}>
                  Avaliação no Google
                </div>
                <div style={{ color: p.text }}>
                  <StarRow rating={lead.rating} />
                </div>
                <div className="text-xs" style={{ color: p.textMuted }}>
                  {lead.reviewsCount} avaliações verificadas
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: p.textMuted }}>
              <ShieldCheck className="w-5 h-5" style={{ color: p.brandText }} />
              Empresa verificada no Google Maps
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: p.textMuted }}>
              <Award className="w-5 h-5" style={{ color: p.brandText }} />
              Referência em {lead.category} em {cityName}
            </div>
          </div>
        </Reveal>
      </div>

      {/* ── SERVIÇOS ── */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <Reveal animated={animated}>
          <div className="text-center mb-10">
            {sectionLabel("O que oferecemos")}
            <h2
              className="text-3xl md:text-4xl font-black mt-3 mb-3"
              style={{ ...headingStyle, color: p.text }}
            >
              Nossos Serviços
            </h2>
            <p className="max-w-lg mx-auto" style={{ color: p.textMuted }}>
              Soluções completas em {lead.category.toLowerCase()} para atender você e sua
              família em {cityName}.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {content.services.map((service, i) => (
            <Reveal animated={animated} delay={i * 0.05} key={service}>
              <div
                className="flex items-center gap-3 p-4 h-full transition-shadow hover:shadow-md"
                style={{
                  background: p.card,
                  border: `1px solid ${i === 0 ? p.primary : p.border}`,
                  borderRadius: kit.radius.md,
                }}
              >
                <span
                  className="w-9 h-9 flex items-center justify-center font-bold text-sm shrink-0"
                  style={{
                    borderRadius: kit.radius.sm,
                    background: i === 0 ? p.primary : p.primaryLight,
                    color: i === 0 ? p.onPrimary : p.brandText,
                  }}
                >
                  {i + 1}
                </span>
                <span className="font-semibold text-sm" style={{ color: p.text }}>
                  {service}
                </span>
                <ChevronRight
                  className="w-4 h-4 ml-auto shrink-0"
                  style={{ color: p.textMuted, opacity: 0.5 }}
                />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── GALERIA (fotos reais do Instagram / Google Maps) ── */}
      {galleryPhotos.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-4">
          <Reveal animated={animated}>
            <div className="text-center mb-8">
              {sectionLabel(lead.instagramHandle ? `@${lead.instagramHandle}` : "Nosso espaço")}
              <h2
                className="text-3xl md:text-4xl font-black mt-3"
                style={{ ...headingStyle, color: p.text }}
              >
                Conheça a {lead.title}
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {galleryPhotos.map((src, i) => (
              <Reveal animated={animated} delay={i * 0.05} key={src}>
                <div
                  className="relative overflow-hidden aspect-square"
                  style={{ borderRadius: kit.radius.md, background: p.surfaceAlt }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${lead.title} — foto ${i + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    onError={(e) => {
                      const el = e.currentTarget.parentElement;
                      if (el) el.style.display = "none";
                    }}
                  />
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── DIFERENCIAIS ── */}
      <section className="py-16 md:py-20" style={{ background: p.surfaceAlt }}>
        <div className="max-w-5xl mx-auto px-6">
          <Reveal animated={animated}>
            <div className="text-center mb-10">
              <h2
                className="text-3xl md:text-4xl font-black"
                style={{ ...headingStyle, color: p.text }}
              >
                Por que nos escolher?
              </h2>
              <p className="mt-2" style={{ color: p.textMuted }}>
                Os motivos que fazem de nós a melhor escolha em {cityName}
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {content.differentials.map((d, i) => {
              const Icon = iconFor(d.icon);
              return (
                <Reveal animated={animated} delay={i * 0.08} key={d.title}>
                  <div
                    className="h-full p-6 text-center"
                    style={{
                      background: p.card,
                      borderRadius: kit.radius.lg,
                      border: `1px solid ${p.border}`,
                    }}
                  >
                    <span
                      className="inline-flex w-12 h-12 items-center justify-center mb-4"
                      style={{
                        borderRadius: kit.radius.sm,
                        background: p.primaryLight,
                        color: p.brandText,
                      }}
                    >
                      <Icon className="w-6 h-6" />
                    </span>
                    <h3
                      className="text-lg font-bold mb-2"
                      style={{ ...headingStyle, color: p.text }}
                    >
                      {d.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: p.textMuted }}>
                      {d.desc}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <Reveal animated={animated}>
          <div className="text-center mb-10">
            {sectionLabel("Prova social")}
            <h2
              className="text-3xl md:text-4xl font-black mt-3"
              style={{ ...headingStyle, color: p.text }}
            >
              O que dizem nossos clientes
            </h2>
            <p className="mt-2" style={{ color: p.textMuted }}>
              Baseado nas {lead.reviewsCount} avaliações reais no Google
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {content.testimonials.map((text, i) => {
            const names = ["Ana S.", "Carlos M.", "Paula R."];
            const timeAgo = ["1 semana", "2 semanas", "1 mês"];
            return (
              <Reveal animated={animated} delay={i * 0.08} key={text}>
                <div
                  className="h-full p-5 flex flex-col gap-3"
                  style={{
                    background: p.card,
                    border: `1px solid ${p.border}`,
                    borderRadius: kit.radius.lg,
                  }}
                >
                  <Quote className="w-5 h-5" style={{ color: p.brandText, opacity: 0.5 }} />
                  <p className="text-sm leading-relaxed flex-1" style={{ color: p.text }}>
                    {text}
                  </p>
                  <div
                    className="flex items-center gap-2 pt-3"
                    style={{ borderTop: `1px solid ${p.border}` }}
                  >
                    <span
                      className="w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        borderRadius: kit.radius.pill,
                        background: p.primary,
                        color: p.onPrimary,
                      }}
                    >
                      {names[i][0]}
                    </span>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: p.text }}>
                        {names[i]}
                      </div>
                      <div className="text-xs" style={{ color: p.textMuted }}>
                        há {timeAgo[i]}
                      </div>
                    </div>
                    <CheckCircle
                      className="w-4 h-4 ml-auto"
                      style={{ color: p.accent }}
                    />
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-16 md:py-20 px-6 text-center" style={{ background: kit.gradients.cta }}>
        <Reveal animated={animated} className="max-w-2xl mx-auto">
          <Zap className="w-10 h-10 mx-auto mb-4 text-white/80" />
          <h2
            className="text-3xl md:text-4xl font-black text-white mb-3"
            style={headingStyle}
          >
            Pronto para começar?
          </h2>
          <p className="text-white/85 text-lg mb-8">
            Entre em contato agora e receba um atendimento personalizado da{" "}
            <strong>{lead.title}</strong> em {cityName}.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-9 py-4 font-bold text-base shadow-xl transition-transform hover:scale-105"
              style={{
                borderRadius: kit.radius.pill,
                background: p.accent,
                color: p.onAccent,
                minHeight: 48,
              }}
            >
              Falar no WhatsApp
              <ChevronRight className="w-5 h-5" />
            </a>
            <a
              href={`tel:+55${phone}`}
              className="inline-flex items-center gap-2 px-8 py-4 font-bold text-base text-white transition-colors"
              style={{
                borderRadius: kit.radius.pill,
                border: "2px solid rgba(255,255,255,0.4)",
                background: "rgba(255,255,255,0.1)",
                minHeight: 48,
              }}
            >
              <Phone className="w-5 h-5" />
              Ligar Agora
            </a>
          </div>
        </Reveal>
      </section>

      {/* ── RODAPÉ ── */}
      <footer className="py-9 px-6" style={{ background: p.primaryDark, color: "rgba(255,255,255,0.72)" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 text-sm">
          <div className="flex items-center gap-3">
            <BrandMark
              lead={lead}
              kit={kit}
              onDark
              size={kit.logoSizes.footer}
              maxWidth={kit.logoFit.maxWidth.footer}
            />
            {!isWordmark && (
              <span className="font-bold text-white" style={headingStyle}>
                {lead.title}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 opacity-60" />
              {lead.address}, {cityName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-4 h-4 opacity-60" />
              {lead.phone}
            </span>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
          <div className="text-xs opacity-70">
            © {new Date().getFullYear()} {lead.title} • {cityName}
          </div>
        </div>
      </footer>

      {/* ── FAB WhatsApp (só na página pública) ── */}
      {animated && (
        <motion.a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 px-5 py-3.5 font-bold text-sm text-white shadow-2xl"
          style={{ borderRadius: kit.radius.pill, background: "#25D366", minHeight: 48 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.117 1.527 5.845L.057 23.882l6.2-1.626A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.82 9.82 0 01-5.007-1.37l-.36-.214-3.677.964.981-3.585-.235-.369A9.82 9.82 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z" />
          </svg>
          Chamar no WhatsApp
        </motion.a>
      )}
    </div>
  );
}
