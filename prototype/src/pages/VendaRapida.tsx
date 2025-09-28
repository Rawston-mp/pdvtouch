// src/pages/VendaRapida.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { listProducts } from '../db/products'
import type { Product } from '../db'
import { requestWeight, printText } from '../mock/devices'
import {
  saveCartDraft,
  loadCartDraft,
  setCurrentOrderId,
  getCurrentOrderId,
  clearCurrentOrderId,
  acquireOrderLock,
  renewOrderLock,
  releaseOrderLock,
  isOrderLockedByOther,
  getOrderLockInfo,
  getLockTimings,
  type CartItem,
} from '../lib/cartStorage'
import { useSession } from '../auth/session'

type Category = 'Pratos' | 'Bebidas' | 'Sobremesas' | 'Por Peso'
const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'Pratos', label: 'Pratos' },
  { key: 'Bebidas', label: 'Bebidas' },
  { key: 'Sobremesas', label: 'Sobremesas' },
  { key: 'Por Peso', label: 'Por Peso' },
]

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
const fmt = (v: unknown) => num(v).toFixed(2)

function isByWeight(p: Product): boolean {
  if (p.byWeight === true) return true
  const unitVal = (p as Record<string, unknown>)?.unit
  const unit = typeof unitVal === 'string' ? unitVal.toLowerCase() : ''
  return unit === 'kg' || unit === 'peso' || unit === 'weight'
}
function getCategory(p: Product): Category {
  if (p.category === 'Bebidas' || p.category === 'Sobremesas' || p.category === 'Pratos') {
    return p.category
  }
  return 'Pratos'
}

