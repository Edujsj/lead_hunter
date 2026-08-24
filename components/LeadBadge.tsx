"use client";

import { UrlStatus } from "@/lib/types";

interface BadgeConfig {
  label: string;
  bg: string;
  text: string;
  dot: string;
  emoji: string;
}

const CONFIG: Record<UrlStatus, BadgeConfig> = {
  NO_SITE: {
    label: "Sem Site",
    bg: "bg-red-500/15 border border-red-500/30",
    text: "text-red-400",
    dot: "bg-red-500",
    emoji: "🔥",
  },
  REDIRECTS_TO_WHATSAPP: {
    label: "WhatsApp Direto",
    bg: "bg-orange-500/15 border border-orange-500/30",
    text: "text-orange-400",
    dot: "bg-orange-500",
    emoji: "📱",
  },
  REDIRECTS_TO_SOCIAL: {
    label: "Só Social",
    bg: "bg-yellow-500/15 border border-yellow-500/30",
    text: "text-yellow-400",
    dot: "bg-yellow-500",
    emoji: "📸",
  },
  SITE_OFFLINE: {
    label: "Site Offline",
    bg: "bg-purple-500/15 border border-purple-500/30",
    text: "text-purple-400",
    dot: "bg-purple-500",
    emoji: "💀",
  },
  WEBSITE_BROKEN: {
    label: "Domínio Morto",
    bg: "bg-slate-500/15 border border-slate-500/30",
    text: "text-slate-400",
    dot: "bg-slate-500",
    emoji: "🚫",
  },
  SITE_PROTECTED: {
    label: "Site Protegido",
    bg: "bg-sky-500/15 border border-sky-500/30",
    text: "text-sky-400",
    dot: "bg-sky-500",
    emoji: "🛡️",
  },
  VALID_SITE: {
    label: "Com Site",
    bg: "bg-emerald-500/15 border border-emerald-500/30",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
    emoji: "✅",
  },
};

export function LeadBadge({ status }: { status: UrlStatus }) {
  const cfg = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.emoji} {cfg.label}
    </span>
  );
}

export function statusPriority(status: UrlStatus): number {
  const order: Record<UrlStatus, number> = {
    NO_SITE: 0,
    REDIRECTS_TO_WHATSAPP: 1,
    REDIRECTS_TO_SOCIAL: 2,
    SITE_OFFLINE: 3,
    WEBSITE_BROKEN: 4,
    // Site no ar que só bloqueia robô não é oportunidade — vai para o fim
    SITE_PROTECTED: 5,
    VALID_SITE: 6,
  };
  return order[status];
}
