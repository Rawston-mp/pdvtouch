import { db, type Product } from '../db'
import { syncProdutosFromBackoffice, deltaSyncProdutos } from '../services/syncClient'

const LS_FULL = 'pdv.sync.products.lastFull'
const LS_DELTA = 'pdv.sync.products.lastDelta'
const LS_BASE = 'pdv.backofficeBaseUrl'

export function getSyncMarkers() {
  return {
    lastFull: Number(localStorage.getItem(LS_FULL) || '0'),
    lastDelta: Number(localStorage.getItem(LS_DELTA) || '0'),
  }
}

function setFull(now: number) { localStorage.setItem(LS_FULL, String(now)); localStorage.setItem(LS_DELTA, String(now)) }
function setDelta(now: number) { localStorage.setItem(LS_DELTA, String(now)) }

export async function ensureCatalog() {
  const count = await db.products.count()
  const { lastFull } = getSyncMarkers()
  if (count === 0 || !lastFull) {
    await fullSync()
  }
}

export async function fullSync(): Promise<{ inserted: number }> {
  const base = (localStorage.getItem(LS_BASE) || '').trim()
  if (!base) throw new Error('Backoffice não configurado.')
  const res = await syncProdutosFromBackoffice(base)
  setFull(Date.now())
  return res
}

export async function runDelta(): Promise<{ mode: string; changed?: number; removed?: number }> {
  const base = (localStorage.getItem(LS_BASE) || '').trim()
  if (!base) throw new Error('Backoffice não configurado.')
  try {
    const r = await deltaSyncProdutos(base)
    if (r.mode === 'full') return r
    setDelta(Date.now())
    return r
  } catch (err) {
    // falha silenciosa em offline
    if ((err as Error)?.message?.includes('Failed to fetch')) return { mode: 'offline' }
    throw err
  }
}

let timer: number | null = null
export function startCatalogScheduler(intervalMs = 120000) {
  stopCatalogScheduler()
  const tick = async () => {
    try { await runDelta() } catch (err) { void err }
    timer = window.setTimeout(tick, intervalMs)
  }
  timer = window.setTimeout(tick, intervalMs)
}
export function stopCatalogScheduler() {
  if (timer) { clearTimeout(timer); timer = null }
}

// Util para UI
export function catalogStatus() {
  const { lastFull, lastDelta } = getSyncMarkers()
  const now = Date.now()
  const age = lastDelta ? Math.round((now - lastDelta) / 1000) : null
  return { lastFull, lastDelta, ageSeconds: age }
}

// Inicialização opcional (chamada manual em App quando quiser)
export async function bootstrapCatalog() {
  await ensureCatalog()
  startCatalogScheduler()
}

// Mini função para consumo em testes
export async function listLocalProducts(): Promise<Product[]> { return db.products.toArray() }

// Purga completa (força catálogo vazio). NÃO chama sync.
export async function purgeLocalCatalog() {
  await db.products.clear()
  try {
    localStorage.removeItem('pdv.sync.products.lastFull')
    localStorage.removeItem('pdv.sync.products.lastDelta')
  } catch (err) { void err }
  return { cleared: true }
}
