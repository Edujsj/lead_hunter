// ============================================================
// Exportador — gera o site estático (HTML + CSS + JS) do preview
// ------------------------------------------------------------
// Mesma fonte de verdade do preview React: o DesignKit. O que sai
// daqui é publicável em qualquer hospedagem estática, sem build.
// ============================================================

import { Lead } from "@/lib/types";
import { DesignKit, buildDesignKit } from "@/lib/design/kit";
import { kitInputFromLead } from "@/lib/design/seed";
import { businessCardFiles } from "./businessCard";
import { buildLinkCardFiles } from "./linkCardExport";
import { escapeHtml, slugify } from "./text";
import { ZipEntry } from "./zip";

export { escapeHtml, slugify } from "./text";

// ─── Ícones (SVG inline — nada de emoji, nada de CDN) ─────────────────────────
const ICONS: Record<string, string> = {
  phone:
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  shield:
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  award:
    '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
  quote:
    '<path d="M3 21c3 0 7-1 7-8V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3"/><path d="M14 21c3 0 7-1 7-8V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  zap: '<path d="M4 14h7l-2 8 9-12h-7l2-8z"/>',
  badge:
    '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76z"/><path d="m9 12 2 2 4-4"/>',
};

const ICON_BY_EMOJI: Record<string, string> = {
  "🏥": "shield", "😊": "badge", "👨‍👩‍👧": "badge", "🔍": "badge", "⚙️": "badge",
  "📋": "check", "🥗": "badge", "👨‍🍳": "award", "🚗": "zap", "✨": "award",
  "📅": "check", "🎨": "award", "🏋️": "zap", "👨‍🏫": "award", "🕐": "check",
  "❤️": "award", "💉": "shield", "🏨": "badge", "🧑‍⚕️": "shield", "🚚": "zap",
  "💳": "check", "📈": "zap", "⏰": "check", "💰": "award", "👩‍🏫": "award",
  "👥": "badge", "📚": "badge", "🏆": "award", "⚡": "zap", "💎": "award",
};

function icon(name: string, size = 20): string {
  const path = ICONS[name] ?? ICONS.badge;
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function starRow(rating: number): string {
  return `<span class="stars" aria-label="Nota ${rating} de 5">${Array.from(
    { length: 5 },
    (_, i) =>
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="${
        i < Math.round(rating) ? "currentColor" : "none"
      }" stroke="currentColor" stroke-width="2" aria-hidden="true">${ICONS.star}</svg>`
  ).join("")}</span>`;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

export function buildCss(kit: DesignKit): string {
  const p = kit.palette;
  return `/* ${kit.archetypeLabel} — gerado pelo Maps Lead Hunter
   Paleta e tipografia validadas para contraste WCAG AA. */

:root {
  --primary: ${p.primary};
  --primary-dark: ${p.primaryDark};
  --primary-light: ${p.primaryLight};
  --on-primary: ${p.onPrimary};
  --accent: ${p.accent};
  --on-accent: ${p.onAccent};
  --surface: ${p.surface};
  --surface-alt: ${p.surfaceAlt};
  --card: ${p.card};
  --text: ${p.text};
  --text-muted: ${p.textMuted};
  --border: ${p.border};
  --brand-text: ${p.brandText};

  --radius-sm: ${kit.radius.sm};
  --radius-md: ${kit.radius.md};
  --radius-lg: ${kit.radius.lg};
  --radius-pill: ${kit.radius.pill};

  --font-heading: ${kit.fonts.headingStack};
  --font-body: ${kit.fonts.bodyStack};

  --gradient-hero: ${kit.gradients.hero};
  --gradient-cta: ${kit.gradients.cta};
  --hero-overlay: ${kit.heroOverlay};
}

