// ============================================================
// ZIP mínimo (método "store", sem compressão)
// ------------------------------------------------------------
// Três arquivos de texto não justificam puxar jszip para o bundle
// do cliente. O formato store é só cabeçalho + bytes crus + índice
// central, e roda no browser sem dependência nenhuma.
// ============================================================

export interface ZipEntry {
  name: string;
  content: string;
}

/** Tabela do CRC-32 (polinômio 0xEDB88320), construída uma vez */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Data/hora no formato MS-DOS usado pelo ZIP */
function dosDateTime(date: Date): { time: number; date: number } {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: day };
}

/**
 * Monta o ZIP. Todas as entradas são gravadas sem compressão, então o
 * arquivo fica maior que um .zip normal — para três arquivos de texto a
 * diferença é irrelevante e o código cabe em uma tela.
 */
export function createZip(entries: ZipEntry[], now = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(now);

  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const checksum = crc32(dataBytes);

    const local = new Uint8Array(30 + nameBytes.length + dataBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true); // assinatura
    localView.setUint16(4, 20, true); // versão necessária
    localView.setUint16(6, 0x0800, true); // flag de nome em UTF-8
    localView.setUint16(8, 0, true); // método: store
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, dataBytes.length, true);
    localView.setUint32(22, dataBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true); // sem campo extra
    local.set(nameBytes, 30);
    local.set(dataBytes, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true); // versão que gravou
    centralView.setUint16(6, 20, true); // versão necessária
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, dataBytes.length, true);
    centralView.setUint32(24, dataBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true); // deslocamento do cabeçalho local
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const total =
    locals.reduce((sum, l) => sum + l.length, 0) + centralSize + end.length;
  const output = new Uint8Array(total);

  let cursor = 0;
  for (const chunk of [...locals, ...centrals, end]) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }

  return output;
}
