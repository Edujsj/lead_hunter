"use client";

// ============================================================
// Cartão de visita online — estilo link-in-bio, animado
// ------------------------------------------------------------
// A logo da empresa é o herói: entra grande, centralizada, sobre um
// fundo feito da própria cor da marca. Os links descem em cascata.
// Mesmo DesignKit da landing page, então cartão e site combinam.
// ============================================================

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Star } from "lucide-react";

import { Lead } from "@/lib/types";
import { DesignKit, buildDesignKit } from "@/lib/design/kit";
import { seedFromLead } from "@/lib/design/seed";
import {
  CardLink,
  FILLED_ICONS,
  LINK_ICON_PATHS,
  buildCardLinks,
} from "@/lib/design/links";
import { useGoogleFont } from "./useGoogleFont";

function LinkIcon({ link, size = 22 }: { link: CardLink; size?: number }) {
  const filled = FILLED_ICONS.includes(link.kind);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d={LINK_ICON_PATHS[link.kind]} />
    </svg>
  );
}

/** Logo grande do topo, com moldura só quando o arquivo precisa */
function CardAvatar({ lead, kit }: { lead: Lead; kit: DesignKit }) {
  const [failed, setFailed] = useState(false);
  const size = 132;

  const initials =
    lead.title
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || lead.title.slice(0, 2).toUpperCase();

  return (
    <div
      className="flex items-center justify-center shadow-2xl"
      style={{
        width: size,
        height: size,
        borderRadius: kit.shape === "sharp" ? kit.radius.lg : "50%",
        background: "#ffffff",
        border: "4px solid rgba(255,255,255,0.55)",
        overflow: "hidden",
      }}
    >
      {lead.logoUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lead.logoUrl}
          alt={`Logo ${lead.title}`}
          onError={() => setFailed(true)}
          className="object-contain"
          style={{ width: "78%", height: "78%" }}
        />
      ) : (
        <span
          className="font-black"
          style={{
            fontFamily: kit.fonts.headingStack,
            fontSize: size * 0.34,
            color: kit.palette.primary,
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

export interface LinkCardProps {
  lead: Lead;
  animated?: boolean;
}

export function LinkCard({ lead, animated = true }: LinkCardProps) {
  const kit = useMemo(
    () => buildDesignKit({ title: lead.title, category: lead.category, brand: seedFromLead(lead) }),
    [lead]
  );
  const links = useMemo(() => buildCardLinks(lead), [lead]);
  const prefersReduced = useReducedMotion();
  const motionOn = animated && !prefersReduced;

  useGoogleFont(kit.fonts.googleHref);

  const p = kit.palette;
  const cityName = lead.city.split(",")[0].trim();

  const enter = (delay: number) =>
    motionOn
      ? {
          initial: { opacity: 0, y: 26 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
        }
      : {};

  return (
    <div
      className="relative min-h-full overflow-hidden px-5 py-12"
      style={{
        background: kit.gradients.hero,
        fontFamily: kit.fonts.bodyStack,
      }}
    >
      {/* Manchas de luz respirando ao fundo — cor da marca, sem imagem */}
      {motionOn &&
        [0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 260 + i * 90,
              height: 260 + i * 90,
              left: `${[8, 62, 30][i]}%`,
              top: `${[6, 34, 72][i]}%`,
              background: i === 1 ? p.accent : "#ffffff",
              filter: "blur(70px)",
              opacity: 0.16,
            }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{
              duration: 7 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.8,
            }}
          />
        ))}

      <div className="relative z-10 mx-auto w-full max-w-md flex flex-col items-center text-center">
        <motion.div {...enter(0.05)}>
          <CardAvatar lead={lead} kit={kit} />
        </motion.div>

        <motion.h1
          className="mt-6 text-3xl font-black text-white leading-tight"
          style={{ fontFamily: kit.fonts.headingStack }}
          {...enter(0.15)}
        >
          {lead.title}
        </motion.h1>

        <motion.p
          className="mt-2 text-sm uppercase tracking-[0.2em] text-white/70"
          {...enter(0.2)}
        >
          {lead.category} · {cityName}
        </motion.p>

        {lead.reviewsCount > 0 && (
          <motion.div
            className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 text-sm text-white"
            style={{
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.24)",
            }}
            {...enter(0.25)}
          >
            <span className="inline-flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i <= Math.round(lead.rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-white/30"
                  }`}
                />
              ))}
            </span>
            <strong>{lead.rating.toFixed(1)}</strong>
            <span className="text-white/70">({lead.reviewsCount})</span>
          </motion.div>
        )}

        {/* Links */}
        <div className="mt-8 w-full flex flex-col gap-3">
          {links.map((link, i) => {
            const isPrimary = Boolean(link.primary);
            return (
              <motion.a
                key={link.kind}
                href={link.href}
                target={link.href.startsWith("tel:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-5 py-4 text-left transition-colors"
                style={{
                  borderRadius: kit.radius.pill === "999px" ? 999 : kit.radius.md,
                  minHeight: 62,
                  background: isPrimary ? p.accent : "rgba(255,255,255,0.14)",
                  color: isPrimary ? p.onAccent : "#ffffff",
                  border: `1px solid ${
                    isPrimary ? "transparent" : "rgba(255,255,255,0.22)"
                  }`,
                  backdropFilter: "blur(6px)",
                }}
                {...enter(0.32 + i * 0.07)}
                whileHover={motionOn ? { scale: 1.03, y: -2 } : undefined}
                whileTap={motionOn ? { scale: 0.97 } : undefined}
              >
                <span
                  className="flex items-center justify-center w-10 h-10 shrink-0"
                  style={{
                    borderRadius: 999,
                    background: isPrimary
                      ? "rgba(255,255,255,0.22)"
                      : "rgba(255,255,255,0.14)",
                  }}
                >
                  <LinkIcon link={link} />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-[15px] leading-tight">
                    {link.label}
                  </span>
                  {link.sublabel && (
                    <span className="block text-xs opacity-75 truncate">
                      {link.sublabel}
                    </span>
                  )}
                </span>
              </motion.a>
            );
          })}
        </div>

        <motion.div
          className="mt-8 flex items-start gap-2 text-xs text-white/65"
          {...enter(0.32 + links.length * 0.07)}
        >
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {lead.address}, {cityName}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