export default function VendaRapida() {
  const nav = useNavigate()
  const { user } = useSession()
  const roleRaw = (user?.role ?? 'CAIXA') as string
  const role = roleRaw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
  const isBalancaRole = role.startsWith('BALANCA')

  // Namespace por estação (usuário) para isolar a comanda atual no storage
  const stationNs = useMemo(() => (user?.id ? `u:${user.id}` : undefined), [user?.id])

  const canFinalize =
    role === 'ADMIN' || role === 'GERENTE' || role === 'CAIXA' || role === 'ATENDENTE'

  // catálogo
  const [catalog, setCatalog] = useState<Product[]>([])
  const [activeCat, setActiveCat] = useState<Category>('Pratos')
  const [search, setSearch] = useState('')

  // campo único (comanda ou código/PLU)
  const [unifiedInput, setUnifiedInput] = useState('')

  // estado do carrinho
  const [cart, setCart] = useState<CartItem[]>([])
  const [quickQty, setQuickQty] = useState<string>('0')
  const [pesoItemId, setPesoItemId] = useState<string | null>(null)

  // comanda
  const [orderId, setOrderId] = useState<number | null>(null)
  const orderActive = orderId != null
  const [lockOwner, setLockOwner] = useState<string | null>(null)
  const [lockSeconds, setLockSeconds] = useState<number>(0)

  // boot
  useEffect(() => {
    ;(async () => {
      const prods = await listProducts()
      setCatalog(prods || [])

  const current = getCurrentOrderId(stationNs)
      if (current != null && current >= 1 && current <= 200) {
        setOrderId(current)
        const loaded = loadCartDraft(current)
        if (loaded) {
          setCart(loaded.map((d) => ({ ...d, price: num(d.price), qty: num(d.qty) })))
        }
      } else if (current != null) {
        // valor inválido (ex.: 0) encontrado no storage — limpa
        clearCurrentOrderId(stationNs)
      }
    })()
  }, [stationNs])

  // Observa lock para indicador visual
  useEffect(() => {
    if (!orderActive || orderId == null) { setLockOwner(null); setLockSeconds(0); return }
    const owner = stationNs || 'local'
    const tick = () => {
      try {
        const info = getOrderLockInfo(orderId)
        if (!info) { setLockOwner(null); setLockSeconds(0); return }
        const ttl = getLockTimings().ttlMs
        const age = Date.now() - Number(info.ts)
        const secs = Math.max(0, Math.ceil((ttl - age) / 1000))
        setLockSeconds(secs)
        setLockOwner(info.owner === owner ? owner : 'other')
      } catch (err) { void err }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [orderActive, orderId, stationNs])

  // persistência POR COMANDA: salva toda vez que carrinho muda
  useEffect(() => {
    if (orderActive) saveCartDraft(orderId!, cart)
  }, [cart, orderActive, orderId])

  /** Próximo cliente (BALANÇA): salva rascunho da comanda e limpa a UI.
   *  NÃO apaga o rascunho salvo.
   */
  const nextClient = useCallback(() => {
    if (!orderActive) return
    saveCartDraft(orderId!, cart)
    setCart([])
    setPesoItemId(null)
    setQuickQty('0')
    if (orderId != null) {
      try { releaseOrderLock(orderId, stationNs || 'local') } catch (err) { void err }
    }
    clearCurrentOrderId(stationNs)
    setOrderId(null)
  }, [orderActive, orderId, cart, stationNs])

  // ESC = Próximo cliente somente BALANÇA
  useEffect(() => {
    if (!isBalancaRole) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        nextClient()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isBalancaRole, orderId, cart, nextClient])

  // Mantém o lock renovado enquanto a comanda estiver ativa nesta estação
  useEffect(() => {
    if (!orderActive || orderId == null) return
    const id = setInterval(() => {
      try { renewOrderLock(orderId, stationNs || 'local') } catch (err) { void err }
    }, 10000) // 10s
    return () => clearInterval(id)
  }, [orderActive, orderId, stationNs])

  const filtered = useMemo(() => {
    let base = catalog
    if (activeCat === 'Por Peso') base = base.filter((p) => isByWeight(p))
    else base = base.filter((p) => getCategory(p) === activeCat && !isByWeight(p))

    if (search.trim()) {
      const s = search.toLowerCase()
      base = base.filter(
        (p: Product) => p.name.toLowerCase().includes(s) || (p.code?.toLowerCase?.() === s),
      )
    }
    return base
  }, [catalog, activeCat, search])

  const total = useMemo(
    () => cart.reduce((acc, it) => acc + num(it.price) * num(it.qty), 0),
    [cart],
  )

  // --------------- Comanda / Código — CAMPO ÚNICO ---------------
  function applyUnified() {
    const s = unifiedInput.trim()
    if (!s) return

    // só dígitos -> comanda 1..200
    if (/^\d+$/.test(s)) {
      const n = Number(s)
      if (Number.isFinite(n) && n >= 1 && n <= 200) {
        const owner = stationNs || 'local'
        if (isOrderLockedByOther(n, owner)) {
          alert(`Comanda ${n} está sendo editada em outra estação.`)
          return
        }
        if (!acquireOrderLock(n, owner)) {
          alert(`Não foi possível adquirir o lock da comanda ${n}.`)
          return
        }
        setOrderId(n)
        setCurrentOrderId(n, stationNs)

        // carrega rascunho da comanda
        const d = loadCartDraft(n)
        setCart((d || []).map((x) => ({ ...x, price: num(x.price), qty: num(x.qty) })))
        setUnifiedInput('')
        return
      }
    }

    // se não foi comanda, trata como código/PLU (exige comanda ativa)
    if (!orderActive) {
      alert('Antes de lançar itens por código, informe o Nº da comanda (1–200).')
      return
    }
  const p = catalog.find((x: Product) => x.code && x.code.toLowerCase() === s.toLowerCase())
    if (!p) {
      alert('Código não encontrado.')
      return
    }
    addProduct(p, isByWeight(p) ? 0 : Math.max(1, num(quickQty, 1)))
    setUnifiedInput('')
  }

  function clearOrder() {
    if (orderId != null) {
      try { releaseOrderLock(orderId, stationNs || 'local') } catch (err) { void err }
    }
    setOrderId(null)
    clearCurrentOrderId(stationNs)
    setCart([])
    setPesoItemId(null)
    // mantém quantidade rápida como está
  }

  // --------------- Carrinho ----------------
  function addProduct(p: Product, q?: number) {
    if (!orderActive) {
      alert('Antes de lançar itens, informe a Nº comanda.')
      return
    }
  const price = num(p.price)
    const weight = isByWeight(p)
    const qty = typeof q === 'number' ? num(q, 0) : weight ? 0 : 1

    const idx = cart.findIndex((c) => c.id === p.id)
    if (idx >= 0) {
      const updated = [...cart]
      const current = updated[idx]
      updated[idx] = {
        ...current,
        qty: current.unit === 'unit' ? num(current.qty) + qty : current.qty,
        price,
      }
      setCart(updated)
    } else {
      setCart((c) => [
        ...c,
        {
          id: p.id,
          name: p.name ?? 'Item',
          unit: weight ? 'kg' : 'unit',
          price,
          qty,
          code: p.code,
        },
      ])
    }
    if (weight) setPesoItemId(p.id)
  }

  function inc(it: CartItem) {
    if (!orderActive || it.unit !== 'unit') return
    setCart((c) => c.map((x) => (x.id === it.id ? { ...x, qty: num(x.qty) + 1 } : x)))
  }
  function dec(it: CartItem) {
    if (!orderActive || it.unit !== 'unit') return
    setCart((c) =>
      c
        .map((x) => (x.id === it.id ? { ...x, qty: Math.max(0, num(x.qty) - 1) } : x))
        .filter((x) => x.unit === 'kg' || num(x.qty) > 0),
    )
  }
  function removeItem(it: CartItem) {
    if (!orderActive) return
    setCart((c) => c.filter((x) => x.id !== it.id))
    if (pesoItemId === it.id) setPesoItemId(null)
  }
  /** Limpa SOMENTE a tela atual (não apaga o rascunho da comanda). */
  function clear() {
    setCart([])
    setPesoItemId(null)
    setQuickQty('0')
  }
  // Excluir rascunho da comanda — função opcional (mantida comentada no UI)
  // function deleteDraftPermanently() {
  //   if (!orderActive) return
  //   if (confirm(`Excluir rascunho da comanda ${orderId}?`)) {
  //     removeCartDraft(orderId!)
  //     clear()
  //   }
  // }

  // --------------- Keypad ----------------
  function onKeypad(k: string) {
    if (!orderActive) return
    if (k === 'C') return setQuickQty('0')
    if (k === 'B') return setQuickQty((v) => (v.length <= 1 ? '0' : v.slice(0, -1)))
    setQuickQty((v) => (v === '0' ? k : v.length >= 5 ? v : v + k))
  }
  function applyQuickQty() {
    if (!orderActive) return
    const q = Math.max(0, num(quickQty))
    if (!q) return
    alert('Dica: após definir, clique em um produto unitário.')
  }

  // --------------- Peso ----------------
  async function lerPeso() {
    if (!orderActive) return alert('Informe a Nº comanda primeiro.')
    if (!pesoItemId) return alert('Selecione um item por peso.')
    if (!renewOrderLock(orderId!, stationNs || 'local')) {
      return alert('Perdemos o lock desta comanda. Reabra a comanda para continuar.')
    }
    try {
      const g = await requestWeight()
      const kg = Math.max(0, Number(g) / 1000)
      setCart((c) => c.map((x) => (x.id === pesoItemId ? { ...x, qty: kg } : x)))
    } catch {
      const manual = prompt('Balança indisponível. Informe o peso (kg):', '0.000')
      if (!manual) return
      const kg = Math.max(0, Number(manual.toString().replace(',', '.')))
      setCart((c) => c.map((x) => (x.id === pesoItemId ? { ...x, qty: kg } : x)))
    }
  }

  // --------------- Fluxos finais ----------------
  function goToCheckout() {
    if (!orderActive) return alert('Informe a Nº comanda.')
    if (!cart.length) return alert('Carrinho vazio.')
    renewOrderLock(orderId!, stationNs || 'local')
    nav('/finalizacao', { state: { cart, orderId } })
  }

  // ---------------------- UI ----------------------
  const isBalanca = isBalancaRole

  return (
    <div className="container">
      {/* Aviso especial para balanças */}
      {isBalanca && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            backgroundColor: '#e3f2fd',
            border: '1px solid #2196f3',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: '24px' }}>⚖️</span>
          <div>
            <strong>Modo Balança ({roleRaw})</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
              1. Informe o número da comanda (1-200) • 2. Adicione produtos por peso • 3. A
              finalização será feita no caixa
            </p>
          </div>
        </div>
      )}

      {/* Campo único de comanda/PLU */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
          <div className="col" style={{ minWidth: 320 }}>
            <label className="small muted">Comanda (1–200) ou Código/PLU</label>
            <div className="row" style={{ gap: 8 }}>
              <input
                value={unifiedInput}
                onChange={(e) => setUnifiedInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyUnified()}
                placeholder="Ex.: 15 (comanda) | 12345 (PLU)"
                style={{ width: 260 }}
              />
              <button className="btn btn-primary" onClick={applyUnified}>
                Aplicar
              </button>

              {orderActive && (
                <>
                  <div className="pill small success">
                    Comanda ativa: <b>{orderId}</b>
                  </div>
                  <span
                    aria-label="Estado do lock"
                    title={
                      lockOwner == null
                        ? 'Sem lock ativo'
                        : lockOwner === (stationNs || 'local')
                          ? `Você detém o lock • expira em ~${lockSeconds}s`
                          : `Outra estação detém o lock • expira em ~${lockSeconds}s`
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      marginLeft: 4,
                      fontSize: 18,
                      color: lockOwner == null
                        ? '#9ca3af' /* cinza */
                        : lockOwner === (stationNs || 'local')
                          ? '#16a34a' /* verde */
                          : '#f59e0b' /* amarelo */
                    }}
                  >
                    🔒
                  </span>
                  <button onClick={clearOrder} title="Limpar comanda atual">
                    Limpar
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="row" style={{ gap: 8, flex: 1, minWidth: 260 }}>
            <input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 8 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`pill ${activeCat === c.key ? 'active' : ''}`}
              onClick={() => setActiveCat(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {/* Catálogo */}
        <section className="card">
          <h3 className="card-title">Catálogo</h3>

          {filtered.length === 0 && (
            <div className="muted">Nenhum item para os filtros atuais.</div>
          )}

          <div className="grid grid-3">
            {filtered.map((p) => {
              const weight = isByWeight(p)
              const price = num(p.price)
              return (
                <article key={p.id} className="product">
                  <div className="product-title">{p.name ?? 'Item'}</div>
                  <div className="product-price">
                    {weight ? <span>R$ {fmt(price)} / kg</span> : <span>R$ {fmt(price)}</span>}
                  </div>
                  <div className="hr" />
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    {weight ? (
                      <button
                        className="btn"
                        disabled={!orderActive}
                        onClick={() => addProduct(p)}
                        title={
                          orderActive ? 'Seleciona item para leitura do peso' : 'Informe a comanda'
                        }
                      >
                        Selecionar p/ peso
                      </button>
                    ) : (
                      <button
                        className="btn"
                        disabled={!orderActive}
                        onClick={() => addProduct(p, Math.max(1, num(quickQty, 1)))}
                        title={
                          orderActive
                            ? 'Adicionar (usa quantidade rápida se definida)'
                            : 'Informe a comanda'
                        }
                      >
                        Adicionar
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* Lateral */}
        <aside className="card cart cart-sticky">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 className="card-title" style={{ marginBottom: 6 }}>
              Quantidade rápida (itens unitários)
            </h3>
            <input
              className="input-lg"
              style={{ width: 120, textAlign: 'center' }}
              value={quickQty}
              onChange={(e) => setQuickQty(e.target.value.replace(/[^\d]/g, '') || '0')}
              disabled={!orderActive}
            />
          </div>

          <div className="keypad" style={{ marginBottom: 12 }}>
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'B'].map((k) => (
              <button key={k} disabled={!orderActive} onClick={() => onKeypad(k === '.' ? '' : k)}>
                {k === 'B' ? '⌫' : k}
              </button>
            ))}
          </div>

          <div className="row" style={{ gap: 8, marginBottom: 18 }}>
            <button className="btn btn-primary" disabled={!orderActive} onClick={applyQuickQty}>
              Confirmar
            </button>
            <button disabled={!orderActive} onClick={() => onKeypad('C')}>
              Limpar
            </button>
          </div>

          {/* Peso */}
          <div className="card" style={{ padding: 12, marginBottom: 18 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>Peso (balança)</strong>
              <span className="small muted">
                Mock WS: <code>npm run mock:ws</code>
              </span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-primary" disabled={!orderActive} onClick={lerPeso}>
                Ler peso (mock)
              </button>
              <select
                disabled={!orderActive}
                value={pesoItemId ?? ''}
                onChange={(e) => setPesoItemId(e.target.value || null)}
              >
                <option value="">Selecione um item por peso</option>
                {cart
                  .filter((x) => x.unit === 'kg')
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Carrinho */}
          <h3 className="card-title" style={{ marginBottom: 10 }}>
            Carrinho
          </h3>
          {!cart.length && <div className="muted">Nenhum item.</div>}

          {cart.map((it) => (
            <div className="cart-item" key={it.id}>
              <div>
                <div style={{ fontWeight: 700 }}>{it.name}</div>
                <div className="small muted">
                  {it.unit === 'kg'
                    ? `${num(it.qty).toFixed(3)} kg × R$ ${fmt(it.price)}`
                    : `${num(it.qty)} un × R$ ${fmt(it.price)}`}
                </div>
              </div>

              {it.unit === 'unit' ? (
                <div className="row">
                  <button disabled={!orderActive} onClick={() => dec(it)}>
                    -
                  </button>
                  <button disabled={!orderActive} onClick={() => inc(it)}>
                    +
                  </button>
                </div>
              ) : (
                <div className="small muted" style={{ textAlign: 'right' }}>
                  R$ {fmt(num(it.price) * num(it.qty))}
                </div>
              )}

              <div>
                <button className="btn" disabled={!orderActive} onClick={() => removeItem(it)}>
                  Remover
                </button>
              </div>
            </div>
          ))}

          <div className="cart-total">
            <span>Total</span>
            <span>R$ {fmt(total)}</span>
          </div>

          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button disabled={!orderActive} onClick={clear}>
              Limpar
            </button>

            {canFinalize ? (
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={!orderActive}
                onClick={goToCheckout}
              >
                Ir para Finalização (F4)
              </button>
            ) : (
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={!orderActive}
                onClick={nextClient}
                title="Salva rascunho da comanda e prepara a balança para o próximo cliente (ESC)"
              >
                Próximo cliente (ESC)
              </button>
            )}
          </div>

          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button
              disabled={!orderActive}
              onClick={() => printText('fiscal01', 'Cupom (mock)')}
              className="btn"
            >
              Imprimir cupom (mock)
            </button>
            {/* Opcional: botão para excluir rascunho da comanda */}
            {/* <button disabled={!orderActive} onClick={deleteDraftPermanently}>Apagar rascunho</button> */}
          </div>
        </aside>
      </div>
    </div>
  )
}