*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--surface);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
h1, h2, h3 { font-family: var(--font-heading); letter-spacing: -0.02em; line-height: 1.1; margin: 0; }
img { max-width: 100%; display: block; }
a { color: inherit; text-decoration: none; }
.container { max-width: 1060px; margin: 0 auto; padding: 0 24px; }
.icon { flex-shrink: 0; }
.stars { display: inline-flex; gap: 2px; color: #f59e0b; }

/* Botões — alvo de toque mínimo de 44px */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 14px 28px; min-height: 48px;
  border-radius: var(--radius-pill);
  font-weight: 700; font-size: 1rem; cursor: pointer;
  border: 2px solid transparent;
  transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease;
}
.btn:hover { transform: translateY(-2px); }
.btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
.btn-primary { background: var(--accent); color: var(--on-accent); box-shadow: 0 10px 30px rgba(0,0,0,.18); }
.btn-ghost { border-color: rgba(255,255,255,.45); color: #fff; background: rgba(255,255,255,.08); }
.btn-outline { border-color: var(--border); color: var(--text); }

/* Navegação */
.nav {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 12px 24px;
  background: var(--primary); color: var(--on-primary);
}
.nav-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.nav-brand img { height: ${kit.logoSizes.nav}px; width: auto; max-width: ${kit.logoFit.maxWidth.nav}px; object-fit: contain; }
/* Pastilha clara para logo com fundo sólido ou traço escuro demais */
.nav-brand img.chip, footer .brand img.chip {
  background: #fff; border-radius: var(--radius-sm);
  padding: 6px 10px; box-shadow: 0 2px 10px rgba(0,0,0,.16);
}
.nav-brand .name { font-family: var(--font-heading); font-weight: 700; font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nav .btn { padding: 10px 18px; font-size: .92rem; }

/* Lockup tipográfico quando não existe logo */
.lockup {
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--font-heading); font-weight: 900;
  background: rgba(255,255,255,.18); color: #fff;
  border-radius: var(--radius-sm);
}

/* Hero */
.hero { position: relative; }
.hero-media { position: absolute; inset: 0; overflow: hidden; }
.hero-media img { width: 100%; height: 100%; object-fit: cover; }
.hero-media::after { content: ""; position: absolute; inset: 0; background: var(--hero-overlay); }
.hero-fallback { position: absolute; inset: 0; background: var(--gradient-hero); }
.hero-content { position: relative; z-index: 2; padding: 88px 0; }
.hero-content.on-dark, .hero-content.on-dark h1 { color: #fff; }
.hero-logo {
  display: inline-flex; padding: 16px 20px; margin-bottom: 24px;
  background: rgba(255,255,255,.94); border-radius: var(--radius-lg);
  box-shadow: 0 14px 40px rgba(15,23,42,.22);
}
.hero-logo img { height: ${kit.logoSizes.hero}px; width: auto; max-width: ${kit.logoFit.maxWidth.hero}px; object-fit: contain; }
footer .brand img { max-width: ${kit.logoFit.maxWidth.footer}px; }
.hero h1 { font-size: clamp(2.1rem, 5.5vw, 3.6rem); margin-bottom: 16px; }
.hero .lead { font-size: clamp(1rem, 2.2vw, 1.25rem); max-width: 34rem; margin: 0 0 28px; }
.hero-content.on-dark .lead { color: rgba(255,255,255,.86); }
.rating-badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-radius: var(--radius-pill);
  background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.24);
  font-size: .92rem; color: #fff;
}
/* Hero claro: o mesmo selo precisa de fundo sólido para ser legível */
.rating-badge.on-light { background: var(--card); border-color: var(--border); color: var(--text); }
.hero-meta { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 30px; font-size: .95rem; }
.hero-meta span { display: inline-flex; align-items: center; gap: 8px; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; }

/* Hero dividido */
.hero-split { display: grid; grid-template-columns: 1fr; }
@media (min-width: 768px) { .hero-split { grid-template-columns: 1fr 1fr; } }
.hero-split .panel { background: var(--gradient-hero); padding: 72px 0; }
.hero-split .visual { min-height: 340px; position: relative; overflow: hidden; }

