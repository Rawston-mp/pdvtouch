// src/lib/escposCupom.ts
import type { Order } from '../db/models'
import type { Printer, Settings } from '../db'
// Usa API simples do escpos.ts: vamos gerar linhas de texto compatíveis

const money = (v:number) => 'R$ ' + v.toFixed(2)
const line = (w=32) => '─'.repeat(w)
const fmt = (ts:number) => new Date(ts).toLocaleDateString() + ' ' + new Date(ts).toLocaleTimeString()

export function ticketCupomCliente(opts: {
  order: Order
  settings: Settings
  printer: Printer
  nfce?: { chaveAcesso: string; urlConsulta: string; qrCodeConteudo: string }
}) {
  const { order, settings, nfce } = opts
  const c = {
    init: '',
    alignCenter: '',
    alignLeft: '',
    alignRight: '',
    boldOn: '',
    boldOff: '',
    cutPartial: ''
  }
  const rows: string[] = []

  rows.push(c.init)

  // Cabeçalho custom
  rows.push(c.alignCenter + c.boldOn)
  const header = [settings.companyName, `CNPJ ${settings.cnpj}`, `${settings.addressLine1 ?? ''}`]
    .filter(Boolean) as string[]
  header.forEach((l: string) => rows.push(l))
  rows.push(c.boldOff)

  rows.push(line())
  rows.push(c.alignLeft + `Cupom ${order.receiptMode === 'NAO_FISCAL' ? 'NÃO FISCAL' : 'FISCAL'}`)
  rows.push(`Data: ${fmt(order.createdAt)}   Pedido: ${order.id.slice(0,8)}`)
  rows.push(line())

  // Itens
  for (const it of order.items) {
    rows.push(`${it.name}`)
    rows.push(`  ${it.qty} x ${money(it.unitPrice)}   =   ${money(it.total)}`)
  }
  rows.push(line())

  // Totais
  rows.push(c.alignRight + c.boldOn + `TOTAL: ${money(order.total)}` + c.boldOff)
  rows.push(c.alignLeft)

  // Pagamentos
  if (order.payments?.length) {
    rows.push('Pagamentos:')
    order.payments.forEach(p => {
      rows.push(`  ${p.method}${p.authCode ? ` (${p.authCode})` : ''}: ${money(p.amount)}`)
    })
    rows.push(line())
  }

  // Identificação (quando fiscal)
  if (order.receiptMode === 'FISCAL_NFCE' && order.customerIdType && order.customerIdType !== 'NONE') {
    rows.push(`Dest.: ${order.customerIdType} ${order.customerTaxId}`)
  }

  // NFC-e (mock)
  if (nfce) {
    rows.push(line())
    rows.push('NFC-e (mock)')
    rows.push(`Chave: ${nfce.chaveAcesso}`)
    rows.push(`Consulta: ${nfce.urlConsulta}`)
    rows.push('(QR impresso no DANFE NFC-e)')
  }

  // Rodapé custom
  rows.push(line())
  // Footer padrão (se desejar, customize aqui no futuro)
  rows.push(c.alignCenter + 'Impresso: ' + fmt(Date.now()))
  rows.push('\n' + c.cutPartial)

  return rows.join('\n')
}
