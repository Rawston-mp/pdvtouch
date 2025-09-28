// src/lib/escposTurno.ts
import type { Printer, Settings } from '../db/models'
import { profileCommands, ticketHeader } from './escpos'

const line = (w = 32) => '─'.repeat(w)
const money = (v: number) => 'R$ ' + v.toFixed(2)
const fmt = (ts: number) => new Date(ts).toLocaleDateString() + ' ' + new Date(ts).toLocaleTimeString()

export function ticketFechamentoTurno(opts: {
  settings: Settings
  printer: Printer
  data: {
    user?: string
    openedAt: number
    closedAt: number
    openingAmount: number
    closingAmount: number
    suprimento: number
    sangria: number
    saldoTeorico: number
  }
}) {
  const { settings, printer, data } = opts
  const c = profileCommands(printer.profile)
  const rows: string[] = []
  rows.push(c.init)
  rows.push(ticketHeader(settings, c))
  rows.push(c.alignLeft + line())
  rows.push(c.alignCenter + c.boldOn + c.doubleOn + 'FECHAMENTO DE TURNO' + c.doubleOff + c.boldOff)
  if (printer?.name) rows.push(c.alignCenter + `Impressora: ${printer.name}`)
  rows.push(line())
  rows.push(`Operador: ${data.user || '-'}`)
  rows.push(`Abertura: ${fmt(data.openedAt)}`)
  rows.push(`Fechamento: ${fmt(data.closedAt)}`)
  rows.push(line())
  rows.push(`Abertura (fundo): ${money(data.openingAmount)}`)
  rows.push(`Suprimentos:       ${money(data.suprimento)}`)
  rows.push(`Sangrias:          ${money(data.sangria)}`)
  rows.push(line())
  rows.push(`Saldo teórico:     ${money(data.saldoTeorico)}`)
  rows.push(`Conferido (gaveta): ${money(data.closingAmount)}`)
  rows.push(line())
  rows.push(c.alignCenter + 'Impresso: ' + fmt(Date.now()))
  rows.push('\n' + c.cutPartial)
  return rows.join('\n')
}
