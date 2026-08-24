// ============================================================
// Cartão de visita — SVG pronto para impressão
// ------------------------------------------------------------
// 90×50mm (padrão brasileiro) + 3mm de sangria em cada lado.
// Frente: logo e nome. Verso: contatos e prova social.
// Usa o mesmo DesignKit da landing page, então cartão e site
// saem com a mesma cara.
// ============================================================

import { Lead } from "@/lib/types";
import { DesignKit, buildDesignKit, needsLogoChip } from "@/lib/design/kit";
import { isLight } from "@/lib/design/color";
import { sanitizePhone } from "@/lib/crawler/fieldGuards";
import { kitInputFromLead } from "@/lib/design/seed";
import { escapeHtml, slugify } from "./text";

/** Milímetros → unidades do SVG (1 unidade = 1mm) */
export const CARD = {
  width: 90,
  height: 50,
  bleed: 3,
  safe: 5,
};

const TOTAL_WIDTH = CARD.width + CARD.bleed * 2;
const TOTAL_HEIGHT = CARD.height + CARD.bleed * 2;

export interface BusinessCard {
  front: string;
  back: string;
}

/** Quebra o texto em linhas de no máximo `max` caracteres, sem cortar palavra */
export function wrapText(text: string, max: number, maxLines = 2): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= max) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === 0) return [text.slice(0, max)];

  // Sobrou texto? sinaliza com reticências na última linha
  const used = lines.join(" ").length;
  if (used < text.length - 1 && lines.length === maxLines) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, max - 1)}…`;
  }

  return lines;
}

/**
 * Tamanho da fonte do nome conforme o comprimento — nome longo encolhe
 * em vez de estourar a margem de segurança do cartão.
 */
export function nameFontSize(name: string): number {
  if (name.length <= 14) return 7.5;
  if (name.length <= 22) return 6;
  if (name.length <= 32) return 5;
  return 4.2;
}

function iconPath(name: "phone" | "pin" | "instagram" | "facebook" | "star" | "globe"): string {
  const paths: Record<string, string> = {
    phone:
      "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
    pin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    instagram:
      "M12 2c2.7 0 3 0 4.1.1 1 0 1.7.2 2.3.4.6.2 1.1.5 1.6 1s.8 1 1 1.6c.2.6.4 1.3.4 2.3.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c0 1-.2 1.7-.4 2.3-.2.6-.5 1.1-1 1.6s-1 .8-1.6 1c-.6.2-1.3.4-2.3.4-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1 0-1.7-.2-2.3-.4-.6-.2-1.1-.5-1.6-1s-.8-1-1-1.6c-.2-.6-.4-1.3-.4-2.3C2 15 2 14.7 2 12s0-3 .1-4.1c0-1 .2-1.7.4-2.3.2-.6.5-1.1 1-1.6s1-.8 1.6-1c.6-.2 1.3-.4 2.3-.4C8.5 2 8.8 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM17.8 6.9a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z",
    facebook:
      "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z",
    star: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z",
    globe:
      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0c2.8 3 4.2 6.3 4.2 10S14.8 19 12 22c-2.8-3-4.2-6.3-4.2-10S9.2 5 12 2zM2.5 9h19M2.5 15h19",
  };
  return paths[name];
}

/** Ícone posicionado e escalado de 24px para `size` mm */
function icon(
  name: Parameters<typeof iconPath>[0],
  x: number,
  y: number,
  size: number,
  color: string,
  filled = false
): string {
  const scale = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${scale.toFixed(4)})" ${
    filled
      ? `fill="${color}" stroke="none"`
      : `fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`
  }><path d="${iconPath(name)}"/></g>`;
}

