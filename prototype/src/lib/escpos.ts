// src/lib/escpos.ts
// -------------------------------------------------------------
// Geração de bytes ESC/POS (Elgin/Bematech e compatíveis)
// Cupom do cliente, Cozinha/Bar, TEF, Relatório X e Fechamento Z
// -------------------------------------------------------------

// ===== Utilidades internas ===================================================

function enc(text: string): Uint8Array {
  return new TextEncoder().encode(text); // UTF-8 — Bridge converte para codepage da impressora
}

function concat(parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

// ===== Comandos ESC/POS ======================================================

export function escposInit(): Uint8Array {
  return Uint8Array.from([0x1B, 0x40]); // ESC @
}
export function escposAlignLeft(): Uint8Array {
  return Uint8Array.from([0x1B, 0x61, 0x00]);
}
export function escposAlignCenter(): Uint8Array {
  return Uint8Array.from([0x1B, 0x61, 0x01]);
}
export function escposAlignRight(): Uint8Array {
  return Uint8Array.from([0x1B, 0x61, 0x02]);
}
export function escposEmph(on: boolean): Uint8Array {
  return Uint8Array.from([0x1B, 0x45, on ? 1 : 0]); // ESC E n
}
export function escposDouble(on: boolean): Uint8Array {
  // ESC ! n (0x30 ~ double width/height)
  return Uint8Array.from([0x1B, 0x21, on ? 0x30 : 0x00]);
}
export function escposNewLine(n = 1): Uint8Array {
  return Uint8Array.from(Array(n).fill(0x0A)); // LF
}
export function escposCut(partial = true): Uint8Array {
  return Uint8Array.from([0x1D, 0x56, partial ? 0x01 : 0x00]); // GS V m
}
export function escposText(text: string): Uint8Array {
  return enc(text);
}

// QR Code nativo (quando suportado pelo modelo)
export function escposQrData(data: string, size: number = 6): Uint8Array {
  const parts: Uint8Array[] = [];
  // Seleciona modelo
  parts.push(Uint8Array.from([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]));
  // Tamanho (1..16)
  parts.push(Uint8Array.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, Math.max(1, Math.min(16, size))]));
  // Correção (M)
  parts.push(Uint8Array.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]));
  // Dados
  const bytes = enc(data);
  const pL = (bytes.length + 3) & 0xff;
  const pH = ((bytes.length + 3) >> 8) & 0xff;
  parts.push(Uint8Array.from([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]));
  parts.push(bytes);
  // Imprime
  parts.push(Uint8Array.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]));
  return concat(parts);
}

// ===== Cupom do Cliente ======================================================

export type CouponItem = {
  name: string;
  qty: number;
  unit: 'UN' | 'KG';
  price: number;
  total: number;
};

export function buildCustomerCoupon(params: {
  header: { name: string; cnpj: string; addr1: string; addr2?: string };
  items: CouponItem[];
  totals: { subtotal: number; discount?: number; total: number };
  footer?: string;
  qrCodeUrl?: string;
  qrAsNative?: boolean;
}): Uint8Array {
  const P: Uint8Array[] = [];
  P.push(escposInit());

  // Cabeçalho
  P.push(escposAlignCenter());
  P.push(escposDouble(true));
  P.push(escposText(`${params.header.name}\n`));
  P.push(escposDouble(false));
  P.push(escposText(`CNPJ: ${params.header.cnpj}\n`));
  P.push(escposText(`${params.header.addr1}\n`));
  if (params.header.addr2) P.push(escposText(`${params.header.addr2}\n`));
  P.push(escposNewLine());

  // Itens
  P.push(escposAlignLeft());
  params.items.forEach(i => {
    P.push(escposText(`${i.name}\n`));
    const qtyFmt = i.unit === 'KG' ? i.qty.toFixed(3) : i.qty.toFixed(0);
    P.push(escposText(`${qtyFmt} ${i.unit} x R$ ${i.price.toFixed(2)}  =  R$ ${i.total.toFixed(2)}\n`));
  });

  // Totais
  P.push(escposNewLine());
  P.push(escposText(`Subtotal: R$ ${params.totals.subtotal.toFixed(2)}\n`));
  if (params.totals.discount && params.totals.discount > 0) {
    P.push(escposText(`Desconto: R$ ${params.totals.discount.toFixed(2)}\n`));
  }
  P.push(escposEmph(true));
  P.push(escposText(`TOTAL:   R$ ${params.totals.total.toFixed(2)}\n`));
  P.push(escposEmph(false));

  // QR (NFC-e)
  if (params.qrCodeUrl) {
    P.push(escposNewLine());
    P.push(escposAlignCenter());
    if (params.qrAsNative) {
      P.push(escposQrData(params.qrCodeUrl, 6));
      P.push(escposNewLine());
    } else {
      P.push(escposText(`Consulta NFC-e:\n${params.qrCodeUrl}\n`));
    }
  }

  // Rodapé
  P.push(escposNewLine());
  P.push(escposText((params.footer ?? 'Obrigado pela preferência!') + '\n'));
  P.push(escposNewLine(3));
  P.push(escposCut(true));

  return concat(P);
}

