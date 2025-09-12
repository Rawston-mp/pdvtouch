// src/lib/escpos.ts
// Gera Uint8Array com comandos ESC/POS reais.
// Envie via Bridge p/ spoolar na impressora (USB/Ethernet/RAW).

function enc(text: string): Uint8Array {
  // Para acentuação adequada, converta para codepage da impressora no Bridge.
  // Aqui mantemos UTF-8 e o Bridge faz transcodificação (iconv cp437/cp850).
  return new TextEncoder().encode(text);
}

export function escposInit(): Uint8Array {
  return Uint8Array.from([0x1B, 0x40]); // ESC @
}

export function escposAlignCenter(): Uint8Array {
  return Uint8Array.from([0x1B, 0x61, 0x01]);
}
export function escposAlignLeft(): Uint8Array {
  return Uint8Array.from([0x1B, 0x61, 0x00]);
}

export function escposEmphasized(on: boolean): Uint8Array {
  return Uint8Array.from([0x1B, 0x45, on ? 1 : 0]);
}

export function escposCut(partial = true): Uint8Array {
  // GS V m: m=0 full; m=1 partial (varia por fabricante)
  return Uint8Array.from([0x1D, 0x56, partial ? 0x01 : 0x00]);
}

export function escposNewLine(n = 1): Uint8Array {
  return Uint8Array.from(Array(n).fill(0x0A));
}

export function escposText(text: string): Uint8Array {
  return enc(text);
}

export function buildCustomerCoupon(params: {
  header: { name: string; cnpj: string; addr1: string; addr2?: string };
  items: { name: string; qty: number; unit: string; price: number; total: number }[];
  totals: { subtotal: number; discount?: number; total: number };
  qrCodeUrl?: string; // NFC-e QR (site da Sefaz)
}): Uint8Array {
  const chunks: Uint8Array[] = [];
  chunks.push(escposInit());
  chunks.push(escposAlignCenter());
  chunks.push(escposEmphasized(true));
  chunks.push(escposText(`${params.header.name}\n`));
  chunks.push(escposEmphasized(false));
  chunks.push(escposText(`CNPJ: ${params.header.cnpj}\n`));
  chunks.push(escposText(`${params.header.addr1}\n`));
  if (params.header.addr2) chunks.push(escposText(`${params.header.addr2}\n`));
  chunks.push(escposNewLine());

  chunks.push(escposAlignLeft());
  params.items.forEach(i => {
    chunks.push(escposText(`${i.name}\n`));
    chunks.push(escposText(`${i.qty.toFixed(3)} ${i.unit} x R$ ${i.price.toFixed(2)}  =  R$ ${i.total.toFixed(2)}\n`));
  });
  chunks.push(escposNewLine());
  chunks.push(escposText(`Subtotal: R$ ${params.totals.subtotal.toFixed(2)}\n`));
  if (params.totals.discount) chunks.push(escposText(`Desconto: R$ ${params.totals.discount.toFixed(2)}\n`));
  chunks.push(escposEmphasized(true));
  chunks.push(escposText(`TOTAL:   R$ ${params.totals.total.toFixed(2)}\n`));
  chunks.push(escposEmphasized(false));
  chunks.push(escposNewLine(2));

  if (params.qrCodeUrl) {
    // Se impressora suportar QRCode nativo, envie ESC/POS QR; caso contrário, imprima URL.
    chunks.push(escposText(`Consulte sua NFC-e:\n`));
    chunks.push(escposText(`${params.qrCodeUrl}\n`));
    chunks.push(escposNewLine(1));
  }

  chunks.push(escposText(`Obrigado pela preferência!\n`));
  chunks.push(escposNewLine(3));
  chunks.push(escposCut(true));

  // concat
  const totalLen = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(totalLen);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}