function logoOrInitials(
  lead: Lead,
  kit: DesignKit,
  x: number,
  y: number,
  height: number,
  onDark: boolean,
  background: string
): string {
  const maxWidth = Math.min(height * Math.max(kit.logoFit.aspect, 1) * 1.1, 52);

  if (lead.logoUrl) {
    // Mesma regra do site: logo que sumiria no fundo ganha pastilha clara
    const chip = needsLogoChip(
      {
        logoUrl: lead.logoUrl,
        logoHasAlpha: lead.logoHasAlpha,
        logoLuminance: lead.logoLuminance,
      },
      background
    );
    // A pastilha precisa contrastar com o desenho, não com o cartão:
    // logo claro sobre cartão claro pede placa escura, e vice-versa.
    const inkIsLight = (lead.logoLuminance ?? 0.5) > 0.72;
    const plateFill = isLight(background) && inkIsLight ? kit.palette.primaryDark : "#ffffff";

    const pad = height * 0.16;
    const plate = chip
      ? `<rect x="${(x - pad).toFixed(1)}" y="${(y - pad).toFixed(1)}" width="${(
          maxWidth +
          pad * 2
        ).toFixed(1)}" height="${(height + pad * 2).toFixed(1)}" rx="${(
          height * 0.18
        ).toFixed(1)}" fill="${plateFill}"/>`
      : "";

    // `preserveAspectRatio` mantém o desenho inteiro dentro da caixa
    return `${plate}<image href="${escapeHtml(
      lead.logoUrl
    )}" x="${x}" y="${y}" width="${maxWidth.toFixed(
      1
    )}" height="${height}" preserveAspectRatio="xMinYMid meet"/>`;
  }

  const initials =
    lead.title
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || lead.title.slice(0, 2).toUpperCase();

  return `<g>
      <rect x="${x}" y="${y}" width="${height}" height="${height}" rx="${
        height * 0.22
      }" fill="${onDark ? "rgba(255,255,255,0.2)" : kit.palette.primary}"/>
      <text x="${x + height / 2}" y="${y + height * 0.68}" text-anchor="middle"
        font-family="${escapeHtml(kit.fonts.heading)}, sans-serif" font-weight="800"
        font-size="${(height * 0.44).toFixed(1)}" fill="${
          onDark ? "#ffffff" : kit.palette.onPrimary
        }">${escapeHtml(initials)}</text>
    </g>`;
}

function cardShell(inner: string, background: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL_WIDTH}mm" height="${TOTAL_HEIGHT}mm" viewBox="0 0 ${TOTAL_WIDTH} ${TOTAL_HEIGHT}">
  <rect width="${TOTAL_WIDTH}" height="${TOTAL_HEIGHT}" fill="${background}"/>
  <g transform="translate(${CARD.bleed} ${CARD.bleed})">
${inner}
  </g>
</svg>`;
}

export function buildCardFront(lead: Lead, kit: DesignKit): string {
  const p = kit.palette;
  const nameSize = nameFontSize(lead.title);
  const cityName = lead.city.split(",")[0].trim();

  const inner = `    <rect width="${CARD.width}" height="${CARD.height}" fill="url(#brandGradient)"/>
    <defs>
      <linearGradient id="brandGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${p.primaryDark}"/>
        <stop offset="60%" stop-color="${p.primary}"/>
        <stop offset="100%" stop-color="${p.primary}"/>
      </linearGradient>
    </defs>
    <circle cx="${CARD.width - 6}" cy="${CARD.height - 4}" r="16" fill="${
      p.accent
    }" opacity="0.18"/>
${logoOrInitials(lead, kit, CARD.safe, CARD.safe + 2, 13, true, p.primary)}
    <text x="${CARD.safe}" y="${CARD.safe + 26}" font-family="${escapeHtml(
      kit.fonts.heading
    )}, sans-serif" font-weight="800" font-size="${nameSize}" fill="#ffffff">${escapeHtml(
      lead.title
    )}</text>
    <text x="${CARD.safe}" y="${CARD.safe + 32}" font-family="${escapeHtml(
      kit.fonts.body
    )}, sans-serif" font-size="3.2" letter-spacing="0.6" fill="#ffffff" opacity="0.82">${escapeHtml(
      lead.category.toUpperCase()
    )} · ${escapeHtml(cityName.toUpperCase())}</text>
    <rect x="${CARD.safe}" y="${CARD.height - 12}" width="14" height="1.1" rx="0.55" fill="${
      p.accent
    }"/>`;

  return cardShell(inner, p.primaryDark);
}

