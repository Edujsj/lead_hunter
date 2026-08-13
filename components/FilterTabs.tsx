"use client";

import { FilterType } from "@/lib/types";
import { Lead } from "@/lib/types";

interface FilterTabsProps {
  active: FilterType;
  onChange: (f: FilterType) => void;
  leads: Lead[];
}

interface Tab {
  key: FilterType;
  label: string;
  emoji: string;
  activeClass: string;
}

const TABS: Tab[] = [
  { key: "ALL", label: "Todos", emoji: "📋", activeClass: "bg-slate-600 text-white border-slate-500" },
  { key: "NO_SITE", label: "Sem Site", emoji: "🔥", activeClass: "bg-red-500/20 text-red-300 border-red-500/50" },
  { key: "REDIRECTS_TO_WHATSAPP", label: "WhatsApp Direto", emoji: "📱", activeClass: "bg-orange-500/20 text-orange-300 border-orange-500/50" },
  { key: "REDIRECTS_TO_SOCIAL", label: "Só Social", emoji: "📸", activeClass: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50" },
  { key: "SITE_OFFLINE", label: "Offline", emoji: "💀", activeClass: "bg-purple-500/20 text-purple-300 border-purple-500/50" },
  { key: "VALID_SITE", label: "Com Site", emoji: "✅", activeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50" },
];

function count(leads: Lead[], filter: FilterType): number {
  if (filter === "ALL") return leads.length;
  return leads.filter((l) => l.analyzedStatus === filter).length;
}

export function FilterTabs({ active, onChange, leads }: FilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const cnt = count(leads, tab.key);
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            id={`filter-${tab.key.toLowerCase()}`}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              isActive
                ? tab.activeClass
                : "bg-slate-800/40 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
            {cnt > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? "bg-white/20" : "bg-slate-700"
                }`}
              >
                {cnt}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
