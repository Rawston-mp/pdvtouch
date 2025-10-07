import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '../db'
import { fullSync, runDelta, listLocalProducts, getSyncMarkers } from './catalogSync'

// Util para mockar fetch
interface MockResponse { ok: boolean; status: number; json: () => Promise<any> }
function mockFetchOnce(payload: unknown, ok = true, status = 200) {
  ;(globalThis as any).fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => payload,
  } as MockResponse)
}

describe('catalogSync', () => {
  beforeEach(async () => {
    // Limpa DB e localStorage entre testes
    await db.products.clear()
    localStorage.clear()
    // Config base
    localStorage.setItem('pdv.backofficeBaseUrl', 'http://x')
  })

  it('fullSync importa produtos', async () => {
    mockFetchOnce({ items: [ { id: 'p1', descricao: 'Item 1', unidade: 'UN', preco: 10 } ] })
    const r = await fullSync()
    expect(r.inserted).toBe(1)
    const prods = await listLocalProducts()
    expect(prods.length).toBe(1)
    const markers = getSyncMarkers()
    expect(markers.lastFull).toBeGreaterThan(0)
  })

  it('runDelta faz fallback full se 404', async () => {
    // Primeiro delta 404 → fallback full
    ;(globalThis as any).fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 } as MockResponse)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ items: [ { id: 'p2', descricao: 'X', unidade: 'UN', preco: 5 } ] }) } as MockResponse)
    const res = await runDelta()
    expect(res.mode).toBe('full')
    const all = await listLocalProducts()
    expect(all.length).toBe(1)
  })

  it('delta aplica mudanças e removed', async () => {
    // full inicial
    mockFetchOnce({ items: [ { id: 'pA', descricao: 'A', unidade: 'UN', preco: 1 } ] })
    await fullSync()
    // delta com troca de nome + remoção
  ;(globalThis as any).fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ current: Date.now(), products: [ { id: 'pA', descricao: 'A2', unidade: 'UN', preco: 2 } ], removed: ['pX'] }) } as MockResponse)
    const r = await runDelta()
    expect(r.mode).toBe('delta')
    const rows = await listLocalProducts()
    expect(rows[0].name).toBe('A2')
  })
})
