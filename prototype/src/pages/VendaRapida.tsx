// src/pages/VendaRapida.tsx
import { useEffect, useMemo, useState } from 'react'
import TecladoNumerico from '../components/TecladoNumerico'
import { requestWeight, printText } from '../mock/devices'
import { Link } from 'react-router-dom'
import { saveCart } from '../lib/cartStorage'
import { CATEGORIES, ensureSeed, listProducts } from '../db/products'
import type { Product } from '../db/models'

type CartItem = {
  id: string
  productId: number
  name: string
  unitPrice: number
  qty: number
  total: number
  isWeight: boolean
}

export default function VendaRapida() {
  const [activeCategory, setActiveCategory] = useState<Product['category']>('Pratos')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [qtyInput, setQtyInput] = useState('')
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null)
  const [readingWeight, setReadingWeight] = useState(false)
  const [lastWeight, setLastWeight] = useState<number | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  async function refreshProducts() {
    setLoading(true)
    const list = await listProducts(true)
    setProducts(list)
    setLoading(false)
  }

  useEffect(() => {
    (async () => {
      await refreshProducts()
    })()
  }, [])

  const filteredProducts = useMemo(() => {
    const byCat = products.filter(p => p.category === activeCategory)
    if (!query.trim()) return byCat
    const q = query.toLowerCase()
    return byCat.filter(p => p.name.toLowerCase().includes(q))
  }, [products, activeCategory, query])

  const total = useMemo(() => cart.reduce((acc, i) => acc + i.total, 0), [cart])

  useEffect(() => {
    saveCart({ items: cart as any, total })
  }, [cart, total])

  function addUnitProduct(prod: Product) {
    const qty = Math.max(1, Number(qtyInput.replace(',', '.')) || 1)
    const price = prod.price ?? 0
    const item: CartItem = {
      id: crypto.randomUUID(),
      productId: prod.id!,
      name: prod.name,
      unitPrice: price,
      qty,
      total: round2(price * qty),
      isWeight: false
    }
    setCart(prev => [...prev, item])
    setQtyInput('')
  }

  async function addWeightProduct(prod: Product) {
    const priceKg = prod.pricePerKg ?? 0
    try {
      setReadingWeight(true)
      const kg = await requestWeight()
      setLastWeight(kg)
      const item: CartItem = {
        id: crypto.randomUUID(),
        productId: prod.id!,
        name: `${prod.name} (${kg.toFixed(3)} kg)`,
        unitPrice: priceKg,
        qty: parseFloat(kg.toFixed(3)),
        total: round2(kg * priceKg),
        isWeight: true
      }
      setCart(prev => [...prev, item])
    } catch {
      alert('Falha ao ler balança (mock). Verifique se o WS está rodando: npm run mock:ws')
    } finally {
      setReadingWeight(false)
      setPendingProduct(null)
    }
  }

  function onSelectProduct(prod: Product) {
    if (prod.category === 'Por Peso') setPendingProduct(prod)
    else addUnitProduct(prod)
  }

  function inc(itemId: string) {
    setCart(prev =>
      prev.map(i => i.id === itemId ? { ...i, qty: i.qty + 1, total: round2((i.qty + 1) * i.unitPrice) } : i)
    )
  }
  function dec(itemId: string) {
    setCart(prev =>
      prev.flatMap(i => {
        if (i.id !== itemId) return i
        const nextQty = i.qty - 1
        if (nextQty <= 0) return []
        return { ...i, qty: nextQty, total: round2(nextQty * i.unitPrice) }
      })
    )
  }
  function removeItem(itemId: string) {
    setCart(prev => prev.filter(i => i.id !== itemId))
  }
  function clearCart() {
    setCart([])
    setLastWeight(null)
    setPendingProduct(null)
  }

  function imprimirCupomDemo() {
    if (cart.length === 0) return alert('Carrinho vazio.')
    const lines: string[] = []
    lines.push('PDVTouch - Demonstrativo')
    lines.push('--------------------------------')
    cart.forEach(i => {
      const q = i.isWeight ? `${i.qty.toFixed(3)}kg` : `${i.qty}x`
      lines.push(`${truncate(i.name, 24)}  ${q}  R$ ${i.total.toFixed(2)}`)
    })
    lines.push('--------------------------------')
    lines.push(`TOTAL: R$ ${total.toFixed(2)}`)
    lines.push('')
    lines.push('Obrigado pela preferência!')
    printText(crypto.randomUUID(), lines.join('\n'))
    alert('Cupom enviado (mock). Veja o terminal do WS.')
  }

  // ====== RENDER ======
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', height: 'calc(100vh - 64px)' }}>
      {/* esquerda */}
      <section style={{ padding: 16, overflow: 'auto' }}>
        {/* Banner de catálogo vazio / seed */}
        {!loading && products.length === 0 && (
          <div style={{
            padding: 12, border: '1px solid #f0c36d', background: '#fff8e1',
            borderRadius: 10, marginBottom: 12
          }}>
            <b>Catálogo vazio.</b> <span> Carregue o seed para continuar.</span>{' '}
            <button
              onClick={async () => { await ensureSeed(); await refreshProducts() }}
              style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}
            >
              Carregar catálogo (seed)
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '10px 14px', fontSize: 16, borderRadius: 8, border: '1px solid #ddd',
                background: activeCategory === cat ? '#222' : '#fff',
                color: activeCategory === cat ? '#fff' : '#222', cursor: 'pointer'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            placeholder="Buscar por nome ou código..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 8, border: '1px solid #ddd' }}
          />
        </div>

        {loading ? (
          <div style={{ opacity: 0.7 }}>Carregando catálogo…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => onSelectProduct(p)}
                style={{
                  height: 90, border: '1px solid #e5e5e5', borderRadius: 12,
                  fontSize: 16, textAlign: 'left', padding: 12, cursor: 'pointer', background: '#fff'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{p.name}</div>
                {p.category === 'Por Peso'
                  ? <div>R$ {p.pricePerKg?.toFixed(2)} / kg</div>
                  : <div>R$ {p.price?.toFixed(2)}</div>}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* direita */}
      <aside style={{ borderLeft: '1px solid #eee', padding: 16, display: 'grid', gridTemplateRows: 'auto auto 1fr auto auto', gap: 12 }}>
        {/* teclado numérico */}
        <div>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Quantidade rápida (itens unitários)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, fontSize: 22 }}>
              {qtyInput || '0'}
            </div>
            <button onClick={() => setQtyInput('')} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>
              Limpar
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            <TecladoNumerico
              value={qtyInput}
              onChange={setQtyInput}
              onEnter={() => alert(`Quantidade definida: ${qtyInput || 1}`)}
              onClear={() => setQtyInput('')}
            />
          </div>
          <small style={{ opacity: 0.8 }}>Dica: selecione um produto unitário após definir a quantidade.</small>
        </div>

        {/* peso */}
        <div style={{ borderTop: '1px dashed #ddd', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>Peso (balança)</strong>
            {pendingProduct && (
              <span style={{ fontSize: 12, padding: '2px 6px', background: '#eef', borderRadius: 6 }}>
                pendente: {pendingProduct.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <button
              onClick={() => pendingProduct && addWeightProduct(pendingProduct)}
              disabled={!pendingProduct || readingWeight}
              style={{ padding: '10px 14px', borderRadius: 8, cursor: pendingProduct ? 'pointer' : 'not-allowed' }}
            >
              {readingWeight
                ? 'Lendo...'
                : pendingProduct
                  ? `Ler peso (${pendingProduct.name})`
                  : 'Selecione um item por peso'}
            </button>
            {lastWeight != null && <div><b>{lastWeight.toFixed(3)} kg</b></div>}
          </div>
          <small style={{ opacity: 0.8 }}>Requer o mock WS: <code>npm run mock:ws</code></small>
        </div>

        {/* carrinho */}
        <div style={{ overflow: 'auto' }}>
          <h3 style={{ marginBottom: 8 }}>Carrinho</h3>
          {cart.length === 0 && <div style={{ opacity: 0.7 }}>Nenhum item.</div>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {cart.map(i => (
              <li key={i.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{i.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {i.isWeight ? `${i.qty.toFixed(3)} kg` : `${i.qty} un`} · R$ {i.unitPrice.toFixed(2)} → <b>R$ {i.total.toFixed(2)}</b>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!i.isWeight && (
                    <>
                      <button onClick={() => dec(i.id)} style={btnSm}>−</button>
                      <button onClick={() => inc(i.id)} style={btnSm}>+</button>
                    </>
                  )}
                  <button onClick={() => removeItem(i.id)} style={btnSm}>Remover</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* total */}
        <div style={{ borderTop: '1px dashed #ddd', paddingTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18 }}>
            <span>Total</span>
            <b>R$ {total.toFixed(2)}</b>
          </div>
        </div>

        {/* ações */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={imprimirCupomDemo} style={btnPrimary}>Imprimir cupom (mock)</button>
          <button onClick={clearCart} style={btnLight}>Limpar</button>
          <Link to="/finalizacao" style={{ gridColumn: 'span 2', textDecoration: 'none' }}>
            <button style={{ ...btnPrimary, width: '100%', fontSize: 20 }}>Finalizar venda →</button>
          </Link>
        </div>
      </aside>
    </div>
  )
}

function round2(n: number) { return Math.round(n * 100) / 100 }
function truncate(s: string, len: number) { return s.length > len ? s.slice(0, len - 1) + '…' : s }

const btnSm: React.CSSProperties = { padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }
const btnPrimary: React.CSSProperties = { padding: '12px 14px', borderRadius: 10, border: '1px solid #0b5', background: '#0b5', color: '#fff', cursor: 'pointer' }
const btnLight: React.CSSProperties = { padding: '12px 14px', borderRadius: 10, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }
