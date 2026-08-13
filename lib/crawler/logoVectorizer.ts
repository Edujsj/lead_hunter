// ============================================================
// Vetorizador de logo — bitmap pequeno vira SVG
// ------------------------------------------------------------
// Favicon de 64px esticado para 88px no header fica borrado. Quando a
// marca é chapada (poucas cores, alto contraste), traçar o contorno e
// gerar um <path> resolve: escala sem perder nitidez.
// Não vale para logo fotográfico ou com degradê — `shouldVectorize`
// barra esses casos antes de qualquer processamento.
// ============================================================

export interface LogoMask {
  width: number;
  height: number;
  /** 1 = tinta, 0 = vazio. Comprimento = width * height */
  bits: number[];
}

export interface VectorizeInput {
  /** Maior lado do arquivo original */
  sourceSize: number;
  format?: string;
  colorCount: number;
}

export interface VectorizeOptions {
  /** Tolerância da simplificação, em pixels da máscara */
  tolerance?: number;
  /** Contornos menores que isto (em pixels) são ruído */
  minArea?: number;
  /** Cor de preenchimento do path */
  fill?: string;
}

/**
 * Vale a pena vetorizar?
 * Só quando o arquivo é raster pequeno E a marca é chapada — vetorizar
 * um logo grande não ganha nada, e um logo fotográfico vira borrão preto.
 */
export function shouldVectorize(input: VectorizeInput): boolean {
  if (input.format === "svg") return false;
  if (input.sourceSize >= 256) return false;
  if (input.colorCount > 6) return false;
  return true;
}

type Point = [number, number];

/** Vizinhança de 4 — usada para separar as ilhas de tinta */
function floodFill(
  mask: LogoMask,
  visited: Uint8Array,
  startIndex: number
): number[] {
  const { width, height, bits } = mask;
  const stack = [startIndex];
  const region: number[] = [];
  visited[startIndex] = 1;

  while (stack.length > 0) {
    const index = stack.pop() as number;
    region.push(index);

    const x = index % width;
    const y = (index / width) | 0;
    const neighbours: Point[] = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (const [nx, ny] of neighbours) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIndex = ny * width + nx;
      if (visited[nIndex] || bits[nIndex] !== 1) continue;
      visited[nIndex] = 1;
      stack.push(nIndex);
    }
  }

  return region;
}

/**
 * Contorno de uma região pelo algoritmo de Moore (square tracing):
 * anda pela borda mantendo a tinta à direita até fechar o ciclo.
 */
export function traceContour(mask: LogoMask, region: Set<number>): Point[] {
  const { width } = mask;
  const isInk = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;
    return region.has(y * width + x);
  };

  // Começa pelo pixel mais acima/à esquerda da região
  let start: Point | null = null;
  for (const index of region) {
    const x = index % width;
    const y = (index / width) | 0;
    if (!start || y < start[1] || (y === start[1] && x < start[0])) {
      start = [x, y];
    }
  }
  if (!start) return [];

  // Direções em sentido horário a partir de "para cima"
  const dirs: Point[] = [
    [0, -1], [1, -1], [1, 0], [1, 1],
    [0, 1], [-1, 1], [-1, 0], [-1, -1],
  ];

  const contour: Point[] = [start];
  let current = start;
  let dir = 6; // entrou vindo da esquerda
  const maxSteps = region.size * 8 + 32;

  for (let step = 0; step < maxSteps; step++) {
    let moved = false;

    // Procura o próximo pixel de tinta girando a partir da direção anterior
    for (let i = 0; i < 8; i++) {
      const d = (dir + 6 + i) % 8;
      const nx = current[0] + dirs[d][0];
      const ny = current[1] + dirs[d][1];
      if (!isInk(nx, ny)) continue;

      current = [nx, ny];
      dir = d;
      contour.push(current);
      moved = true;
      break;
    }

    if (!moved) break;
    if (current[0] === start[0] && current[1] === start[1] && contour.length > 2) {
      break;
    }
  }

  return contour;
}

/** Ramer–Douglas–Peucker: descarta pontos que não mudam a forma */
export function simplifyPath(points: Point[], tolerance: number): Point[] {
  if (points.length < 3 || tolerance <= 0) return points;

  const first = points[0];
  const last = points[points.length - 1];

  let maxDistance = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance <= tolerance) return [first, last];

  const left = simplifyPath(points.slice(0, index + 1), tolerance);
  const right = simplifyPath(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return Math.hypot(x - x1, y - y1);

  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/**
 * Máscara → SVG. Devolve `null` quando não sobra forma reconhecível
 * (máscara vazia, ruído puro ou tinta ocupando tudo).
 */
export function maskToSvg(
  mask: LogoMask,
  options: VectorizeOptions = {}
): string | null {
  const tolerance = options.tolerance ?? 0.8;
  const minArea = options.minArea ?? Math.max(6, (mask.width * mask.height) / 2000);
  const fill = options.fill ?? "currentColor";

  const inkTotal = mask.bits.reduce((sum, bit) => sum + bit, 0);
  if (inkTotal === 0) return null;
  if (inkTotal > mask.width * mask.height * 0.92) return null; // bloco sólido

  const visited = new Uint8Array(mask.width * mask.height);
  const paths: string[] = [];

  // Bounding box de toda a tinta, para o viewBox sair justo
  let minX = mask.width, minY = mask.height, maxX = -1, maxY = -1;

  for (let index = 0; index < mask.bits.length; index++) {
    if (mask.bits[index] !== 1 || visited[index]) continue;

    const region = floodFill(mask, visited, index);
    if (region.length < minArea) continue;

    const regionSet = new Set(region);
    const contour = traceContour(mask, regionSet);
    if (contour.length < 3) continue;

    const simplified = simplifyPath(contour, tolerance);
    if (simplified.length < 3) continue;

    for (const [x, y] of simplified) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const d =
      simplified
        .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`)
        .join(" ") + " Z";
    paths.push(d);
  }

  if (paths.length === 0 || maxX < minX) return null;

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" fill="${fill}">`,
    `<path fill-rule="evenodd" d="${paths.join(" ")}"/>`,
    `</svg>`,
  ].join("");
}

/** SVG pronto para usar em `src` de <img> */
export function svgToDataUrl(svg: string): string {
  const encoded = svg
    .replace(/"/g, "'")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/#/g, "%23")
    .replace(/\s+/g, " ");
  return `data:image/svg+xml,${encoded}`;
}

export interface VectorizeResult {
  svg: string;
  dataUrl: string;
  /** Quantos contornos entraram no path */
  pathCount: number;
}

/** Ponta a ponta: máscara + cor → SVG e data URI, ou null se não valer */
export function vectorizeLogo(
  mask: LogoMask,
  input: VectorizeInput,
  options: VectorizeOptions = {}
): VectorizeResult | null {
  if (!shouldVectorize(input)) return null;

  const svg = maskToSvg(mask, options);
  if (!svg) return null;

  return {
    svg,
    dataUrl: svgToDataUrl(svg),
    pathCount: (svg.match(/M/g) ?? []).length,
  };
}
