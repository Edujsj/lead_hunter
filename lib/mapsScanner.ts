// ============================================================
// MÓDULO 2: Motor de Busca / Scraping (Mock Inteligente)
// ============================================================
// ⚠️  MODO DEMO: Dados simulados para demonstração da interface.
// Para dados reais do Google Maps, integre com Serper.dev ou Outscraper API
// (veja o bloco comentado no final deste arquivo).

import { Lead, UrlStatus } from "./types";

// ─── Mapeamento UF → DDDs válidos da região ──────────────────────────────────
const UF_DDD: Record<string, number[]> = {
  SP: [11, 12, 13, 14, 15, 16, 17, 18, 19],
  RJ: [21, 22, 24],
  ES: [27, 28],
  MG: [31, 32, 33, 34, 35, 37, 38],
  BA: [71, 73, 74, 75, 77],
  SE: [79],
  PE: [81, 87],
  AL: [82],
  PB: [83],
  RN: [84],
  CE: [85, 88],
  PI: [86, 89],
  MA: [98, 99],
  PA: [91, 93, 94],
  AM: [92, 97],
  AC: [68],
  RO: [69],
  RR: [95],
  AP: [96],
  TO: [63],
  PR: [41, 42, 43, 44, 45, 46],
  SC: [47, 48, 49],
  RS: [51, 53, 54, 55],
  MS: [67],
  MT: [65, 66],
  GO: [62, 64],
  DF: [61],
};

const FALLBACK_DDDS = [11, 21, 31, 41, 51, 61, 71, 81];

/** Extrai a sigla do estado da string "Cidade, UF" */
function extractUF(city: string): string | null {
  const parts = city.split(",");
  if (parts.length < 2) return null;
  return parts[parts.length - 1].trim().toUpperCase().slice(0, 2);
}

/** Retorna um DDD válido para a UF informada */
function getDDDForCity(city: string): number {
  const uf = extractUF(city);
  if (uf && UF_DDD[uf]) {
    const ddds = UF_DDD[uf];
    return ddds[Math.floor(Math.random() * ddds.length)];
  }
  return FALLBACK_DDDS[Math.floor(Math.random() * FALLBACK_DDDS.length)];
}

// ─── Nomes de empresas ────────────────────────────────────────────────────────
const SOBRENOMES = [
  "Silva", "Santos", "Oliveira", "Costa", "Souza", "Lima",
  "Pereira", "Ferreira", "Rodrigues", "Almeida", "Gomes",
  "Martins", "Araújo", "Carvalho", "Nascimento",
];

const SUFIXOS = [
  "Prime", "Plus", "Master", "Elite", "Top", "Express",
  "Central", "Popular", "Premium", "Pro", "Max", "Gold", "VIP",
];

const PREFIXOS = [
  "Clínica", "Consultório", "Centro", "Espaço", "Studio",
  "Instituto", "Casa", "Grupo",
];

// ─── Logradouros genéricos ────────────────────────────────────────────────────
const LOGRADOUROS = [
  "Rua das Flores", "Av. Brasil", "Rua 7 de Setembro",
  "Av. Getúlio Vargas", "Rua dos Andradas", "Av. Independência",
  "Rua Major Prado", "Rua Tiradentes", "Av. João Pessoa",
  "Rua da Saudade", "Av. Rio Branco", "Rua São João",
  "Rua XV de Novembro", "Av. das Nações", "Rua Marechal Deodoro",
];

const STATUS_WEIGHTS: { status: UrlStatus; weight: number }[] = [
  { status: "NO_SITE", weight: 30 },
  { status: "REDIRECTS_TO_WHATSAPP", weight: 25 },
  { status: "REDIRECTS_TO_SOCIAL", weight: 15 },
  { status: "SITE_OFFLINE", weight: 10 },
  { status: "VALID_SITE", weight: 20 },
];

