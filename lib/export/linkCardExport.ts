// ============================================================
// Cartão online exportado — versão estática do LinkCard
// ------------------------------------------------------------
// Mesma lista de links e mesmo DesignKit do componente React.
// Vai para `cartao/` dentro do ZIP: uma página só, publicável
// em qualquer lugar, com as animações em CSS puro.
// ============================================================

import { Lead } from "@/lib/types";
import { DesignKit, buildDesignKit } from "@/lib/design/kit";
import { kitInputFromLead } from "@/lib/design/seed";
import {
  FILLED_ICONS,
  LINK_ICON_PATHS,
  buildCardLinks,
} from "@/lib/design/links";
import { escapeHtml } from "./text";
import type { ZipEntry } from "./zip";

function initialsOf(title: string): string {
  return (
    title
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || title.slice(0, 2).toUpperCase()
  );
}

export function buildLinkCardHtml(lead: Lead, kit: DesignKit): string {
  const links = buildCardLinks(lead);
  const cityName = lead.city.split(",")[0].trim();
  const avatar = lead.logoUrl
    ? `<img src="${escapeHtml(lead.logoUrl)}" alt="Logo ${escapeHtml(lead.title)}">`
    : `<span class="initials">${escapeHtml(initialsOf(lead.title))}</span>`;

  const stars = Array.from({ length: 5 }, (_, i) =>
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="${
      i < Math.round(lead.rating) ? "#fbbf24" : "none"
    }" stroke="${i < Math.round(lead.rating) ? "#fbbf24" : "rgba(255,255,255,.35)"}" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
  ).join("");

  const linkItems = links
    .map((link, i) => {
      const filled = FILLED_ICONS.includes(link.kind);
      const icon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="${
        filled ? "currentColor" : "none"
      }" stroke="${
        filled ? "none" : "currentColor"
      }" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${
        LINK_ICON_PATHS[link.kind]
      }"/></svg>`;

      return `      <a class="link${link.primary ? " primary" : ""}" style="--i:${i}"
        href="${escapeHtml(link.href)}"${
          link.href.startsWith("tel:") ? "" : ' target="_blank" rel="noopener"'
        }>
        <span class="link-icon">${icon}</span>
        <span class="link-text">
          <strong>${escapeHtml(link.label)}</strong>
          ${link.sublabel ? `<small>${escapeHtml(link.sublabel)}</small>` : ""}
        </span>
      </a>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(lead.title)} — Contato</title>
  <meta name="description" content="Fale com a ${escapeHtml(
    lead.title
  )}, ${escapeHtml(lead.category)} em ${escapeHtml(cityName)}.">
  <meta name="theme-color" content="${kit.palette.primary}">
  <meta property="og:title" content="${escapeHtml(lead.title)}">
  <meta property="og:description" content="${escapeHtml(lead.category)} em ${escapeHtml(
    cityName
  )}">
  ${lead.logoUrl ? `<link rel="icon" href="${escapeHtml(lead.logoUrl)}">` : ""}
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${escapeHtml(kit.fonts.googleHref)}">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>

  <main>
    <div class="avatar">${avatar}</div>
    <h1>${escapeHtml(lead.title)}</h1>
    <p class="tagline">${escapeHtml(lead.category)} · ${escapeHtml(cityName)}</p>
    ${
      lead.reviewsCount > 0
        ? `<div class="rating">${stars}<strong>${lead.rating.toFixed(
            1
          )}</strong><span>(${lead.reviewsCount})</span></div>`
        : ""
    }

    <nav class="links">
${linkItems}
    </nav>

    <p class="address">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      ${escapeHtml(lead.address)}, ${escapeHtml(cityName)}
    </p>
  </main>
</body>
</html>
`;
}

