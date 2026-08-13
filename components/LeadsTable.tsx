"use client";

import { Lead } from "@/lib/types";
import { LeadBadge } from "./LeadBadge";
// Esta versão do lucide não traz ícones de marca — AtSign/Users no lugar
import {
  MessageCircle, Eye, Star, Globe, Phone, MapPin, BrainCircuit,
  AtSign, Users,
} from "lucide-react";

interface LeadsTableProps {
  leads: Lead[];
  onMessage: (lead: Lead) => void;
  onPreview: (lead: Lead) => void;
  onDeepCrawl: (lead: Lead) => void;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const frac = rating % 1 >= 0.5;
  return (
    <span className="flex items-center gap-1 text-amber-400 text-sm">
      <Star className="w-3.5 h-3.5 fill-amber-400" />
      <span className="font-semibold text-white">{rating.toFixed(1)}</span>
    </span>
  );
}

export function LeadsTable({ leads, onMessage, onPreview, onDeepCrawl }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-lg font-medium">Nenhum lead encontrado</p>
        <p className="text-sm mt-1">Tente outro nicho ou cidade</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50 text-left">
            <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Empresa</th>
            <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
            <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Avaliação</th>
            <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Contato</th>
            <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Localização</th>
            <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="group hover:bg-slate-800/30 transition-colors"
            >
              {/* Empresa */}
              <td className="py-3.5 pr-4">
                <div className="font-semibold text-white group-hover:text-violet-300 transition-colors">
                  {lead.title}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{lead.category}</div>
              </td>

              {/* Status */}
              <td className="py-3.5 pr-4">
                <LeadBadge status={lead.analyzedStatus} />
                {lead.originalWebsite && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Globe className="w-3 h-3 text-slate-600" />
                    <span className="text-xs text-slate-600 truncate max-w-[140px]">
                      {lead.originalWebsite.replace(/^https?:\/\//, "")}
                    </span>
                  </div>
                )}
              </td>

              {/* Avaliação */}
              <td className="py-3.5 pr-4">
                <StarRating rating={lead.rating} />
                <div className="text-xs text-slate-500 mt-0.5">
                  {lead.reviewsCount} avaliações
                </div>
              </td>

              {/* Contato */}
              <td className="py-3.5 pr-4">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-mono text-xs">{lead.phone}</span>
                </div>
                {/* Perfis descobertos pela IA — âncora da abordagem */}
                {lead.instagramHandle && (
                  <a
                    href={`https://instagram.com/${lead.instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 mt-1.5 text-xs text-pink-400/80 hover:text-pink-300 transition-colors"
                  >
                    <AtSign className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[130px]">@{lead.instagramHandle}</span>
                  </a>
                )}
                {lead.facebookHandle && (
                  <a
                    href={`https://facebook.com/${lead.facebookHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 mt-1 text-xs text-blue-400/80 hover:text-blue-300 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[130px]">/{lead.facebookHandle}</span>
                  </a>
                )}
              </td>

              {/* Localização */}
              <td className="py-3.5 pr-4">
                <div className="flex items-start gap-1.5 text-slate-400 text-xs">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
                  <div>
                    <div>{lead.address}</div>
                    <div className="text-slate-500">{lead.city}</div>
                  </div>
                </div>
              </td>

              {/* Ações */}
              <td className="py-3.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    id={`btn-message-${lead.id}`}
                    onClick={() => onMessage(lead)}
                    title="Iniciar Abordagem"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 text-green-400 hover:text-green-300 rounded-lg text-xs font-medium transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Abordar
                  </button>
                  <button
                    id={`btn-preview-${lead.id}`}
                    onClick={() => onPreview(lead)}
                    title="Preview da Landing Page"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/40 text-violet-400 hover:text-violet-300 rounded-lg text-xs font-medium transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                  <button
                    id={`btn-deep-crawl-${lead.id}`}
                    onClick={() => onDeepCrawl(lead)}
                    title="Análise Profunda & Extrair Prompt"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-medium transition-all"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    IA
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
