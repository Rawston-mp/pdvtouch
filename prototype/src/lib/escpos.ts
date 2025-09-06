// src/lib/escpos.ts
import type { OrderItem, Printer, Settings } from '../db/models'

/** Perfis de comandos ESC/POS */
export function profileCommands(profile: Printer['profile']) {
  const ESC = '\x1B', GS = '\x1D'
  switch (profile) {
    case 'ELGIN':
      return {
        init: ESC + '@',
        alignLeft: ESC + 'a' + '\x00',
        alignCenter: ESC + 'a' + '\x01',
        boldOn: ESC + 'E' + '\x01',
        boldOff: ESC + 'E' + '\x00',
        doubleOn: GS + '!' + '\x11',
        doubleOff: GS + '!' + '\x00',
        cutPartial: GS + 'V' + '\x01',
        cutFull: GS + 'V' + '\x00'
      }
    case 'BEMATECH':
      return {
        init: ESC + '@',
        alignLeft: ESC + 'a' + '\x00',
        alignCenter: ESC + 'a' + '\x01',
        boldOn: ESC + 'E' + '\x01',
        boldOff: ESC + 'E' + '\x00',
        doubleOn: ESC + '!' + '\x30',
        doubleOff: ESC + '!' + '\x00',
        cutPartial: '\x1D' + 'V' + '\x42' + '\x00',
        cutFull: '\x1D' + 'V' + '\x41' + '\x00'
      }
    default: // GENERIC
      return {
        init: ESC + '@',
        alignLeft: ESC + 'a' + '\x00',
        alignCenter: ESC + 'a' + '\x01',
        boldOn: ESC + 'E' + '\x01',
        boldOff: ESC + 'E' + '\x00',
        doubleOn: GS + '!' + '\x11',
        doubleOff: GS + '!' + '\x00',
        cutPartial: GS + 'V' + '\x01',
        cutFull: GS + 'V' + '\x00'
      }
  }
}

const line = (w = 32) => '─'.repeat(w)
const money = (v: number) => 'R$ ' + v.toFixed(2)
const fmtDate = (ts: number) => new Date(ts).toLocaleDateString() + ' ' + new Date(ts).toLocaleTimeString()

export function ticketHeader(s: Settings, cmds = profileCommands('GENERIC')) {
  const rows: string[] = []
  rows.push(cmds.alignCenter + cmds.boldOn + cmds.doubleOn + (s.companyName || 'Empresa') + cmds.doubleOff + cmds.boldOff)
  if (s.cnpj) rows.push(cmds.alignCenter + 'CNPJ: ' + s.cnpj)
  if (s.addressLine1) rows.push(cmds.alignCenter + s.addressLine1)
  if (s.addressLine2) rows.push(cmds.alignCenter + s.addressLine2)
  return rows.join('\n')
}

// ---------- Relatórios X/Z ----------
export function ticketX(
  s: Settings,
  periodo: { from: number; to: number },
  totals: { count: number; gross: number; byMethod: Record<string, number> },
  printer: Printer
) {
  const c = profileCommands(printer.profile)
  const rows: string[] = []
  rows.push(c.init)
  rows.push(ticketHeader(s, c))
  rows.push(c.alignLeft + line())
  rows.push(c.alignCenter + c.boldOn + c.doubleOn + 'RELATÓRIO X' + c.doubleOff + c.boldOff)
  rows.push(c.alignLeft + `Período: ${fmtDate(periodo.from)} → ${fmtDate(periodo.to)}`)
  rows.push(line())
  rows.push(`Vendas (qtd): ${totals.count}`)
  rows.push(`Faturamento bruto: ${money(totals.gross)}`)
  rows.push(line())
  rows.push('Por método de pagamento:')
  if (Object.keys(totals.byMethod).length === 0) rows.push('  —')
  else for (const [m, v] of Object.entries(totals.byMethod)) rows.push(`  ${m.padEnd(8)} ${money(v)}`)
  rows.push(line())
  rows.push(c.alignCenter + 'Impresso: ' + fmtDate(Date.now()))
  rows.push('\n\n' + c.cutPartial)
  return rows.join('\n')
}

export function ticketZ(
  s: Settings,
  periodo: { from: number; to: number },
  totals: { count: number; gross: number; byMethod: Record<string, number> },
  printer: Printer,
  zNumber: number
) {
  const c = profileCommands(printer.profile)
  const rows: string[] = []
  rows.push(c.init)
  rows.push(ticketHeader(s, c))
  rows.push(c.alignLeft + line())
  rows.push(c.alignCenter + c.boldOn + c.doubleOn + 'FECHAMENTO Z' + c.doubleOff + c.boldOff)
  rows.push(c.alignCenter + `Z#: ${zNumber}`)
  rows.push(c.alignLeft + `Período: ${fmtDate(periodo.from)} → ${fmtDate(periodo.to)}`)
  rows.push(line())
  rows.push(`Vendas (qtd): ${totals.count}`)
  rows.push(`Faturamento bruto: ${money(totals.gross)}`)
  rows.push(line())
  rows.push('Por método de pagamento:')
  if (Object.keys(totals.byMethod).length === 0) rows.push('  —')
  else for (const [m, v] of Object.entries(totals.byMethod)) rows.push(`  ${m.padEnd(8)} ${money(v)}`)
  rows.push(line())
  rows.push(c.alignCenter + 'Emitido: ' + fmtDate(Date.now()))
  rows.push('\n\n' + c.cutFull)
  return rows.join('\n')
}

// ---------- Tickets de produção (Cozinha/Bar) ----------
export function ticketKitchen(title: string, items: OrderItem[], printer: Printer, orderId?: string) {
  const c = profileCommands(printer.profile)
  const rows: string[] = []
  rows.push(c.init)

  // cabeçalho com nome do destino + APELIDO da impressora
  rows.push(c.alignCenter + c.boldOn + title.toUpperCase() + c.boldOff)
  if (printer?.name) rows.push(c.alignCenter + `Impressora: ${printer.name}`)

  if (orderId) rows.push(c.alignCenter + `Pedido: ${orderId}`)
  rows.push(line())

  for (const it of items) {
    const q = it.isWeight ? `${it.qty.toFixed(3)} kg` : `${it.qty}x`
    rows.push(`${it.name}  ${q}`)
  }

  rows.push(line())
  rows.push(c.alignCenter + fmtDate(Date.now()))
  rows.push('\n' + c.cutPartial)
  return rows.join('\n')
}
