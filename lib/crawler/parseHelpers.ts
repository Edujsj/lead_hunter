// ─── Helpers de parsing para o crawler do Google Maps ────────────────────────

/**
 * Limpa e formata um número de telefone brasileiro no formato visual.
 * Ex: "+55 51 99999-8888" → "(51) 99999-8888"
 */
export function cleanPhone(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  // Remove prefixo 55 se vier com código do país
  const local =
    digits.startsWith("55") && digits.length >= 12
      ? digits.slice(2)
      : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return raw; // retorna o original se não conseguir parsear
}

/**
 * Converte número de telefone brasileiro para formato E.164 internacional.
 * Ex: "(51) 99999-8888" → "+5551999998888"
 * Ex: "+55 51 99999-8888" → "+5551999998888"
 */
export function normalizePhone(raw: string): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");

  // Already has country code
  if (digits.startsWith("55") && digits.length >= 12) {
    return `+${digits}`;
  }
  // Local number with DDD (10 or 11 digits)
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  return undefined;
}

/**
 * Extrai número de avaliações de strings como "(234)" ou "234 avaliações".
 */
export function parseReviewCount(raw: string): number {
  const match = raw.replace(/\./g, "").match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Extrai rating de strings como "4,5" ou "4.5".
 */
export function parseRating(raw: string): number {
  const normalized = raw.replace(",", ".");
  const val = parseFloat(normalized);
  return isNaN(val) ? 0 : Math.min(5, Math.max(0, val));
}

/**
 * Gera um ID único por nome e cidade (determinístico).
 */
export function makeLeadId(name: string, city: string): string {
  const base = `${name}-${city}`.toLowerCase().replace(/[^a-z0-9]/g, "-");
  return `real-${base}-${Date.now()}`;
}

/**
 * Normaliza a cidade extraindo só o nome (sem ", UF").
 */
export function normalizeCityName(city: string): string {
  return city.split(",")[0].trim();
}

/**
 * Tenta extrair o bairro de uma string de endereço.
 * Google Maps tipicamente retorna: "Rua X, 123, Bairro - Cidade, UF"
 * ou "Bairro, Cidade - UF".
 * Retorna o bairro se encontrado, ou undefined.
 */
export function extractNeighborhood(address: string): string | undefined {
  if (!address) return undefined;
  const parts = address.split(",").map((p) => p.trim());

  // Procura por uma parte que:
  // - não é puramente numérica
  // - não parece um logradouro (não começa com Rua/Av/R.)
  // - tem entre 3 e 40 chars
  // - não é uma sigla de UF (2 chars)
  // Normalmente o bairro é a 3ª ou 4ª parte
  const streetPrefixes = /^(rua|av\.|avenida|r\.|trav\.|alameda|praça|estrada|rod\.)/i;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (
      part.length >= 3 &&
      part.length <= 40 &&
      !/^\d+$/.test(part) &&
      !streetPrefixes.test(part) &&
      !/^[A-Z]{2}$/.test(part) // not a UF abbreviation
    ) {
      return part;
    }
  }
  return undefined;
}

/**
 * Parseia uma string de horários de funcionamento do Google Maps.
 * Exemplos de entrada:
 *   "Segunda: 9:00–18:00\nTerça: 9:00–18:00"
 *   "Seg-Sex: 8h–20h; Sáb: 8h–14h"
 * Retorna um Record<string, string> com dia → horário.
 */
export function parseOpeningHours(raw: string): Record<string, string> {
  if (!raw || raw.trim() === "") return {};
  const hours: Record<string, string> = {};

  // Split on newlines OR semicolons
  const lines = raw.split(/[\n;]+/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Formato "Dia: horário" — colon separator
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const day = line.slice(0, colonIdx).trim();
      const time = line.slice(colonIdx + 1).trim();
      if (day && time) {
        hours[day] = time;
        continue;
      }
    }
    // Formato "Dia – horário" — dash/en-dash separator
    const dashMatch = line.match(/^(.+?)\s*[\–\-]\s*(.+)$/);
    if (dashMatch) {
      const day = dashMatch[1].trim();
      const time = dashMatch[2].trim();
      if (day && time) hours[day] = time;
    }
  }

  return hours;
}