function weightedRandom<T>(items: { status: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.status;
  }
  return items[items.length - 1].status;
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Gera nome de empresa baseado no nicho pesquisado */
function generateCompanyName(niche: string): string {
  const n = niche.charAt(0).toUpperCase() + niche.slice(1);
  switch (randomBetween(0, 3)) {
    case 0: return `${pick(PREFIXOS)} ${n} ${pick(SOBRENOMES)}`;
    case 1: return `${n} ${pick(SOBRENOMES)}`;
    case 2: return `${n} ${pick(SUFIXOS)}`;
    default: return `${pick(SOBRENOMES)} ${n}`;
  }
}

/** Gera telefone com DDD correto para a cidade pesquisada */
function generatePhone(city: string): string {
  const ddd = getDDDForCity(city);
  const num = `9${randomBetween(1000, 9999)}-${randomBetween(1000, 9999)}`;
  return `(${ddd}) ${num}`;
}

function generateWebsite(status: UrlStatus, company: string): string | undefined {
  const slug = company
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
  switch (status) {
    case "NO_SITE": return undefined;
    case "REDIRECTS_TO_WHATSAPP": return `https://wa.me/5511${randomBetween(900000000, 999999999)}`;
    case "REDIRECTS_TO_SOCIAL": return `https://instagram.com/${slug}`;
    case "SITE_OFFLINE": return `http://${slug}.com.br`;
    case "VALID_SITE": return `https://www.${slug}.com.br`;
  }
}

function generateLeads(niche: string, city: string, count: number): Lead[] {
  // Extrai só o nome da cidade (remove ", UF")
  const cityName = city.split(",")[0].trim() || city;

  return Array.from({ length: count }, (_, i) => {
    const title = generateCompanyName(niche);
    const phone = generatePhone(city); // usa DDD correto para a UF
    const analyzedStatus = weightedRandom(STATUS_WEIGHTS);
    const originalWebsite = generateWebsite(analyzedStatus, title);
    const logradouro = pick(LOGRADOUROS);
    const num = randomBetween(10, 999);

    return {
      id: `lead-${Date.now()}-${i}`,
      title,
      phone,
      address: `${logradouro}, ${num}`,
      city: cityName,           // sempre a cidade buscada
      rating: parseFloat((randomBetween(28, 50) / 10).toFixed(1)),
      reviewsCount: randomBetween(3, 340),
      category: niche.charAt(0).toUpperCase() + niche.slice(1),
      originalWebsite,
      analyzedStatus,
      analyzedAt: new Date().toISOString(),
    };
  });
}

/**
 * ─── MODO DEMO ────────────────────────────────────────────────────────────────
 * Retorna dados simulados para demonstração da interface.
 *
 * ─── PRODUÇÃO: Serper.dev ─────────────────────────────────────────────────────
 * Descomente e configure SERPER_API_KEY no .env.local para usar dados reais:
 *
 * import axios from "axios";
 * export async function scanMaps(niche: string, city: string): Promise<Lead[]> {
 *   const res = await axios.post(
 *     "https://google.serper.dev/places",
 *     { q: `${niche} em ${city}`, gl: "br", hl: "pt-br" },
 *     { headers: { "X-API-KEY": process.env.SERPER_API_KEY } }
 *   );
 *   return res.data.places.map((p: SerperPlace) => ({
 *     id: p.cid,
 *     title: p.title,
 *     phone: p.phoneNumber ?? "",
 *     address: p.address ?? "",
 *     city: city.split(",")[0].trim(),
 *     rating: p.rating ?? 0,
 *     reviewsCount: p.ratingCount ?? 0,
 *     category: niche,
 *     originalWebsite: p.website,
 *     analyzedStatus: "NO_SITE",   // passar pelo urlAnalyzer
 *     analyzedAt: new Date().toISOString(),
 *   }));
 * }
 */
export async function scanMaps(niche: string, city: string): Promise<Lead[]> {
  // Simula latência de API real (0.8s – 1.4s)
  await new Promise((r) => setTimeout(r, 800 + randomBetween(0, 600)));
  const count = randomBetween(18, 28);
  return generateLeads(niche, city, count);
}
