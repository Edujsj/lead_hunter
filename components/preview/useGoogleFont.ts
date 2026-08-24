"use client";

import { useEffect } from "react";

/**
 * Injeta o <link> do Google Fonts do kit.
 *
 * Cada empresa pode usar um par tipográfico diferente, então as fontes não
 * podem ser declaradas no layout: `next/font` exige família estática em
 * build. Entram sob demanda e ficam em cache para os próximos previews.
 */
export function useGoogleFont(href: string) {
  useEffect(() => {
    if (!href || typeof document === "undefined") return;
    if (document.querySelector(`link[data-preview-font="${href}"]`)) return;

    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = "https://fonts.gstatic.com";
    preconnect.crossOrigin = "anonymous";

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.previewFont = href;

    document.head.appendChild(preconnect);
    document.head.appendChild(link);
  }, [href]);
}
