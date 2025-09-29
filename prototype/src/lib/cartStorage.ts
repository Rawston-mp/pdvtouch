// src/lib/cartStorage.ts
// Rascunho de carrinho por COMANDA (orderId)
// Chaves no localStorage: pdv.cart.v1.<orderId>

export type CartItem = {
  id: string
  name: string
  unit: "unit" | "kg"
  price: number
  qty: number
  code?: string
}

const PREFIX = "pdv.cart.v1."
const CURRENT_KEY = "pdv.currentOrderId.v1"
const LOCK_PREFIX = "pdv.orderlock.v1."
const REQ_PREFIX = "pdv.orderlock.req.v1."
const ENV = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {}
const DEFAULT_LOCK_TTL_MS = Number(ENV.VITE_LOCK_TTL_MS) || 15000 // 15s padrão
const DEFAULT_LOCK_HEARTBEAT_MS = Number(ENV.VITE_LOCK_HEARTBEAT_MS) || 10000 // 10s padrão

function readNumberLS(key: string): number | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

function getTTL(): number {
  return readNumberLS('pdv.lock.ttlMs') ?? DEFAULT_LOCK_TTL_MS
}
function getHeartbeat(): number {
  return readNumberLS('pdv.lock.heartbeatMs') ?? DEFAULT_LOCK_HEARTBEAT_MS
}

function currentKey(ns?: string): string {
  return ns ? `${CURRENT_KEY}.${ns}` : CURRENT_KEY
}

function lockKey(orderId: number): string {
  return `${LOCK_PREFIX}${orderId}`
}

type OrderLock = { owner: string; ts: number }
type ReleaseReq = { by: string; ts: number }

/** Salva o rascunho de uma comanda específica. */
export function saveCartDraft(orderId: number, items: CartItem[]): void {
  if (!Number.isFinite(orderId)) return
  const key = PREFIX + String(orderId)
  localStorage.setItem(key, JSON.stringify(items ?? []))
}

/** Carrega o rascunho de uma comanda específica. */
export function loadCartDraft(orderId: number): CartItem[] | null {
  if (!Number.isFinite(orderId)) return null
  const key = PREFIX + String(orderId)
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    const arr = JSON.parse(raw) as CartItem[]
    return Array.isArray(arr) ? arr : null
  } catch {
    return null
  }
}

/** Exclui definitivamente o rascunho da comanda. */
export function removeCartDraft(orderId: number): void {
  if (!Number.isFinite(orderId)) return
  const key = PREFIX + String(orderId)
  localStorage.removeItem(key)
}

/** Lista de comandas com rascunho (simples, por varredura de chaves). */
export function listDraftOrders(): number[] {
  const out: number[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) || ""
    if (k.startsWith(PREFIX)) {
      const id = Number(k.slice(PREFIX.length))
      if (Number.isFinite(id)) out.push(id)
    }
  }
  return out.sort((a, b) => a - b)
}

/** Guarda a comanda "ativa" nesta estação. */
export function setCurrentOrderId(orderId: number, ns?: string): void {
  if (!Number.isFinite(orderId)) return
  if (orderId < 1 || orderId > 200) {
    // ignora valores fora do intervalo válido
  try { localStorage.removeItem(currentKey(ns)) } catch (err) { void err }
    return
  }
  localStorage.setItem(currentKey(ns), String(orderId))
}

export function getCurrentOrderId(ns?: string): number | null {
  const raw = localStorage.getItem(currentKey(ns))
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1 || n > 200) {
  try { localStorage.removeItem(currentKey(ns)) } catch (err) { void err }
    return null
  }
  return n
}

export function clearCurrentOrderId(ns?: string): void {
  localStorage.removeItem(currentKey(ns))
}

/** Obtém informações do lock da comanda (se existir e não expirado). */
export function getOrderLockInfo(orderId: number): OrderLock | null {
  if (!Number.isFinite(orderId)) return null
  const raw = localStorage.getItem(lockKey(orderId))
  if (!raw) return null
  try {
    const obj = JSON.parse(raw) as OrderLock
    if (!obj?.owner || !obj?.ts) return null
    const age = Date.now() - Number(obj.ts)
    if (age > getTTL()) return null
    return obj
  } catch (err) {
    void err
    return null
  }
}

/** Tenta adquirir o lock desta comanda para um determinado owner (ex.: u:<id>). */
export function acquireOrderLock(orderId: number, owner: string): boolean {
  if (!Number.isFinite(orderId) || !owner) return false
  const k = lockKey(orderId)
  try {
    const existing = getOrderLockInfo(orderId)
    if (existing && existing.owner !== owner) return false
    const payload: OrderLock = { owner, ts: Date.now() }
    localStorage.setItem(k, JSON.stringify(payload))
    return true
  } catch (err) {
    void err
    return false
  }
}