/* Hero editorial */
.hero-editorial { background: var(--surface); padding-top: 64px; text-align: center; }
.hero-editorial .hero-content { padding-bottom: 40px; }
.hero-editorial .lead, .hero-editorial .hero-meta, .hero-editorial .hero-actions { margin-left: auto; margin-right: auto; justify-content: center; }
.hero-editorial .frame { position: relative; height: 380px; border-radius: var(--radius-lg); overflow: hidden; margin-bottom: -64px; }

/* Barra de confiança */
.trust {
  position: relative; z-index: 10; display: flex; flex-wrap: wrap;
  gap: 20px 40px; align-items: center;
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 24px;
  box-shadow: 0 18px 50px rgba(15,23,42,.10);
}
.trust .score {
  width: 46px; height: 46px; display: grid; place-items: center;
  border-radius: var(--radius-sm); background: var(--primary-light);
  color: var(--brand-text); font-weight: 800;
}
.trust .item { display: flex; align-items: center; gap: 12px; color: var(--text-muted); font-size: .95rem; }
.trust .item svg { color: var(--brand-text); }

/* Seções */
section { padding: 72px 0; }
.section-label { font-size: .78rem; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--brand-text); }
.section-head { text-align: center; margin-bottom: 44px; }
.section-head h2 { font-size: clamp(1.7rem, 4vw, 2.4rem); margin: 12px 0; }
.section-head p { color: var(--text-muted); max-width: 34rem; margin: 0 auto; }
.band { background: var(--surface-alt); }

.grid { display: grid; gap: 16px; }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-2 { grid-template-columns: repeat(2, 1fr); }

.service {
  display: flex; align-items: center; gap: 12px; padding: 16px;
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-md);
  transition: box-shadow .2s ease, transform .2s ease;
}
.service:hover { box-shadow: 0 10px 26px rgba(15,23,42,.09); transform: translateY(-2px); }
.service .num {
  width: 36px; height: 36px; display: grid; place-items: center; flex-shrink: 0;
  border-radius: var(--radius-sm); background: var(--primary-light);
  color: var(--brand-text); font-weight: 700; font-size: .9rem;
}
.service:first-child { border-color: var(--primary); }
.service:first-child .num { background: var(--primary); color: var(--on-primary); }
.service .label { font-weight: 600; font-size: .95rem; }
.service .chev { margin-left: auto; color: var(--text-muted); opacity: .5; }

.gallery img { aspect-ratio: 1 / 1; object-fit: cover; width: 100%; border-radius: var(--radius-md); transition: transform .5s ease; }
.gallery a:hover img { transform: scale(1.05); }

.card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 26px; height: 100%;
}
.card .badge {
  width: 48px; height: 48px; display: grid; place-items: center; margin: 0 auto 16px;
  border-radius: var(--radius-sm); background: var(--primary-light); color: var(--brand-text);
}
.card h3 { font-size: 1.1rem; margin-bottom: 8px; }
.card p { color: var(--text-muted); font-size: .93rem; margin: 0; }
.card.center { text-align: center; }

.review { display: flex; flex-direction: column; gap: 12px; }
.review .who { display: flex; align-items: center; gap: 10px; border-top: 1px solid var(--border); padding-top: 12px; }
.review .avatar {
  width: 32px; height: 32px; display: grid; place-items: center; border-radius: var(--radius-pill);
  background: var(--primary); color: var(--on-primary); font-weight: 700; font-size: .8rem;
}
.review .who small { color: var(--text-muted); }

