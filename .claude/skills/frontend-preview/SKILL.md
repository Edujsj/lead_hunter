---
name: frontend-preview
description: Regras de front-end deste projeto — como construir e alterar a landing page do preview, o design kit e o exportador estático. Use ao mexer em components/preview, lib/design, lib/export ou ao adicionar seções, nichos e componentes de UI.
---

# Front-end do Maps Lead Hunter

Base de design: `design-system/maps-lead-hunter/MASTER.md` (gerado pela skill
`ui-ux-pro-max`). Se o arquivo existir, ele manda. Para uma página específica,
`design-system/maps-lead-hunter/pages/<pagina>.md` sobrescreve o MASTER.

## Onde mora o quê

| Camada | Arquivo | Responsabilidade |
|---|---|---|
| Cor | `lib/design/color.ts` | Parsing, contraste WCAG, derivação. Puro, sem React. |
| Nicho | `lib/design/niches.ts` | Arquétipos: paleta, fontes, layouts, conteúdo. |
| Kit | `lib/design/kit.ts` | Resolve o sistema visual de UMA empresa. |
| Seed | `lib/design/seed.ts` | `Lead` → `BrandSeed`. Campo de marca novo entra só aqui. |
| Links | `lib/design/links.ts` | Lista de links do cartão + ícones SVG. |
| Site | `components/preview/LandingPage.tsx` | Única fonte da landing page. |
| Cartão | `components/preview/LinkCard.tsx` | Cartão online (link-in-bio) animado. |
| Export site | `lib/export/staticSite.ts` | Mesma página em HTML/CSS/JS puro. |
| Export cartão | `lib/export/linkCardExport.ts` | Cartão online estático (`cartao/`). |
| Export impresso | `lib/export/businessCard.ts` | Cartão 90×50mm em SVG. |

O botão **Preview** abre os dois: aba do site e aba do cartão. O download
(`.zip`) leva site + `cartao/` + os SVGs de impressão.

## Regras que não se quebram

1. **Nunca hardcode cor, fonte ou raio no JSX.** Tudo vem de `kit.palette`,
   `kit.fonts`, `kit.radius`. Cor nova entra no arquétipo, não no componente.
2. **Todo par texto/fundo passa em 4.5:1.** Use `ensureContrast` ao derivar.
   `tests/designKit.test.ts` audita todos os arquétipos — ele quebra se você
   introduzir uma combinação ilegível.
3. **Ícone é SVG (Lucide), nunca emoji.** Os emojis em `niches.ts` são dados de
   conteúdo; o mapa `ICON_BY_EMOJI` traduz para componente Lucide no render e
   para SVG inline no export.
4. **Alvo de toque ≥ 44×44px** em todo link ou botão clicável.
5. **`prefers-reduced-motion` respeitado.** Animação é enfeite, não requisito.
6. **Responsivo em 375 / 768 / 1024 / 1440.** Zero scroll horizontal — a página
   inteira tem `overflow-x: hidden` e o teste manual passa por 375px.
7. **O modal e a página pública renderizam o MESMO componente.** A única
   diferença permitida é a prop `animated`. Não crie uma segunda landing page.
8. **Mudou o render? Mude o export.** `lib/export/staticSite.ts` e
   `lib/export/linkCardExport.ts` precisam produzir a mesma coisa que o React.
   `tests/staticSite.test.ts` e `tests/linkCard.test.ts` cobrem a paridade.
9. **Logo nunca vai solta sobre cor.** Use `kit.logoFit`: `treatment: "chip"`
   quer dizer pastilha clara atrás (arquivo com fundo sólido ou traço que
   sumiria). `isWordmark` quer dizer que o arquivo já tem o nome escrito —
   não repita o nome ao lado. Larguras máximas em `logoFit.maxWidth`.

## Next.js 16 (App Router, Turbopack)

- `'use client'` só onde há hook ou evento; empurre o client component para a
  folha da árvore.
- `next/image` é o padrão do projeto **exceto** para as imagens do preview:
  elas vêm de domínios arbitrários (Google Maps, Instagram CDN) e mudam a cada
  lead, então usam `<img>` com `eslint-disable-next-line @next/next/no-img-element`
  e `loading="lazy"`. Não converta para `<Image>` sem resolver o allowlist de
  domínios em `next.config.ts`.
- Leitura de `localStorage` usa `useSyncExternalStore` com snapshot cacheado
  (`lib/previewStore.ts`), nunca `setState` dentro de `useEffect`.
- Fontes do Google entram por `<link>` injetado em runtime (`useGoogleFont`),
  porque cada empresa usa um par tipográfico diferente — `next/font` exige
  família estática em build.

## Adicionando um nicho

1. Rode a skill de design para pegar paleta e tipografia validadas:
   `search.py "<nicho> <tom>" --design-system`
2. Acrescente o arquétipo em `ARCHETYPES` com `aliases` que casem com as
   categorias reais do Google Maps (sem acento, minúsculas).
3. Rode `npx vitest run tests/designKit.test.ts` — o teste de contraste roda
   sobre todos os arquétipos automaticamente.

## Verificação antes de entregar

```bash
npx tsc --noEmit && npx vitest run && npx next build
```