// ===== Ticket Cozinha/Bar ====================================================

export function ticketKitchen(params: {
  header: { name: string };
  items: { name: string; qty: number; notes?: string }[];
  destination: 'COZINHA' | 'BAR';
  orderId?: string | number;
  timestamp?: string;
}): Uint8Array {
  const P: Uint8Array[] = [];
  P.push(escposInit());

  P.push(escposAlignCenter());
  P.push(escposEmph(true));
  P.push(escposText(`=== ${params.destination} ===\n`));
  P.push(escposEmph(false));
  P.push(escposText(`${params.header.name}\n`));
  if (params.orderId) P.push(escposText(`Comanda: ${params.orderId}\n`));
  if (params.timestamp) P.push(escposText(`${params.timestamp}\n`));
  P.push(escposNewLine());

  P.push(escposAlignLeft());
  params.items.forEach(i => {
    P.push(escposEmph(true));
    P.push(escposText(`${i.qty}x ${i.name}\n`));
    P.push(escposEmph(false));
    if (i.notes) P.push(escposText(`Obs: ${i.notes}\n`));
  });

  P.push(escposNewLine(2));
  P.push(escposText('--- Fim do pedido ---\n'));
  P.push(escposNewLine(2));
  P.push(escposCut(true));
  return concat(P);
}

// ===== Comprovante TEF =======================================================

export function tefReceipt(params: {
  header: { name: string };
  total: number;
  nsu: string;
  brand: string;
  authCode: string;
  installments?: number;
}): Uint8Array {
  const P: Uint8Array[] = [];
  P.push(escposInit());
  P.push(escposAlignCenter());
  P.push(escposText(`${params.header.name}\n`));
  P.push(escposText(`COMPROVANTE TEF\n`));
  P.push(escposNewLine());

  P.push(escposAlignLeft());
  P.push(escposText(`Bandeira: ${params.brand}\n`));
  P.push(escposText(`NSU: ${params.nsu}\n`));
  P.push(escposText(`Autorização: ${params.authCode}\n`));
  if (params.installments) P.push(escposText(`Parcelas: ${params.installments}\n`));
  P.push(escposEmph(true));
  P.push(escposText(`Valor: R$ ${params.total.toFixed(2)}\n`));
  P.push(escposEmph(false));

  P.push(escposNewLine(3));
  P.push(escposCut(true));
  return concat(P);
}

// ===== Relatório X e Fechamento Z ===========================================

export type PaymentsBreakdown = {
  CASH?: number;
  PIX?: number;
  TEF?: number;
  OTHER?: number;
};