/* CTA final */
.cta { background: var(--gradient-cta); color: #fff; text-align: center; }
.cta h2 { font-size: clamp(1.8rem, 4.5vw, 2.5rem); margin-bottom: 12px; }
.cta p { color: rgba(255,255,255,.86); font-size: 1.1rem; margin: 0 auto 32px; max-width: 32rem; }
.cta .hero-actions { justify-content: center; }

/* Rodapé */
footer { background: var(--primary-dark); color: rgba(255,255,255,.72); padding: 36px 0; font-size: .9rem; }
footer .inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px; }
footer .brand { display: flex; align-items: center; gap: 12px; color: #fff; font-family: var(--font-heading); font-weight: 700; }
footer .brand img { height: ${kit.logoSizes.footer}px; width: auto; object-fit: contain; }
footer .links { display: flex; flex-wrap: wrap; gap: 18px; }
footer .links span, footer .links a { display: inline-flex; align-items: center; gap: 8px; }
footer a:hover { color: #fff; }

/* Botão flutuante do WhatsApp */
.fab {
  position: fixed; right: 20px; bottom: 20px; z-index: 50;
  display: inline-flex; align-items: center; gap: 10px;
  padding: 14px 22px; min-height: 48px;
  background: #25d366; color: #fff; font-weight: 700;
  border-radius: var(--radius-pill); box-shadow: 0 16px 40px rgba(37,211,102,.36);
  transition: transform .2s ease;
}
.fab:hover { transform: scale(1.05); }

/* Revelação no scroll */
.reveal { opacity: 0; transform: translateY(28px); transition: opacity .6s ease, transform .6s ease; }
.reveal.visible { opacity: 1; transform: none; }

@media (max-width: 900px) {
  .grid-3 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .grid-3, .grid-2 { grid-template-columns: 1fr; }
  .gallery.grid-3 { grid-template-columns: repeat(2, 1fr); }
  section { padding: 52px 0; }
  .hero-content { padding: 56px 0; }
  .nav .btn span.full { display: none; }
  .fab { right: 12px; bottom: 12px; padding: 12px 18px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .reveal { opacity: 1; transform: none; }
}
`;
}

// ─── JavaScript ───────────────────────────────────────────────────────────────

export function buildJs(): string {
  return `// Comportamento da página — sem dependências.
(function () {
  "use strict";

  // Ano corrente no rodapé
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  // Logotipo largo (>= 2.2:1) já traz o nome escrito — repetir ao lado polui
  var navLogo = document.querySelector(".nav-brand img");
  if (navLogo) {
    var hideDuplicateName = function () {
      if (!navLogo.naturalHeight) return;
      if (navLogo.naturalWidth / navLogo.naturalHeight < 2.2) return;
      document.querySelectorAll(".nav-brand .name, footer .brand span").forEach(function (el) {
        el.style.display = "none";
      });
    };
    if (navLogo.complete) hideDuplicateName();
    else navLogo.addEventListener("load", hideDuplicateName);
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll(".reveal");

  // Sem IntersectionObserver (ou com movimento reduzido) tudo já nasce visível
  if (reduceMotion || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("visible"); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "-60px 0px", threshold: 0.05 });

  targets.forEach(function (el, index) {
    el.style.transitionDelay = Math.min(index % 6, 5) * 60 + "ms";
    observer.observe(el);
  });

  // Imagem quebrada some em vez de virar ícone de erro
  document.querySelectorAll("img").forEach(function (img) {
    img.addEventListener("error", function () {
      var wrapper = img.closest("[data-hide-on-error]");
      (wrapper || img).style.display = "none";
    });
  });
})();
`;
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

function brandMarkHtml(lead: Lead, size: number, kit?: DesignKit): string {
  if (lead.logoUrl) {
    const chip = kit?.logoFit.treatment === "chip" ? ' class="chip"' : "";
    return `<img${chip} src="${escapeHtml(lead.logoUrl)}" alt="Logo ${escapeHtml(
      lead.title
    )}">`;
  }
  const initials =
    lead.title
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || lead.title.slice(0, 2).toUpperCase();
  return `<span class="lockup" style="width:${size}px;height:${size}px;font-size:${Math.round(
    size * 0.4
  )}px">${escapeHtml(initials)}</span>`;
}