export function buildCardBack(lead: Lead, kit: DesignKit): string {
  const p = kit.palette;
  const cityName = lead.city.split(",")[0].trim();
  const addressLines = wrapText(`${lead.address}, ${cityName}`, 34, 2);

  const rows: string[] = [];
  let y = CARD.safe + 9;
  const push = (
    name: Parameters<typeof iconPath>[0],
    text: string,
    filled = false
  ) => {
    rows.push(
      icon(name, CARD.safe, y - 3.4, 4.2, p.primary, filled),
      `<text x="${CARD.safe + 6.5}" y="${y}" font-family="${escapeHtml(
        kit.fonts.body
      )}, sans-serif" font-size="3.4" fill="${p.text}">${escapeHtml(text)}</text>`
    );
    y += 6.4;
  };

  const telefone = sanitizePhone(lead.phone);
  if (telefone) push("phone", telefone);

  rows.push(
    icon("pin", CARD.safe, y - 3.4, 4.2, p.primary),
    ...addressLines.map(
      (line, i) =>
        `<text x="${CARD.safe + 6.5}" y="${y + i * 4.2}" font-family="${escapeHtml(
          kit.fonts.body
        )}, sans-serif" font-size="3.4" fill="${p.text}">${escapeHtml(line)}</text>`
    )
  );
  y += addressLines.length * 4.2 + 2.2;

  if (lead.instagramHandle) push("instagram", `@${lead.instagramHandle}`, true);
  if (lead.facebookHandle) push("facebook", `/${lead.facebookHandle}`, true);

  const ratingBlock =
    lead.reviewsCount > 0
      ? `<g transform="translate(${CARD.width - CARD.safe - 26} ${CARD.safe + 2})">
      <rect width="26" height="12" rx="2.5" fill="${p.primaryLight}"/>
      ${icon("star", 2.5, 3.2, 5, p.accent, true)}
      <text x="9" y="7.4" font-family="${escapeHtml(
        kit.fonts.heading
      )}, sans-serif" font-weight="700" font-size="4.4" fill="${p.brandText}">${lead.rating.toFixed(
        1
      )}</text>
      <text x="9" y="10.4" font-family="${escapeHtml(
        kit.fonts.body
      )}, sans-serif" font-size="2.4" fill="${p.textMuted}">${
        lead.reviewsCount
      } avaliações</text>
    </g>`
      : "";

  const inner = `    <rect width="${CARD.width}" height="${CARD.height}" fill="${p.card}"/>
    <rect width="${CARD.width}" height="2" fill="${p.primary}"/>
${logoOrInitials(lead, kit, CARD.safe, CARD.height - CARD.safe - 9, 9, false, p.card)}
${ratingBlock}
${rows.join("\n")}
    <text x="${CARD.width - CARD.safe}" y="${
      CARD.height - CARD.safe - 1
    }" text-anchor="end" font-family="${escapeHtml(
      kit.fonts.body
    )}, sans-serif" font-size="2.6" fill="${p.textMuted}">Atendimento pelo WhatsApp</text>`;

  return cardShell(inner, p.card);
}

export function buildBusinessCard(lead: Lead, kit?: DesignKit): BusinessCard {
  const resolved = kit ?? buildDesignKit(kitInputFromLead(lead));

  return {
    front: buildCardFront(lead, resolved),
    back: buildCardBack(lead, resolved),
  };
}

export function businessCardFiles(lead: Lead, kit?: DesignKit) {
  const card = buildBusinessCard(lead, kit);
  const slug = slugify(lead.title);
  return [
    { name: `cartao-${slug}-frente.svg`, content: card.front },
    { name: `cartao-${slug}-verso.svg`, content: card.back },
  ];
}
