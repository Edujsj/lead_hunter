// ============================================================
// Guardas de campo — validação no momento da escrita
// ------------------------------------------------------------
// A auditoria mostrou que o pior defeito não era dado faltando, e sim
// dado errado que passa por certo: o rótulo de um botão gravado como
// telefone, a categoria gravada como endereço. Isso atravessa o sistema
// inteiro sem disparar alarme e chega na landing page do cliente.
// Aqui todo campo passa por uma porta: ou entra válido, ou entra vazio.
// ============================================================

/** DDDs em uso no Brasil (Anatel). Fora desta lista, o número é lixo. */
const DDD_VALIDOS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** Texto de interface do Maps que já apareceu em campos de dado */
const TEXTO_DE_INTERFACE =
  /ver no google|google maps|website|^site$|como chegar|rota|salvar|compartilhar|ligar|telefone|adicionar|sugerir|reivindicar/i;

const SEPARADORES_INICIAIS = /^[\s·•∙‧⋅|\-–—,]+/;

/**
 * Telefone só entra se for um número brasileiro plausível.
 * Devolve string vazia em vez de qualquer texto de fallback — campo vazio
 * é filtrável, texto de interface não é.
 */
export function sanitizePhone(raw?: string | null): string {
  if (!raw) return "";
  const texto = raw.trim();
  if (!texto || TEXTO_DE_INTERFACE.test(texto)) return "";

  const digitos = texto.replace(/\D/g, "");
  const local =
    digitos.startsWith("55") && digitos.length >= 12 ? digitos.slice(2) : digitos;

  if (local.length !== 10 && local.length !== 11) return "";
  if (!DDD_VALIDOS.has(Number(local.slice(0, 2)))) return "";

  // Celular tem 11 dígitos e começa com 9; fixo tem 10 e começa de 2 a 5
  const primeiro = local[2];
  if (local.length === 11 && primeiro !== "9") return "";
  if (local.length === 10 && !/[2-5]/.test(primeiro)) return "";

  return local.length === 11
    ? `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
    : `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
}

export function hasPhone(lead: { phone?: string }): boolean {
  return sanitizePhone(lead.phone).length > 0;
}

/** Um endereço de verdade tem tipo de logradouro ou número de porta */
export function looksLikeAddress(texto: string): boolean {
  if (!texto) return false;
  const temLogradouro =
    /(^|[\s,])(r\.|rua|av\.|avenida|al\.|alameda|trav\.?|travessa|pra[çc]a|rod\.|rodovia|estrada|largo|via|marg\.|viela|passagem|jd\.|jardim)[\s.]/i.test(
      texto
    );
  const temNumero = /\d{1,6}(\s|$|,|-)/.test(texto);
  return temLogradouro || temNumero;
}

/**
 * Limpa o endereço vindo do card e recusa o que claramente não é endereço.
 * O Maps entrega "· R. Oriente, 35" — o separador visual vem junto no texto.
 */
export function sanitizeAddress(raw?: string | null, category?: string): string {
  if (!raw) return "";

  const limpo = raw.replace(SEPARADORES_INICIAIS, "").replace(/\s+/g, " ").trim();
  if (limpo.length < 4) return "";
  if (TEXTO_DE_INTERFACE.test(limpo)) return "";

  // A categoria vazando para o campo de endereço foi 11% da amostra auditada
  if (category) {
    const cat = category.replace(SEPARADORES_INICIAIS, "").trim().toLowerCase();
    if (cat.length > 3 && limpo.toLowerCase() === cat) return "";
  }

  if (!looksLikeAddress(limpo)) return "";

  return limpo;
}

/** Categoria é rótulo curto; endereço e texto de botão não entram aqui */
export function sanitizeCategory(raw?: string | null, fallback = ""): string {
  if (!raw) return fallback;
  const limpo = raw.replace(SEPARADORES_INICIAIS, "").replace(/\s+/g, " ").trim();
  if (limpo.length < 3 || limpo.length > 60) return fallback;
  if (TEXTO_DE_INTERFACE.test(limpo)) return fallback;
  if (looksLikeAddress(limpo)) return fallback;
  return limpo;
}

/**
 * Separa categoria e endereço a partir dos textos soltos de um card.
 * O código antigo escolhia por comprimento ("< 40 chars é categoria"), e
 * categoria longa — "Loja de suprimentos para animais de estimação" — caía
 * no campo de endereço.
 */
export function splitCardTexts(
  spans: string[],
  options: { name?: string; fallbackCategory?: string } = {}
): { category: string; address: string } {
  const limpos = spans
    .map((s) => (s ?? "").replace(SEPARADORES_INICIAIS, "").trim())
    .filter((s) => s.length > 1)
    .filter((s) => s !== options.name)
    .filter((s) => !TEXTO_DE_INTERFACE.test(s))
    .filter((s) => !/^[\d,.\s()]+$/.test(s))
    .filter((s) => !/avalia(ç|c)|estrela|review/i.test(s));

  const endereco = limpos.find((s) => looksLikeAddress(s)) ?? "";
  const categoria = limpos.find((s) => s !== endereco && !looksLikeAddress(s)) ?? "";

  return {
    category: sanitizeCategory(categoria, options.fallbackCategory ?? ""),
    address: sanitizeAddress(endereco, categoria),
  };
}

/**
 * Total de avaliações. O rótulo do Maps mistura nota e contagem numa string
 * só ("4,5 estrelas 250 avaliações"), e a versão anterior tirava os dois
 * juntos — daí a contagem vir zerada em 100% da amostra.
 */
export function parseReviewCountFromLabel(raw?: string | null): number {
  if (!raw) return 0;
  const texto = raw.replace(/ /g, " ");

  // "250 avaliações" / "1.234 comentários" — o número que precede a palavra
  const comPalavra = texto.match(
    /([\d.\s]+)\s*(avalia(?:ç|c)(?:ão|ões|oes)|coment|review)/i
  );
  if (comPalavra) {
    const n = parseInt(comPalavra[1].replace(/[.\s]/g, ""), 10);
    if (!Number.isNaN(n)) return n;
  }

  // "(250)" — formato compacto do card
  const entreParenteses = texto.match(/\(\s*([\d.]+)\s*\)/);
  if (entreParenteses) {
    const n = parseInt(entreParenteses[1].replace(/\./g, ""), 10);
    if (!Number.isNaN(n)) return n;
  }

  // Sobrou um número solto que não é a nota (nota tem vírgula/ponto decimal)
  const solto = texto.match(/(?:^|\s)(\d{1,3}(?:\.\d{3})*|\d+)(?:\s|$)/);
  if (solto) {
    const n = parseInt(solto[1].replace(/\./g, ""), 10);
    if (!Number.isNaN(n) && n > 5) return n;
  }

  return 0;
}

/** Nota de 0 a 5. Rótulo do Maps vem como "4,5 estrelas". */
export function parseRatingFromLabel(raw?: string | null): number {
  if (!raw) return 0;
  const match = raw.match(/(\d)[,.](\d)/) ?? raw.match(/(^|\s)([0-5])(\s|$)/);
  if (!match) return 0;
  const valor = match.length === 4 ? parseFloat(match[2]) : parseFloat(`${match[1]}.${match[2]}`);
  if (Number.isNaN(valor)) return 0;
  return Math.min(5, Math.max(0, valor));
}