export function buildHtml(lead: Lead, kit: DesignKit): string {
  const p = kit.palette;
  const phone = lead.phone.replace(/\D/g, "");
  const waUrl = `https://wa.me/55${phone}`;
  const cityName = lead.city.split(",")[0].trim();
  const content = kit.content;
  const heroPhoto = lead.photos?.[0];
  const gallery = (lead.photos ?? []).slice(1, 7);
  const description = `${lead.title} — ${lead.category} em ${cityName}. ${content.description}`;

  const heroLogo = kit.hasRealLogo
    ? `<div class="hero-logo">${brandMarkHtml(lead, kit.logoSizes.hero)}</div>`
    : "";

  const ratingBadge = (onDark: boolean) =>
    `<div class="rating-badge${onDark ? "" : " on-light"}">${starRow(
      lead.rating
    )}<strong>${lead.rating.toFixed(1)}</strong><span>(${
      lead.reviewsCount
    } avaliações no Google)</span></div>`;

  const actions = (onDark: boolean) => `<div class="hero-actions">
        <a class="btn btn-primary" href="${waUrl}" target="_blank" rel="noopener">${icon(
          "phone"
        )} Falar no WhatsApp</a>
        <a class="btn ${onDark ? "btn-ghost" : "btn-outline"}" href="tel:+55${phone}">${escapeHtml(
          lead.phone
        )}</a>
      </div>`;

  const heroCopy = (onDark: boolean) => `${heroLogo}
      ${ratingBadge(onDark)}
      <h1>${escapeHtml(content.hero)}</h1>
      <p class="lead">${escapeHtml(content.description)}</p>
      <div class="hero-meta"${onDark ? ' style="color:rgba(255,255,255,.78)"' : ""}>
        <span>${icon("pin", 18)} ${escapeHtml(lead.address)}, ${escapeHtml(cityName)}</span>
        <span>${icon("phone", 18)} ${escapeHtml(lead.phone)}</span>
      </div>
      ${actions(onDark)}`;

  const mediaHtml = heroPhoto
    ? `<div class="hero-media"><img src="${escapeHtml(heroPhoto)}" alt="${escapeHtml(
        lead.title
      )}"></div>`
    : `<div class="hero-fallback"></div>`;

  let hero: string;
  if (kit.layout === "split") {
    hero = `<section class="hero hero-split">
      <div class="panel"><div class="container"><div class="hero-content on-dark">${heroCopy(
        true
      )}</div></div></div>
      <div class="visual">${mediaHtml}</div>
    </section>`;
  } else if (kit.layout === "editorial") {
    hero = `<section class="hero hero-editorial">
      <div class="container"><div class="hero-content">${heroCopy(false)}</div></div>
      <div class="container"><div class="frame">${mediaHtml}</div></div>
    </section>`;
  } else {
    hero = `<section class="hero">
      ${mediaHtml}
      <div class="container"><div class="hero-content on-dark">${heroCopy(true)}</div></div>
    </section>`;
  }

  const services = content.services
    .map(
      (service, i) => `<div class="service reveal">
          <span class="num">${i + 1}</span>
          <span class="label">${escapeHtml(service)}</span>
          <span class="chev">${icon("chevron", 16)}</span>
        </div>`
    )
    .join("\n        ");

  const gallerySection =
    gallery.length > 0
      ? `<section>
      <div class="container">
        <div class="section-head reveal">
          <span class="section-label">${
            lead.instagramHandle ? `@${escapeHtml(lead.instagramHandle)}` : "Nosso espaço"
          }</span>
          <h2>Conheça a ${escapeHtml(lead.title)}</h2>
        </div>
        <div class="grid grid-3 gallery">
          ${gallery
            .map(
              (src, i) =>
                `<a class="reveal" data-hide-on-error href="${escapeHtml(
                  src
                )}" target="_blank" rel="noopener"><img loading="lazy" src="${escapeHtml(
                  src
                )}" alt="${escapeHtml(lead.title)} — foto ${i + 1}"></a>`
            )
            .join("\n          ")}
        </div>
      </div>
    </section>`
      : "";

  const differentials = content.differentials
    .map(
      (d) => `<div class="card center reveal">
            <span class="badge">${icon(ICON_BY_EMOJI[d.icon] ?? "badge", 24)}</span>
            <h3>${escapeHtml(d.title)}</h3>
            <p>${escapeHtml(d.desc)}</p>
          </div>`
    )
    .join("\n          ");

  const names = ["Ana S.", "Carlos M.", "Paula R."];
  const times = ["1 semana", "2 semanas", "1 mês"];
  const testimonials = content.testimonials
    .map(
      (text, i) => `<div class="card review reveal">
            <span style="color:var(--brand-text);opacity:.5">${icon("quote", 20)}</span>
            <p style="color:var(--text);flex:1">${escapeHtml(text)}</p>
            <div class="who">
              <span class="avatar">${names[i][0]}</span>
              <span><strong>${names[i]}</strong><br><small>há ${times[i]}</small></span>
              <span style="margin-left:auto;color:var(--accent)">${icon("check", 16)}</span>
            </div>
          </div>`
    )
    .join("\n          ");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(lead.title)} — ${escapeHtml(lead.category)} em ${escapeHtml(cityName)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="${p.primary}">
  <meta property="og:title" content="${escapeHtml(lead.title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  ${lead.logoUrl ? `<link rel="icon" href="${escapeHtml(lead.logoUrl)}">` : ""}
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${escapeHtml(kit.fonts.googleHref)}">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="nav">
    <div class="nav-brand">
      ${brandMarkHtml(lead, kit.logoSizes.nav, kit)}
      <span class="name">${escapeHtml(lead.title)}</span>
    </div>
    <a class="btn btn-primary" href="${waUrl}" target="_blank" rel="noopener">${icon(
      "phone",
      18
    )} <span class="full">${escapeHtml(lead.phone)}</span></a>
  </nav>

  ${hero}

  <div class="container" style="margin-top:${kit.layout === "overlay" ? "-44px" : "32px"}">
    <div class="trust reveal">
      <div class="item">
        <span class="score">${lead.rating.toFixed(1)}</span>
        <span>
          <small style="display:block">Avaliação no Google</small>
          ${starRow(lead.rating)}
          <small style="display:block">${lead.reviewsCount} avaliações verificadas</small>
        </span>
      </div>
      <div class="item">${icon("shield")} Empresa verificada no Google Maps</div>
      <div class="item">${icon("award")} Referência em ${escapeHtml(
        lead.category
      )} em ${escapeHtml(cityName)}</div>
    </div>
  </div>

  <section>
    <div class="container">
      <div class="section-head reveal">
        <span class="section-label">O que oferecemos</span>
        <h2>Nossos Serviços</h2>
        <p>Soluções completas em ${escapeHtml(
          lead.category.toLowerCase()
        )} para atender você e sua família em ${escapeHtml(cityName)}.</p>
      </div>
      <div class="grid grid-3">
        ${services}
      </div>
    </div>
  </section>

  ${gallerySection}

  <section class="band">
    <div class="container">
      <div class="section-head reveal">
        <h2>Por que nos escolher?</h2>
        <p>Os motivos que fazem de nós a melhor escolha em ${escapeHtml(cityName)}</p>
      </div>
      <div class="grid grid-3">
          ${differentials}
      </div>
    </div>
  </section>

  <section>
    <div class="container">
      <div class="section-head reveal">
        <span class="section-label">Prova social</span>
        <h2>O que dizem nossos clientes</h2>
        <p>Baseado nas ${lead.reviewsCount} avaliações reais no Google</p>
      </div>
      <div class="grid grid-3">
          ${testimonials}
      </div>
    </div>
  </section>

  <section class="cta">
    <div class="container reveal">
      <span style="display:inline-flex;margin-bottom:12px">${icon("zap", 40)}</span>
      <h2>Pronto para começar?</h2>
      <p>Entre em contato agora e receba um atendimento personalizado da <strong>${escapeHtml(
        lead.title
      )}</strong> em ${escapeHtml(cityName)}.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="${waUrl}" target="_blank" rel="noopener">Falar no WhatsApp ${icon(
          "chevron",
          18
        )}</a>
        <a class="btn btn-ghost" href="tel:+55${phone}">${icon("phone", 18)} Ligar Agora</a>
      </div>
    </div>
  </section>

  <footer>
    <div class="container inner">
      <div class="brand">
        ${brandMarkHtml(lead, kit.logoSizes.footer, kit)}
        <span>${escapeHtml(lead.title)}</span>
      </div>
      <div class="links">
        <span>${icon("pin", 16)} ${escapeHtml(lead.address)}, ${escapeHtml(cityName)}</span>
        <span>${icon("phone", 16)} ${escapeHtml(lead.phone)}</span>
        <a href="${waUrl}" target="_blank" rel="noopener">WhatsApp</a>${
          lead.instagramHandle
            ? `\n        <a href="https://instagram.com/${escapeHtml(
                lead.instagramHandle
              )}" target="_blank" rel="noopener">@${escapeHtml(lead.instagramHandle)}</a>`
            : ""
        }${
          lead.facebookHandle
            ? `\n        <a href="https://facebook.com/${escapeHtml(
                lead.facebookHandle
              )}" target="_blank" rel="noopener">Facebook</a>`
            : ""
        }
      </div>
      <small>© <span data-year>2026</span> ${escapeHtml(lead.title)} • ${escapeHtml(
        cityName
      )}</small>
    </div>
  </footer>

  <a class="fab" href="${waUrl}" target="_blank" rel="noopener" aria-label="Chamar no WhatsApp">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.117 1.527 5.845L.057 23.882l6.2-1.626A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.82 9.82 0 01-5.007-1.37l-.36-.214-3.677.964.981-3.585-.235-.369A9.82 9.82 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z"/></svg>
    Chamar no WhatsApp
  </a>

  <script src="script.js"></script>
