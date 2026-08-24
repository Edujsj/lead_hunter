// ============================================================
// WhatsApp Finder — o número que a EMPRESA publicou para contato
// ------------------------------------------------------------
// Escopo deliberadamente limitado: isto lê canais que o próprio
// negócio tornou públicos para ser contatado — link "chamar no
// WhatsApp" do Maps, botão de WhatsApp do site, número na bio do
// Instagram/Facebook. Não tenta identificar o proprietário como
// pessoa física nem cruza fontes para achar o número pessoal dele;
// isso seria agregação de dado pessoal, não contato comercial.
//
// O Maps às vezes só tem telefone fixo, mas o dono divulga um
// WhatsApp diferente em outro canal — por isso vale ler os quatro
// lugares e não só confiar no campo "telefone" do card.
// ============================================================

import { sanitizePhone } from "./fieldGuards";

export type WhatsAppSource =
  | "maps_phone"
  | "maps_website_link"
  | "website"
  | "instagram_bio"
  | "facebook";

export interface WhatsAppCandidate {
  /** Formatado, ex. "(19) 99385-4476" */
  number: string;
  e164: string;
  source: WhatsAppSource;
}

/** Link de clique-para-conversar: wa.me/<n>, api.whatsapp.com/send?phone=<n> */
const WA_LINK_RE =
  /(?:wa\.me\/|whatsapp\.com\/send\?[^"'\s]*?phone=)\+?(\d{10,14})/gi;

/** "whatsapp: (11) 98888-7777" / "zap 11 98888-7777" — texto solto, sem link */
const WA_MENTION_RE =
  /(?:whats\s*app|whatsapp|\bzap\b|\bwpp\b)[^\d]{0,12}(\+?\d[\d\s().-]{9,17}\d)/gi;

function toE164(local: string): string {
  return `+55${local.replace(/\D/g, "")}`;
}

/** Todos os números de link wa.me/api.whatsapp.com num texto, já validados */
export function extractWaMeNumbers(text: string): string[] {
  if (!text) return [];
  const achados: string[] = [];
  for (const m of text.matchAll(WA_LINK_RE)) {
    const valido = sanitizePhone(m[1]);
    if (valido) achados.push(valido);
  }
  return Array.from(new Set(achados));
}

/** Menções textuais tipo "whatsapp: (11) 98888-7777", sem link explícito */
export function extractWaMentions(text: string): string[] {
  if (!text) return [];
  const achados: string[] = [];
  for (const m of text.matchAll(WA_MENTION_RE)) {
    const valido = sanitizePhone(m[1]);
    if (valido) achados.push(valido);
  }
  return Array.from(new Set(achados));
}

/** Primeiro número válido encontrado num texto (link tem prioridade sobre menção) */
export function findWhatsAppNumberInText(text: string): string | null {
  const doLink = extractWaMeNumbers(text);
  if (doLink[0]) return doLink[0];
  const daMencao = extractWaMentions(text);
  return daMencao[0] ?? null;
}

/**
 * Junta candidatos de todas as fontes disponíveis, na ordem de prioridade
 * abaixo, e devolve o melhor. Um link wa.me é o sinal mais forte que existe:
 * a empresa gerou aquele link especificamente para receber mensagem — vale
 * mais que o telefone genérico do Maps, que pode ser um fixo sem WhatsApp.
 */
export interface WhatsAppSourceTexts {
  /** Se o "site" do Maps for na verdade um link wa.me (REDIRECTS_TO_WHATSAPP) */
  mapsWebsiteLink?: string;
  /** Telefone já validado extraído do card/painel do Maps */
  mapsPhone?: string;
  /** Textos e hrefs coletados do site oficial */
  websiteTexts?: string[];
  /** Bio do Instagram */
  instagramBio?: string;
  /** Texto público da página do Facebook */
  facebookText?: string;
}

const PRIORIDADE: WhatsAppSource[] = [
  "maps_website_link",
  "website",
  "instagram_bio",
  "facebook",
  "maps_phone",
];

export function collectWhatsAppCandidates(
  input: WhatsAppSourceTexts
): WhatsAppCandidate[] {
  const porFonte: Partial<Record<WhatsAppSource, string>> = {};

  if (input.mapsWebsiteLink) {
    const n = findWhatsAppNumberInText(input.mapsWebsiteLink);
    if (n) porFonte.maps_website_link = n;
  }
  if (input.websiteTexts?.length) {
    const n = findWhatsAppNumberInText(input.websiteTexts.join(" \n "));
    if (n) porFonte.website = n;
  }
  if (input.instagramBio) {
    const n = findWhatsAppNumberInText(input.instagramBio);
    if (n) porFonte.instagram_bio = n;
  }
  if (input.facebookText) {
    const n = findWhatsAppNumberInText(input.facebookText);
    if (n) porFonte.facebook = n;
  }
  if (input.mapsPhone) {
    const n = sanitizePhone(input.mapsPhone);
    if (n) porFonte.maps_phone = n;
  }

  return PRIORIDADE.filter((fonte) => porFonte[fonte]).map((fonte) => ({
    number: porFonte[fonte] as string,
    e164: toE164(porFonte[fonte] as string),
    source: fonte,
  }));
}

export function resolveWhatsApp(
  input: WhatsAppSourceTexts
): WhatsAppCandidate | null {
  return collectWhatsAppCandidates(input)[0] ?? null;
}

// ─── Uso pelos renderers — um único lugar decide qual número vira o botão ────

export interface ContactSource {
  phone?: string;
  whatsappNumber?: string;
}

export interface ResolvedContact {
  /** Dígitos com DDI, prontos para `wa.me/` */
  digits: string;
  hasWhatsApp: boolean;
}

/**
 * Todo lugar que monta um link `wa.me/55...` chama isto em vez de ler
 * `lead.phone` direto — evita que sete arquivos repitam a mesma regra de
 * "usa o WhatsApp publicado, senão cai para o telefone geral".
 */
export function resolveContact(lead: ContactSource): ResolvedContact {
  const preferido = sanitizePhone(lead.whatsappNumber ?? "") || sanitizePhone(lead.phone ?? "");
  const local = preferido.replace(/\D/g, "");
  return { digits: local ? `55${local}` : "", hasWhatsApp: local.length >= 10 };
}