export function buildLinkCardCss(kit: DesignKit): string {
  const p = kit.palette;
  const radius = kit.radius.pill === "999px" ? "999px" : kit.radius.md;

  return `/* Cartão online de ${kit.archetypeLabel} — gerado pelo Maps Lead Hunter */
:root {
  --primary: ${p.primary};
  --accent: ${p.accent};
  --on-accent: ${p.onAccent};
  --font-heading: ${kit.fonts.headingStack};
  --font-body: ${kit.fonts.bodyStack};
}

*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0; min-height: 100vh;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 48px 20px;
  background: ${kit.gradients.hero};
  font-family: var(--font-body);
  color: #fff;
  overflow-x: hidden;
  position: relative;
}

/* Manchas de luz respirando ao fundo */
.blob {
  position: fixed; border-radius: 50%; filter: blur(70px);
  opacity: .14; pointer-events: none;
  animation: breathe 9s ease-in-out infinite;
}
.b1 { width: 260px; height: 260px; left: 8%;  top: 6%;  background: #fff; }
.b2 { width: 350px; height: 350px; left: 62%; top: 34%; background: var(--accent); animation-delay: -3s; }
.b3 { width: 440px; height: 440px; left: 30%; top: 72%; background: #fff; animation-delay: -6s; }
@keyframes breathe {
  0%, 100% { transform: scale(1);    opacity: .10; }
  50%      { transform: scale(1.18); opacity: .20; }
}

main {
  position: relative; z-index: 1;
  width: 100%; max-width: 460px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
}

.avatar {
  width: 132px; height: 132px;
  display: grid; place-items: center; overflow: hidden;
  border-radius: ${kit.shape === "sharp" ? kit.radius.lg : "50%"};
  background: #fff; border: 4px solid rgba(255,255,255,.55);
  box-shadow: 0 22px 60px rgba(0,0,0,.32);
  animation: rise .6s cubic-bezier(.22,1,.36,1) both;
}
.avatar img { width: 78%; height: 78%; object-fit: contain; }
.avatar .initials { font-family: var(--font-heading); font-weight: 900; font-size: 45px; color: var(--primary); }

h1 {
  font-family: var(--font-heading); font-size: 1.9rem; font-weight: 900;
  margin: 24px 0 0; line-height: 1.15;
  animation: rise .6s .12s cubic-bezier(.22,1,.36,1) both;
}
.tagline {
  margin: 8px 0 0; font-size: .78rem; letter-spacing: .2em; text-transform: uppercase;
  color: rgba(255,255,255,.72);
  animation: rise .6s .18s cubic-bezier(.22,1,.36,1) both;
}
.rating {
  display: inline-flex; align-items: center; gap: 8px; margin-top: 16px;
  padding: 8px 14px; border-radius: 999px; font-size: .88rem;
  background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.24);
  animation: rise .6s .24s cubic-bezier(.22,1,.36,1) both;
}
.rating span { color: rgba(255,255,255,.7); }

.links { width: 100%; display: flex; flex-direction: column; gap: 12px; margin-top: 32px; }
.link {
  display: flex; align-items: center; gap: 12px; text-align: left;
  padding: 14px 20px; min-height: 62px;
  border-radius: ${radius};
  background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.22);
  color: #fff; text-decoration: none;
  backdrop-filter: blur(6px);
  transition: transform .22s ease, background-color .22s ease, box-shadow .22s ease;
  animation: rise .55s cubic-bezier(.22,1,.36,1) both;
  animation-delay: calc(.3s + var(--i) * .07s);
}
.link:hover { transform: translateY(-2px) scale(1.03); background: rgba(255,255,255,.22); box-shadow: 0 14px 34px rgba(0,0,0,.24); }
.link:active { transform: scale(.98); }
.link:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.link.primary {
  background: var(--accent); color: var(--on-accent); border-color: transparent;
  box-shadow: 0 14px 34px rgba(0,0,0,.26);
}
.link.primary:hover { background: var(--accent); }
.link-icon {
  width: 40px; height: 40px; flex-shrink: 0;
  display: grid; place-items: center; border-radius: 999px;
  background: rgba(255,255,255,.18);
}
.link-text { min-width: 0; }
.link-text strong { display: block; font-size: .95rem; line-height: 1.2; }
.link-text small { display: block; font-size: .75rem; opacity: .75; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.address {
  display: flex; align-items: flex-start; gap: 8px; justify-content: center;
  margin-top: 32px; font-size: .78rem; color: rgba(255,255,255,.65);
  animation: rise .6s .8s cubic-bezier(.22,1,.36,1) both;
}

@keyframes rise {
  from { opacity: 0; transform: translateY(26px); }
  to   { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .blob { opacity: .12; }
}
`;
}

export function buildLinkCardFiles(lead: Lead, kit?: DesignKit): ZipEntry[] {
  const resolved = kit ?? buildDesignKit(kitInputFromLead(lead));
  return [
    { name: "cartao/index.html", content: buildLinkCardHtml(lead, resolved) },
    { name: "cartao/styles.css", content: buildLinkCardCss(resolved) },
  ];
}
