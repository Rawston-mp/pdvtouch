// src/lib/comandaUsage.ts
// Rastreamento simples de "comandas em uso" além dos locks: quando a venda é concluída
// e a comanda permanece com o cliente aguardando devolução ao caixa.

const USAGE_PREFIX = 'pdv.comanda.usage.v1.'

export type ComandaUsage = {
  state: 'AWAITING_RETURN'
  holder?: string // ex.: 'u:<id>'
  ts: number // quando marcado
}

function key(orderId: number): string {
  return `${USAGE_PREFIX}${orderId}`
}

export function markAwaitingReturn(orderId: number, holder?: string): boolean {
  if (!Number.isFinite(orderId) || orderId < 1 || orderId > 200) return false
  try {
    const payload: ComandaUsage = { state: 'AWAITING_RETURN', holder, ts: Date.now() }
    localStorage.setItem(key(orderId), JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function clearUsage(orderId: number): void {
  if (!Number.isFinite(orderId)) return
  try { localStorage.removeItem(key(orderId)) } catch { /* ignore */ }
}

export function getUsage(orderId: number): ComandaUsage | null {
  if (!Number.isFinite(orderId)) return null
  try {
    const raw = localStorage.getItem(key(orderId))
    if (!raw) return null
    const obj = JSON.parse(raw) as ComandaUsage
    if (obj?.state === 'AWAITING_RETURN') return obj
    return null
  } catch {
    return null
  }
}

export function listAwaitingReturn(): Array<{ orderId: number; holder?: string; ts: number }>
{
  const out: Array<{ orderId: number; holder?: string; ts: number }> = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) || ''
    if (!k.startsWith(USAGE_PREFIX)) continue
    const idStr = k.slice(USAGE_PREFIX.length)
    const id = Number(idStr)
    if (!Number.isFinite(id)) continue
    try {
      const raw = localStorage.getItem(k)
      if (!raw) continue
      const obj = JSON.parse(raw) as ComandaUsage
      if (obj?.state !== 'AWAITING_RETURN') continue
      out.push({ orderId: id, holder: obj.holder, ts: Number(obj.ts) })
    } catch {
      // ignore
    }
  }
  return out.sort((a, b) => a.orderId - b.orderId)
}
