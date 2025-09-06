// src/lib/csv.ts
import type { Order } from '../db/models'

export function toCsv(rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return rows.map(r => r.map(escape).join(';')).join('\n')
}

export function download(filename: string, text: string, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportOrdersCSV(orders: Order[], fname = 'vendas.csv') {
  const header = ['orderId', 'data', 'total', 'status', 'pagamentos']
  const rows = [header]
  for (const o of orders) {
    const pay = (o.payments ?? []).map(p => `${p.method}:${p.amount.toFixed(2)}`).join('|')
    rows.push([o.id, new Date(o.createdAt).toISOString(), o.total.toFixed(2), o.status, pay])
  }
  download(fname, toCsv(rows))
}

export function exportItemsCSV(orders: Order[], fname = 'itens.csv') {
  const header = ['orderId', 'data', 'item', 'qtd', 'precoUnit', 'total', 'porPeso']
  const rows = [header]
  for (const o of orders) {
    for (const it of o.items) {
      rows.push([
        o.id,
        new Date(o.createdAt).toISOString(),
        it.name,
        it.isWeight ? it.qty.toFixed(3) : it.qty,
        it.unitPrice.toFixed(2),
        it.total.toFixed(2),
        it.isWeight ? 'sim' : 'nao'
      ])
    }
  }
  download(fname, toCsv(rows))
}
