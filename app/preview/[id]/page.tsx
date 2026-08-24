"use client";

// ============================================================
// Página pública do preview — o link que o vendedor manda para o lead.
// Renderiza o mesmo componente do modal, com animação ligada.
// ============================================================

import { useCallback, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

import { Lead } from "@/lib/types";
import { getLeadSnapshot } from "@/lib/previewStore";
import { PreviewRenderer } from "@/components/preview/PreviewRenderer";
import { prepararPreview } from "@/lib/intelligence";

/** `undefined` = ainda no servidor / hidratando; `null` = link expirado */
type Snapshot = Lead | null | undefined;

const noopSubscribe = () => () => {};

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4 px-6 text-center">
      <div className="text-6xl">🔍</div>
      <h1 className="text-2xl font-bold">Preview não encontrado</h1>
      <p className="text-slate-400">
        Este link pode ter expirado. Gere um novo preview pelo dashboard.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition-colors"
      >
        Voltar ao Dashboard
      </Link>
    </div>
  );
}

export default function PreviewPage() {
  const params = useParams();
  const id = params?.id as string;

  // O lead vive no localStorage — um sistema externo ao React. Ler por
  // useSyncExternalStore evita setState dentro de efeito e mantém o
  // snapshot do servidor coerente com a hidratação.
  const getSnapshot = useCallback((): Snapshot => (id ? getLeadSnapshot(id) : null), [id]);
  const getServerSnapshot = useCallback((): Snapshot => undefined, []);
  const lead = useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);

  if (lead === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <motion.div
          className="w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (!lead) return <NotFound />;

  return (
    <main className="min-h-screen">
      <PreviewRenderer lead={lead} blueprint={prepararPreview(lead).blueprint} animated />
    </main>
  );
}
