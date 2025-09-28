// src/db/counters.ts
import { db, initDb } from './index'
import type { Counters, ZClosure, Order } from './models'

export function startOfDay(ts: number) {
  const d = new Date(ts); d.setHours(0,0,0,0); return +d
}
export function now() { return Date.now() }

export async function ensureCounters() {
  await initDb()
  const c = await db.counters.get('acc')
  if (!c) await db.counters.add({ id: 'acc', zBaseline: startOfDay(now()) } as Counters)
}

export async function getZBaseline(): Promise<number> {
  await ensureCounters()
  const c = await db.counters.get('acc')
  return c!.zBaseline
}

export async function setZBaseline(ts: number) {
  await ensureCounters()
  await db.counters.put({ id: 'acc', zBaseline: ts })
}

export async function saveZClosure(entry: Omit<ZClosure, 'id'>) {
  await initDb()
  await db.closures.add({ ...entry })
}

export async function listZClosures(limit = 20): Promise<ZClosure[]> {
  await initDb()
  return db.closures.orderBy('createdAt').reverse().limit(limit).toArray()
}

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
