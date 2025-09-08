// src/pages/VendaRapida.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../auth/session'
import { db } from '../db'
import type { Order, OrderItem, Product } from '../db/models'
import { listProducts } from '../db/products'
import TecladoNumerico from '../components/TecladoNumerico'
import { requestWeight } from '../mock/devices'
import ModalPeso from '../components/ModalPeso'

const round2 = (n: number) => Math.round(n * 100) / 100
const pad = (n: number) => n.toString().padStart(3, '0')

export default function VendaRapida() {
  const { user } = useSession()
  const nav = useNavigate()

  const isBalanca = user?.role === 'BALANÇA'

  // ---------- COMANDA ----------
  const [comanda, setComanda] = useState<string>('')
  const comandaOk = useMemo(() => {
    const n = Number(comanda)
    return !!comanda && Number.isFinite(n) && n >= 1 && n <= 100
  }, [comanda])
  const [loadingOrder, setLoadingOrder] = useState(false)

  // ---------- catálogo / busca ----------
  const [tab, setTab] = useState<'Pratos' | 'Bebidas' | 'Sobremesas' | 'Por Peso'>('Pratos')
  const [q, setQ] = useState('')
  const [catalog, setCatalog] = useState<Product[]>([])
  useEffect(() => { (async () => setCatalog(await listProducts()))() }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return catalog.filter(p =>
      (p.category === tab || (tab === 'Por Peso' && !!p.pricePerKg)) &&
      (!s || p.name.toLowerCase().includes(s))
    )
  }, [catalog, q, tab])

  // ---------- carrinho ----------
  const [items, setItems] = useState<OrderItem[]>([])
  const total = useMemo(() => round2(items.reduce((s, i) => s + i.total, 0)), [items])

  async function aplicarComanda() {
    if (!comandaOk) return alert('Informe um nº de comanda entre 1 e 100.')
    setLoadingOrder(true)
    try {
      const id = 'COMANDA-' + pad(Number(comanda))
      const existing = await db.orders.get(id)
      setItems(existing && existing.status === 'OPEN' ? existing.items : [])
    } finally {
      setLoadingOrder(false)
    }
  }

  async function salvarComandaOpen() {
    if (!comandaOk) return
    const order: Order = {
      id: 'COMANDA-' + pad(Number(comanda)),
      createdAt: Date.now(),
      status: 'OPEN',
      items,
      payments: [],
      total
    }
    await db.orders.put(order)
  }

  // ---------- adicionar produtos ----------
  function addUnit(p: Product, qty = 1) {
    if (!isBalanca && !comandaOk) return alert('Leia/digite a comanda primeiro.')
    const item: OrderItem = {
      id: crypto.randomUUID(),
      productId: p.id!,
      name: p.name,
      qty,
      unitPrice: p.price ?? 0,
      total: round2((p.price ?? 0) * qty),
      isWeight: false,
      route: p.route
    }
    setItems(prev => [...prev, item])
  }

  // modal de peso
  const [pesoModalOpen, setPesoModalOpen] = useState(false)
  const [pesoProdutoSel, setPesoProdutoSel] = useState<Product | null>(null)
  const [pesoSugerido, setPesoSugerido] = useState<number | null>(null)

  async function addWeight(p: Product) {
    if (!isBalanca && !comandaOk) return alert('Leia/digite a comanda primeiro.')
    let kg: number | null | undefined
    try {
      const w = await requestWeight()
      kg = w?.weightKg
    } catch { kg = null }
    if (!kg || kg <= 0) {
      setPesoProdutoSel(p)
      setPesoSugerido(null)
      setPesoModalOpen(true)
      return
    }
    incluirPeso(p, kg)
  }

  function incluirPeso(p: Product, kg: number) {
    const priceKg = p.pricePerKg ?? 0
    const item: OrderItem = {
      id: crypto.randomUUID(),
      productId: p.id!,
      name: p.name,
      qty: round2(kg),
      unitPrice: priceKg,
      total: round2(kg * priceKg),
      isWeight: true,
      route: p.route
    }
    if (item.qty <= 0 || item.total <= 0) { alert('Peso inválido.'); return }
    setItems(prev => [...prev, item])
  }

  function inc(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + 1, total: round2((i.qty + 1) * i.unitPrice) } : i))
  }
  function dec(id: string) {
    setItems(prev => prev.flatMap(i => {
      if (i.id !== id) return [i]
      const q = i.qty - 1
      return q <= 0 ? [] : [{ ...i, qty: q, total: round2(q * i.unitPrice) }]
    }))
  }
  function removeItem(id: string) { setItems(prev => prev.filter(i => i.id !== id)) }
  function clearCart() { setItems([]) }

  // ---------- leitor/código ----------
  const [codigo, setCodigo] = useState('')

  function normaliza(s: string) { return (s || '').trim() }

  function findByCodeOrName(input: string): Product | null {
    const x = normaliza(input)
    if (!x) return null
    const exactCode = catalog.find(p => (p as any).code && String((p as any).code).toLowerCase() === x.toLowerCase())
    if (exactCode) return exactCode
    const byId = catalog.find(p => String(p.id ?? '').toLowerCase() === x.toLowerCase())
    if (byId) return byId
    const byName = catalog.find(p => p.name.toLowerCase() === x.toLowerCase()) ||
                   catalog.find(p => p.name.toLowerCase().includes(x.toLowerCase()))
    return byName ?? null
  }

  function onEnterCodigo() {
    if (!isBalanca && !comandaOk) { alert('Leia/digite a comanda primeiro.'); return }
    const p = findByCodeOrName(codigo)
    if (!p) { alert('Produto não encontrado.'); return }
    if (p.pricePerKg) addWeight(p)
    else addUnit(p, 1)
    setCodigo('')
  }

  // ---------- finalizar/ir para caixa ----------
  async function finalizar() {
    if (!isBalanca) await salvarComandaOpen()
    if (!isBalanca && comandaOk) {
      sessionStorage.setItem('pdv_pre_comanda', pad(Number(comanda)))
      nav('/finalizacao')
      return
    }
    alert('Fluxo de finalização atualizado: use a tela Finalização.')
  }

  // ---------- próximo cliente (balança) ----------
  async function proximoCliente() {
    if (!comandaOk) return
    await salvarComandaOpen()
    setItems([])
    setComanda('')
    setCodigo('')
    setQ('')
    alert('Comanda salva. Próximo cliente!')
  }

  // Atalhos
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F4') { e.preventDefault(); finalizar() }
      if (isBalanca && e.key === 'Escape') { e.preventDefault(); proximoCliente() }
      if (e.key === 'Enter' && (document.activeElement as HTMLElement)?.id === 'comandaInput') {
        e.preventDefault(); aplicarComanda()
      }
      if (e.key === 'Enter' && (document.activeElement as HTMLElement)?.id === 'barcodeInput') {
        e.preventDefault(); onEnterCodigo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [comanda, codigo, items, isBalanca])

  useEffect(() => {
    const pre = sessionStorage.getItem('pdv_pre_comanda')
    if (pre) {
      setComanda(String(Number(pre)))
      sessionStorage.removeItem('pdv_pre_comanda')
      aplicarComanda()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* MODAL DE PESO */}
      <ModalPeso
        open={pesoModalOpen}
        initialKg={pesoSugerido}
        onClose={() => { setPesoModalOpen(false); setPesoProdutoSel(null) }}
        onConfirm={(kg) => {
          if (pesoProdutoSel) incluirPeso(pesoProdutoSel, kg)
          setPesoModalOpen(false)
          setPesoProdutoSel(null)
        }}
      />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:12, height:'calc(100vh - 64px)' }}>
        {/* Lado esquerdo */}
        <div style={{ padding:12, overflow:'auto' }}>
          {/* Comanda */}
          <div style={{ display:'grid', gridTemplateColumns:'160px 140px 120px', gap:8, marginBottom:12, alignItems:'center' }}>
            <label><b>Nº Comanda (1–100)</b></label>
            <input
              id="comandaInput"
              type="text"
              inputMode="numeric"
              value={comanda}
              onChange={e=>setComanda(e.target.value)}
              placeholder="Digite ou leia o código"
            />
            <button onClick={aplicarComanda} disabled={!comandaOk || loadingOrder}>
              {loadingOrder ? 'Carregando...' : 'Carregar/Aplicar'}
            </button>
          </div>

          {/* Leitor / Código */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 140px', gap:8, marginBottom:12, alignItems:'center' }}>
            <input
              id="barcodeInput"
              placeholder="Código de barras ou nome do produto"
              value={codigo}
              onChange={e=>setCodigo(e.target.value)}
            />
            <button onClick={onEnterCodigo}>Adicionar (Enter)</button>
          </div>

          {/* Tabs & Busca (opcional) */}
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            {(['Pratos','Bebidas','Sobremesas','Por Peso'] as const).map(t => (
              <button key={t}
                onClick={()=>setTab(t)}
                style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #ddd',
                        background: tab===t ? '#efefef' : '#fff' }}>
                {t}
              </button>
            ))}
          </div>

          <input
            placeholder="Buscar por nome..."
            value={q}
            onChange={e=>setQ(e.target.value)}
            style={{ width:'100%', padding:8, border:'1px solid #ddd', borderRadius:6, marginBottom:10 }}
          />

          {/* Grade */}
          <div style={{ opacity: comandaOk ? 1 : .5, pointerEvents: comandaOk ? 'auto' : 'none' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:10 }}>
              {filtered.map(p => (
                <div key={p.id} style={{ border:'1px solid #eee', borderRadius:8, padding:12 }}>
                  <div style={{ fontWeight:700 }}>{p.name}</div>
                  <div style={{ opacity:.7, fontSize:13, margin:'2px 0 8px' }}>
                    {p.pricePerKg ? `R$ ${p.pricePerKg!.toFixed(2)}/kg` :
                    (p.price ? `R$ ${p.price!.toFixed(2)}` : '—')}
                  </div>
                  {p.pricePerKg ? (
                    <button onClick={()=>addWeight(p)}>Ler peso</button>
                  ) : (
                    <button onClick={()=>addUnit(p,1)}>Adicionar</button>
                  )}
                </div>
              ))}
              {filtered.length===0 && <div style={{ opacity:.6 }}><i>Nenhum produto.</i></div>}
            </div>
          </div>

          {!comandaOk && (
            <div style={{ marginTop:10, color:'#a00', fontSize:12 }}>
              Informe a comanda para habilitar lançamentos.
            </div>
          )}
        </div>

        {/* Lado direito */}
        <div style={{ borderLeft:'1px solid #eee', padding:12, display:'grid', gridTemplateRows:'auto auto 1fr auto', gap:12 }}>
          <div>
            <div style={{ fontWeight:700, marginBottom:8 }}>Quantidade rápida (itens unitários)</div>
            <TecladoNumerico
              disabled={!comandaOk}
              onConfirm={(q)=>window.dispatchEvent(new CustomEvent('pdv:setQuickQty',{ detail:q }))}
            />
          </div>

          <div>
            <div style={{ fontWeight:700, margin:'6px 0' }}>Peso (balança)</div>
            <div>
              <div style={{ fontSize:11, opacity:.6, marginTop:6 }}>
                Se o WS não responder, abriremos o modal para digitar o peso.
              </div>
            </div>
          </div>

          <div style={{ overflow:'auto' }}>
            <h4 style={{ margin:'4px 0' }}>Carrinho</h4>
            {items.length===0 ? (
              <div style={{ opacity:.6 }}><i>Nenhum item.</i></div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {items.map(i=>(
                  <div key={i.id} style={{ border:'1px solid #eee', borderRadius:8, padding:8, display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:8, alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight:600 }}>{i.name}</div>
                      <div style={{ fontSize:12, opacity:.7 }}>
                        {i.isWeight ? `${i.qty.toFixed(3)} kg x R$ ${i.unitPrice.toFixed(2)}` :
                          `${i.qty} x R$ ${i.unitPrice.toFixed(2)}`}
                      </div>
                    </div>
                    <div><b>R$ {i.total.toFixed(2)}</b></div>
                    {!i.isWeight && (
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={()=>dec(i.id)}>-</button>
                        <button onClick={()=>inc(i.id)}>+</button>
                      </div>
                    )}
                    <button onClick={()=>removeItem(i.id)}>Remover</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <div>Total</div>
              <b>R$ {total.toFixed(2)}</b>
            </div>

            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button onClick={clearCart}>Limpar</button>
              {isBalanca ? (
                <button onClick={proximoCliente} style={{ background:'#555', color:'#fff' }}>
                  Próximo cliente (Esc)
                </button>
              ) : (
                <>
                  <button onClick={salvarComandaOpen} disabled={!comandaOk}>Salvar Comanda</button>
                  <button onClick={finalizar} style={{ background:'#0b5', color:'#fff' }} disabled={!comandaOk}>
                    Ir para Finalização (F4)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
