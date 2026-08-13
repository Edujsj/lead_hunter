// ─── Preview Store ────────────────────────────────────────────────────────────
// Salva e recupera dados de um lead no localStorage para uso na rota /preview/[id]

import { Lead } from "./types";

const PREFIX = "lead_preview_";

export function saveLeadForPreview(lead: Lead): void {
  snapshotCache.set(lead.id, lead);
  try {
    localStorage.setItem(PREFIX + lead.id, JSON.stringify(lead));
  } catch {
    // localStorage indisponível (SSR ou modo privado) — silencioso
  }
}

export function getLeadForPreview(id: string): Lead | null {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as Lead;
  } catch {
    return null;
  }
}

// `useSyncExternalStore` compara snapshots por identidade — devolver um objeto
// novo a cada leitura entraria em loop de render. Este cache garante a mesma
// referência para o mesmo id dentro da sessão.
const snapshotCache = new Map<string, Lead | null>();

export function getLeadSnapshot(id: string): Lead | null {
  if (!snapshotCache.has(id)) {
    snapshotCache.set(id, getLeadForPreview(id));
  }
  return snapshotCache.get(id) ?? null;
}

export function clearLeadPreview(id: string): void {
  snapshotCache.delete(id);
  try {
    localStorage.removeItem(PREFIX + id);
  } catch {
    // silencioso
  }
}
