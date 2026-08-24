"use client";

import { Lead } from "@/lib/types";
import { resolveContact } from "@/lib/crawler/whatsappFinder";
import { X, Copy, ExternalLink, Check, MessageCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface ColdMessageModalProps {
  lead: Lead | null;
  onClose: () => void;
}

function buildScriptA(lead: Lead): string {
  return `Olá! Tudo bem? 😊

Vi que a *${lead.title}* ainda não tem um site no Google — e isso pode estar custando clientes todos os dias para concorrentes que aparecem primeiro nas buscas.

Pessoal que pesquisa "${lead.category}" em ${lead.city} no Google não consegue te encontrar facilmente. Enquanto isso, seus concorrentes com site estão captando esses clientes.

Eu crio sites profissionais em até 7 dias, que aparecem no Google, passam confiança e geram contatos direto no seu WhatsApp.

Posso te mostrar um modelo do site que eu já faria para a *${lead.title}*? É sem compromisso! 🚀`;
}

function buildScriptB(lead: Lead): string {
  return `Olá! Tudo bem? 😊

Vi que a *${lead.title}* usa o WhatsApp como site — o que funciona, mas pode estar te custando clientes.

O problema: quando alguém pesquisa "${lead.category}" no Google e clica no seu link, cai direto no WhatsApp sem saber nada sobre seu serviço, preço ou diferenciais. Muita gente abandona antes de mandar mensagem.

Com um site profissional você tem: ✅ Catálogo de serviços
✅ Fotos do trabalho
✅ Depoimentos de clientes
✅ Botão de contato direto
✅ Aparece melhor no Google

Criei um modelo do site da *${lead.title}* — posso te mostrar agora, é de graça e sem compromisso! 🎯`;
}

export function ColdMessageModal({ lead, onClose }: ColdMessageModalProps) {
  const [activeScript, setActiveScript] = useState<"A" | "B">("A");
  const [copied, setCopied] = useState(false);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!lead) return;
    if (lead.analyzedStatus === "NO_SITE") {
      setActiveScript("A");
    } else {
      setActiveScript("B");
    }
    setCopied(false);

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lead, handleClose]);

  if (!lead) return null;

  const scriptA = buildScriptA(lead);
  const scriptB = buildScriptB(lead);
  const currentScript = activeScript === "A" ? scriptA : scriptB;

  // Usa o WhatsApp que a empresa publicou para esse fim quando existe —
  // mandar para o número certo importa mais aqui do que em qualquer outro
  // lugar do app, já que esta tela existe para de fato disparar a mensagem.
  const contato = resolveContact(lead);
  const temTelefone = contato.hasWhatsApp;
  const waUrl = `https://wa.me/${contato.digits}?text=${encodeURIComponent(currentScript)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-400" />
              Abordagem Comercial
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">{lead.title} — {lead.city}</p>
          </div>
          <button
            id="btn-close-modal"
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Script Selector */}
          <div className="flex gap-2">
            <button
              id="btn-script-a"
              onClick={() => setActiveScript("A")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all ${
                activeScript === "A"
                  ? "bg-red-500/20 border-red-500/50 text-red-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              🔥 Script A — Sem Site
            </button>
            <button
              id="btn-script-b"
              onClick={() => setActiveScript("B")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all ${
                activeScript === "B"
                  ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              📱 Script B — WhatsApp/Social
            </button>
          </div>

          {/* Script Text */}
          <div className="relative">
            <pre className="whitespace-pre-wrap text-sm text-slate-300 bg-slate-800/60 border border-slate-700 rounded-xl p-4 leading-relaxed font-sans max-h-56 overflow-y-auto">
              {currentScript}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              id="btn-copy-script"
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white rounded-xl font-semibold text-sm transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Mensagem
                </>
              )}
            </button>
            {temTelefone ? (
              <a
                id="btn-open-whatsapp"
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/40"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir no WhatsApp
              </a>
            ) : (
              <span className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 border border-slate-700 text-slate-500 rounded-xl font-semibold text-sm cursor-not-allowed">
                Sem telefone capturado
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 text-center">
            {temTelefone
              ? "💡 Personalize a mensagem antes de enviar para melhores resultados"
              : "O crawler não capturou o telefone deste lead — copie a mensagem e busque o contato no perfil da empresa"}
          </p>
        </div>
      </div>
    </div>
  );
}
