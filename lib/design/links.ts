// ============================================================
// Links do cartão online — a mesma lista alimenta o componente
// React e o HTML exportado, então os dois nunca divergem.
// ============================================================

import { Lead } from "@/lib/types";
import { sanitizePhone } from "@/lib/crawler/fieldGuards";
import { resolveContact } from "@/lib/crawler/whatsappFinder";

export type LinkKind =
  | "whatsapp"
  | "phone"
  | "instagram"
  | "facebook"
  | "website"
  | "maps";

export interface CardLink {
  kind: LinkKind;
  label: string;
  sublabel?: string;
  href: string;
  /** Destaque visual: o CTA principal do cartão */
  primary?: boolean;
}

export function digitsOnly(phone: string): string {
  // Passa pela guarda antes: rótulo de botão gravado como telefone não pode
  // virar link de WhatsApp.
  return sanitizePhone(phone).replace(/\D/g, "");
}

/**
 * Monta os links na ordem de conversão: falar agora vem antes de
 * "conheça mais". Só entra o que a empresa realmente tem.
 */
export function buildCardLinks(lead: Lead): CardLink[] {
  const links: CardLink[] = [];

  // O botão de WhatsApp usa o número que a empresa publicou para esse fim
  // (pode ser diferente do telefone geral, que às vezes é só um fixo).
  const contato = resolveContact(lead);
  if (contato.hasWhatsApp) {
    const numeroExibido = lead.whatsappNumber || lead.phone;
    links.push({
      kind: "whatsapp",
      label: "Chamar no WhatsApp",
      sublabel: numeroExibido,
      href: `https://wa.me/${contato.digits}`,
      primary: true,
    });
  }

  const phone = digitsOnly(lead.phone);
  if (phone.length >= 10) {
    links.push({
      kind: "phone",
      label: "Ligar agora",
      sublabel: lead.phone,
      href: `tel:+55${phone}`,
    });
  }

  if (lead.instagramHandle) {
    links.push({
      kind: "instagram",
      label: "Instagram",
      sublabel: `@${lead.instagramHandle}`,
      href: `https://instagram.com/${lead.instagramHandle}`,
    });
  }

  if (lead.facebookHandle) {
    links.push({
      kind: "facebook",
      label: "Facebook",
      sublabel: `/${lead.facebookHandle}`,
      href: `https://facebook.com/${lead.facebookHandle}`,
    });
  }

  // Site só entra se for site de verdade — link de rede social já está acima
  const site = lead.originalWebsite;
  const isRealSite =
    site &&
    !/instagram\.com|facebook\.com|wa\.me|whatsapp\.com|linktr\.ee|beacons\.ai/i.test(site);
  if (isRealSite) {
    links.push({
      kind: "website",
      label: "Site oficial",
      sublabel: site.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      href: site.startsWith("http") ? site : `https://${site}`,
    });
  }

  if (lead.address) {
    const query = encodeURIComponent(`${lead.title}, ${lead.address}, ${lead.city}`);
    links.push({
      kind: "maps",
      label: "Como chegar",
      sublabel: `${lead.address}, ${lead.city.split(",")[0].trim()}`,
      href: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
  }

  return links;
}

/** Caminhos SVG (viewBox 24) por tipo de link — sem dependência de ícone */
export const LINK_ICON_PATHS: Record<LinkKind, string> = {
  whatsapp:
    "M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm5.5 14.4c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .3-3.3-.7-2.8-1.2-4.5-4-4.6-4.2-.2-.2-1.1-1.4-1.1-2.7s.7-1.9 1-2.2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.5-.3.3c-.1.1-.2.3-.1.5.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.4.2.1.4 0 .5-.1l.8-1c.2-.2.3-.2.5-.1l2 1c.2.1.4.2.4.3 0 .2 0 .7-.3 1.2z",
  phone:
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.1 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  instagram:
    "M12 2c2.7 0 3 0 4.1.1 1 0 1.7.2 2.3.4.6.2 1.1.5 1.6 1s.8 1 1 1.6c.2.6.4 1.3.4 2.3.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c0 1-.2 1.7-.4 2.3-.2.6-.5 1.1-1 1.6s-1 .8-1.6 1c-.6.2-1.3.4-2.3.4-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1 0-1.7-.2-2.3-.4-.6-.2-1.1-.5-1.6-1s-.8-1-1-1.6c-.2-.6-.4-1.3-.4-2.3C2 15 2 14.7 2 12s0-3 .1-4.1c0-1 .2-1.7.4-2.3.2-.6.5-1.1 1-1.6s1-.8 1.6-1c.6-.2 1.3-.4 2.3-.4C8.5 2 8.8 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM17.8 6.9a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z",
  facebook:
    "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z",
  website:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0c2.8 3 4.2 6.3 4.2 10S14.8 19 12 22c-2.8-3-4.2-6.3-4.2-10S9.2 5 12 2zM2.5 9h19M2.5 15h19",
  maps: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zm-9 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};

/** Ícones que devem ser pintados (sólidos) em vez de contornados */
export const FILLED_ICONS: LinkKind[] = ["whatsapp", "instagram", "facebook"];
