// src/lib/escposCupom.ts
import type { Order, Settings, Printer } from '../db/models'
import { profileCommands, ticketHeader } from './escpos'

const line = (w = 32) => '─'.repeat(w)
const money = (v: number) => 'R$ ' + v.toFixed(2)
const fmtDate = (ts: number) => new Date(ts).toLocaleDateString() + ' ' + new Date(ts).toLocaleTimeString()

// QRCode mock (substituir por módulo QR em impressora real)
function qrMock(content: string) {
  const delim = '█'
  return [
    'QR (mock):',
    content,
    delim.repeat(Math.min(32, content.length))
  ].join('\n')
}

// Gera o cupom do cliente (não fiscal / fiscal NFC-e / fiscal SAT legado)
export function ticketCupomCliente(opts: {
  order: Order
  settings: Settings
  printer: Printer
  nfce?: {
    chaveAcesso?: string        // mock
    urlConsulta?: string        // mock
    qrCodeConteudo?: string     // mock
  }
}) {
  const { order, settings, printer, nfce } = opts
  const c = profileCommands(printer.profile)
  const rows: string[] = []

  rows.push(c.init)
  rows.push(ticketHeader(settings, c))
  rows.push(c.alignLeft + line())

  // título conforme modo
  if (order.receiptMode === 'FISCAL_NFCE') {
    rows.push(c.alignCenter + c.boldOn + c.doubleOn + 'CUPOM FISCAL (NFC-e)' + c.doubleOff + c.boldOff)
  } else if (order.receiptMode === 'FISCAL_SAT') {
    rows.push(c.alignCenter + c.boldOn + c.doubleOn + 'CUPOM FISCAL (CF-e-SAT)' + c.doubleOff + c.boldOff)
  } else {
    rows.push(c.alignCenter + c.boldOn + c.doubleOn + 'ORÇAMENTO / NÃO FISCAL' + c.doubleOff + c.boldOff)
  }

  rows.push(c.alignLeft + `Pedido: ${order.id}`)
  rows.push(c.alignLeft + `Data: ${fmtDate(order.createdAt)}`)
  if (order.customerIdType && order.customerIdType !== 'NONE' && order.customerTaxId) {
    rows.push(c.alignLeft + `${order.customerIdType}: ${maskTaxId(order.customerTaxId, order.customerIdType)}`)
  }
  rows.push(line())

  // itens
  for (const it of order.items) {
    const q = it.isWeight ? `${it.qty.toFixed(3)} kg` : `${it.qty}x`
    rows.push(`${truncate(it.name, 28)}  ${q}`)
    rows.push(`${' '.repeat(2)}${money(it.unitPrice)}  →  ${money(it.total)}`)
  }
  rows.push(line())
  rows.push(c.alignLeft + `TOTAL: ${money(order.total)}`)

  // pagamentos
  if (order.payments?.length) {
    rows.push(line())
    rows.push('Pagamentos:')
    for (const p of order.payments) {
      const label =
        p.method === 'CASH' ? 'Dinheiro' :
        p.method === 'PIX' ? 'PIX' :
        p.method === 'TEF' ? 'Cartão (TEF)' :
        p.method === 'VOUCHER' ? 'Voucher' : p.method
      rows.push(`  ${label}: ${money(p.amount)}${p.authCode ? '  AUT: ' + p.authCode : ''}`)
    }
  }

  // blocos fiscais (mock)
  if (order.receiptMode === 'FISCAL_NFCE') {
    rows.push(line())
    if (nfce?.chaveAcesso) rows.push(c.alignCenter + 'Chave de Acesso:')
    if (nfce?.chaveAcesso) rows.push(c.alignCenter + nfce.chaveAcesso)
    if (nfce?.urlConsulta) rows.push(c.alignCenter + nfce.urlConsulta)
    if (nfce?.qrCodeConteudo) {
      rows.push('')
      rows.push(qrMock(nfce.qrCodeConteudo))
    } else {
      rows.push(c.alignCenter + '(QR Code NFC-e — mock)')
    }
  } else if (order.receiptMode === 'FISCAL_SAT') {
    rows.push(line())
    rows.push(c.alignCenter + '(Bloco CF-e-SAT — mock)')
  } else {
    rows.push(line())
    rows.push(c.alignCenter + 'Documento não fiscal (orçamento)')
  }

  rows.push('\n' + c.cutPartial)
  return rows.join('\n')
}

function truncate(s: string, len: number) { return s.length > len ? s.slice(0, len - 1) + '…' : s }
function onlyDigits(s: string) { return (s || '').replace(/\D+/g, '') }
function maskTaxId(v: string, t: 'CPF' | 'CNPJ') {
  const d = onlyDigits(v)
  if (t === 'CPF' && d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, r('$1.$2.$3-$4'))
  if (t === 'CNPJ' && d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, r('$1.$2.$3/$4-$5'))
  return v
}
const r = (fmt: string) => (_: string, ...g: string[]) => fmt.replace(/\$(\d)/g, (_, i) => g[+i - 1] || '')
