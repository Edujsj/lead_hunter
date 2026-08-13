"use client";

// ============================================================
// Cartão de visita online — link público que o lead abre no celular.
// Mesmo componente do modal, com animação ligada.
// ============================================================

import { useCallback, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

import { Lead } from "@/lib/types";
import { getLeadSnapshot } from "@/lib/previewStore";
import { LinkCard } from "@/components/preview/LinkCard";

/** `undefined` = ainda hidratando; `null` = link expirado */
type Snapshot = Lead | null | undefined;

const noopSubscribe = () => () => {};

export default function CartaoPage() {
  const params = useParams();
  const id = params?.id as string;

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

  if (!lead) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4 px-6 text-center">
        <div className="text-6xl">🔗</div>
        <h1 className="text-2xl font-bold">Cartão não encontrado</h1>
        <p className="text-slate-400">
          Este link pode ter expirado. Gere um novo cartão pelo dashboard.
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

  return (
    <main className="min-h-screen">
      <LinkCard lead={lead} animated />
    </main>
  );
}