/** Renova o lock (batimento). Se expirado ou já nosso, regrava. */
export function renewOrderLock(orderId: number, owner: string): boolean {
  if (!Number.isFinite(orderId) || !owner) return false
  const existing = getOrderLockInfo(orderId)
  if (existing && existing.owner !== owner) return false
  try {
    localStorage.setItem(lockKey(orderId), JSON.stringify({ owner, ts: Date.now() }))
    return true
  } catch (err) {
    void err
    return false
  }
}

/** Libera o lock se o owner for o atual ou se estiver expirado. */
export function releaseOrderLock(orderId: number, owner: string): void {
  if (!Number.isFinite(orderId) || !owner) return
  try {
    const raw = localStorage.getItem(lockKey(orderId))
    if (!raw) return
    const obj = JSON.parse(raw) as OrderLock
    const expired = Date.now() - Number(obj?.ts) > getTTL()
    if (expired || obj?.owner === owner) {
      localStorage.removeItem(lockKey(orderId))
    }
  } catch (err) {
    void err
  }
}

export function isOrderLockedByOther(orderId: number, owner: string): boolean {
  const info = getOrderLockInfo(orderId)
  return !!(info && info.owner !== owner)
}

export function getLockTimings() {
  return { ttlMs: getTTL(), heartbeatMs: getHeartbeat() }
}

export function setLockTimings(values: { ttlMs?: number | null; heartbeatMs?: number | null }) {
  const { ttlMs, heartbeatMs } = values
  try {
    if (ttlMs && Number.isFinite(ttlMs) && ttlMs > 0) localStorage.setItem('pdv.lock.ttlMs', String(ttlMs))
    else if (ttlMs === null) localStorage.removeItem('pdv.lock.ttlMs')
  } catch (err) { void err }
  try {
    if (heartbeatMs && Number.isFinite(heartbeatMs) && heartbeatMs > 0) localStorage.setItem('pdv.lock.heartbeatMs', String(heartbeatMs))
    else if (heartbeatMs === null) localStorage.removeItem('pdv.lock.heartbeatMs')
  } catch (err) { void err }
}

/** Lista locks ativos (não expirados) de todas as comandas. */
export function listOrderLocks(): Array<{ orderId: number; owner: string; ts: number }> {
  const out: Array<{ orderId: number; owner: string; ts: number }> = []
  const ttl = getTTL()
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) || ''
    if (!k.startsWith(LOCK_PREFIX)) continue
    const idStr = k.slice(LOCK_PREFIX.length)
    const id = Number(idStr)
    if (!Number.isFinite(id)) continue
    try {
      const raw = localStorage.getItem(k)
      if (!raw) continue
      const obj = JSON.parse(raw) as OrderLock
      if (!obj?.owner || !obj?.ts) continue
      const age = Date.now() - Number(obj.ts)
      if (age > ttl) continue
      out.push({ orderId: id, owner: obj.owner, ts: Number(obj.ts) })
    } catch (err) {
      void err
    }
  }
  return out.sort((a, b) => a.orderId - b.orderId)
}

/** Solicita liberação do lock para uma comanda (fica visível para quem detém o lock). TTL ~10min. */
export function requestOrderRelease(orderId: number, requester: string): boolean {
  if (!Number.isFinite(orderId) || !requester) return false
  try {
    const payload: ReleaseReq = { by: requester, ts: Date.now() }
    localStorage.setItem(REQ_PREFIX + String(orderId), JSON.stringify(payload))
    return true
  } catch { return false }
}

/** Obtém uma solicitação de liberação da comanda, se não expirou. */
export function getOrderReleaseRequest(orderId: number): ReleaseReq | null {
  if (!Number.isFinite(orderId)) return null
  try {
    const raw = localStorage.getItem(REQ_PREFIX + String(orderId))
    if (!raw) return null
    const obj = JSON.parse(raw) as ReleaseReq
    if (!obj?.by || !obj?.ts) return null
    const age = Date.now() - Number(obj.ts)
    const TTL = 10 * 60 * 1000 // 10 minutos
    if (age > TTL) return null
    return obj
  } catch { return null }
}

export function clearOrderReleaseRequest(orderId: number): void {
  try { localStorage.removeItem(REQ_PREFIX + String(orderId)) } catch { /* ignore */ }
}

export function listOrderReleaseRequests(): Array<{ orderId: number; by: string; ts: number }> {
  const out: Array<{ orderId: number; by: string; ts: number }> = []
  const TTL = 10 * 60 * 1000
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) || ''
    if (!k.startsWith(REQ_PREFIX)) continue
    const id = Number(k.slice(REQ_PREFIX.length))
    if (!Number.isFinite(id)) continue
    try {
      const raw = localStorage.getItem(k)
      if (!raw) continue
      const obj = JSON.parse(raw) as ReleaseReq
      if (!obj?.by || !obj?.ts) continue
      const age = Date.now() - Number(obj.ts)
      if (age > TTL) continue
      out.push({ orderId: id, by: obj.by, ts: Number(obj.ts) })
    } catch { /* ignore */ }
  }
  return out.sort((a, b) => a.orderId - b.orderId)
}