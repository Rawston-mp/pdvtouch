// src/db/counters.ts
import { initDb } from './index'
// Counters/closures não existem no schema atual; manter helpers locais e usar settings/sales se necessário.
type ZClosure = { id?: number; createdAt: number; total: number; notes?: string }
// Order conforme o modelo de domínio (simplificado)
type Order = { total: number; payments?: Array<{ method: string; amount: number }> }

export function startOfDay(ts: number) {
  const d = new Date(ts); d.setHours(0,0,0,0); return +d
}
export function now() { return Date.now() }

// No schema atual não há 'counters' nem 'closures'. Mantemos stubs inofensivos.
export async function ensureCounters() { await initDb(); return }
export async function getZBaseline(): Promise<number> { await ensureCounters(); return startOfDay(now()) }
export async function setZBaseline(_: number) { await ensureCounters(); return }
export async function saveZClosure(_: Omit<ZClosure, 'id'>) { await initDb(); return }
export async function listZClosures(_: number = 20): Promise<ZClosure[]> { await initDb(); return [] }

/** Agrega totais para o período [from, to] a partir das orders pagas */
export function summarize(orders: Order[]) {
  const count = orders.length
  const gross = orders.reduce((a, o) => a + o.total, 0)
  const byMethod: Record<string, number> = {}
  for (const o of orders) {
    for (const p of o.payments ?? []) {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount
    }
  }
  return { count, gross, byMethod }
}