export function ticketX(params: {
  header: { name: string; cnpj?: string };
  period: { from: string; to: string };
  counters: { salesQty: number; gross: number; avgTicket: number };
  payments: PaymentsBreakdown;
  topItems?: { name: string; qty: number; total: number }[];
}): Uint8Array {
  const P: Uint8Array[] = [];
  P.push(escposInit());
  P.push(escposAlignCenter());
  P.push(escposEmph(true));
  P.push(escposText('RELATÓRIO X\n'));
  P.push(escposEmph(false));
  P.push(escposText(`${params.header.name}\n`));
  if (params.header.cnpj) P.push(escposText(`CNPJ: ${params.header.cnpj}\n`));
  P.push(escposNewLine());
  P.push(escposAlignLeft());
  P.push(escposText(`Período: ${params.period.from} → ${params.period.to}\n`));
  P.push(escposText(`Vendas (qtd): ${params.counters.salesQty}\n`));
  P.push(escposText(`Faturamento bruto: R$ ${params.counters.gross.toFixed(2)}\n`));
  P.push(escposText(`Ticket médio: R$ ${params.counters.avgTicket.toFixed(2)}\n`));
  P.push(escposNewLine());

  P.push(escposText('Pagamentos:\n'));
  const pay = params.payments;
  if (pay.CASH) P.push(escposText(`  CASH: R$ ${pay.CASH.toFixed(2)}\n`));
  if (pay.PIX)  P.push(escposText(`  PIX : R$ ${pay.PIX.toFixed(2)}\n`));
  if (pay.TEF)  P.push(escposText(`  TEF : R$ ${pay.TEF.toFixed(2)}\n`));
  if (pay.OTHER)P.push(escposText(`  OUT : R$ ${pay.OTHER.toFixed(2)}\n`));

  if (params.topItems?.length) {
    P.push(escposNewLine());
    P.push(escposText('Itens mais vendidos:\n'));
    params.topItems.forEach(i => {
      P.push(escposText(`  ${i.name}  ${i.qty}  R$ ${i.total.toFixed(2)}\n`));
    });
  }

  P.push(escposNewLine(3));
  P.push(escposCut(true));
  return concat(P);
}

export function ticketZ(params: {
  header: { name: string; cnpj?: string };
  period: { from: string; to: string };
  counters: { salesQty: number; gross: number; avgTicket: number };
  payments: PaymentsBreakdown;
  zNumber: number;                // número sequencial do Z
  notes?: string;
}): Uint8Array {
  const P: Uint8Array[] = [];
  P.push(escposInit());
  P.push(escposAlignCenter());
  P.push(escposEmph(true));
  P.push(escposText('FECHAMENTO Z\n'));
  P.push(escposEmph(false));
  P.push(escposText(`${params.header.name}\n`));
  if (params.header.cnpj) P.push(escposText(`CNPJ: ${params.header.cnpj}\n`));
  P.push(escposNewLine());
  P.push(escposAlignLeft());
  P.push(escposText(`Período: ${params.period.from} → ${params.period.to}\n`));
  P.push(escposText(`Z#: ${params.zNumber}\n`));
  P.push(escposText(`Vendas (qtd): ${params.counters.salesQty}\n`));
  P.push(escposText(`Faturamento bruto: R$ ${params.counters.gross.toFixed(2)}\n`));
  P.push(escposText(`Ticket médio: R$ ${params.counters.avgTicket.toFixed(2)}\n`));
  P.push(escposNewLine());
  P.push(escposText('Pagamentos:\n'));
  const p = params.payments;
  if (p.CASH) P.push(escposText(`  CASH: R$ ${p.CASH.toFixed(2)}\n`));
  if (p.PIX)  P.push(escposText(`  PIX : R$ ${p.PIX.toFixed(2)}\n`));
  if (p.TEF)  P.push(escposText(`  TEF : R$ ${p.TEF.toFixed(2)}\n`));
  if (p.OTHER)P.push(escposText(`  OUT : R$ ${p.OTHER.toFixed(2)}\n`));

  if (params.notes) {
    P.push(escposNewLine());
    P.push(escposText(params.notes + '\n'));
  }

  P.push(escposNewLine(3));
  P.push(escposCut(false)); // corte total no Z
  return concat(P);
}