</body>
</html>
`;
}

// ─── Export principal ─────────────────────────────────────────────────────────

export interface StaticSite {
  slug: string;
  files: ZipEntry[];
}

export function buildStaticSite(lead: Lead): StaticSite {
  const kit = buildDesignKit(kitInputFromLead(lead));

  return {
    slug: slugify(lead.title),
    files: [
      { name: "index.html", content: buildHtml(lead, kit) },
      { name: "styles.css", content: buildCss(kit) },
      { name: "script.js", content: buildJs() },
      { name: "LEIA-ME.txt", content: buildReadme(lead, kit) },
      ...buildLinkCardFiles(lead, kit),
      ...businessCardFiles(lead, kit),
    ],
  };
}

function buildReadme(lead: Lead, kit: DesignKit): string {
  return `Site de ${lead.title}
${"=".repeat(`Site de ${lead.title}`.length)}

Gerado pelo Maps Lead Hunter.

COMO PUBLICAR
-------------
Os três arquivos são estáticos: não precisam de build, Node nem banco.
1. Suba index.html, styles.css e script.js para qualquer hospedagem
   (Vercel, Netlify, GitHub Pages, Hostinger, cPanel...).
2. Aponte o domínio para a pasta. Pronto.

Para testar no seu computador, é só abrir index.html no navegador.

SISTEMA DE DESIGN APLICADO
--------------------------
Arquétipo ..... ${kit.archetypeLabel} (${kit.mood})
Layout ........ ${kit.layout}
Cor primária .. ${kit.palette.primary}
Cor de acento . ${kit.palette.accent}
Origem da cor . ${
    kit.colorSource === "logo"
      ? "extraída dos pixels do logo da empresa"
      : kit.colorSource === "site"
        ? "declarada no site da empresa"
        : kit.colorSource === "photo"
          ? "extraída das fotos da empresa"
          : "paleta de referência do segmento"
  }
Tipografia .... ${kit.fonts.heading} (títulos) / ${kit.fonts.body} (corpo)

Todas as combinações de texto e fundo passam em contraste WCAG AA (4.5:1).
As cores estão em variáveis CSS no topo de styles.css — mudar a marca
inteira é mudar aquelas linhas.

IMAGENS
-------
As fotos são carregadas das URLs originais (Google Maps / Instagram).
Antes de publicar em produção, baixe-as e sirva do seu próprio domínio:
essas URLs podem expirar.

CONTATO CONFIGURADO
-------------------
WhatsApp ...... ${lead.phone}
Endereço ...... ${lead.address}, ${lead.city}
`;
}
