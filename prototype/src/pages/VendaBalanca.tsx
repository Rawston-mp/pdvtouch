// src/pages/VendaBalanca.tsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import type { Order, OrderItem } from '../db/models'

export default function VendaBalanca() {
  const [comanda, setComanda] = useState('')
  const [items, setItems] = useState<OrderItem[]>([])

  const comandaOk = useMemo(() => {
    const n = Number(comanda)
    return !!comanda && Number.isFinite(n) && n >= 1 && n <= 200
  }, [comanda])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (comandaOk) proximoCliente()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [comandaOk, items])

  function addPeso() {
    const pesoKg = Math.random() * 0.8 + 0.2 // 200g–1kg (mock)
    const precoKg = 59.90
    const total = precoKg * pesoKg
    const item: OrderItem = {
      id: crypto.randomUUID(),
      productId: 0,
      name: 'Prato por quilo',
      qty: Number(pesoKg.toFixed(3)),
      unitPrice: precoKg,
      total: Number(total.toFixed(2)),
      isWeight: true
    }
    setItems(prev => [...prev, item])
  }

  function addExtra(nome: string, preco: number) {
    const item: OrderItem = {
      id: crypto.randomUUID(),
      productId: 0,
      name: nome,
      qty: 1,
      unitPrice: preco,
      total: preco,
      isWeight: false
    }
    setItems(prev => [...prev, item])
  }

  function remover(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const total = useMemo(() => items.reduce((s, i) => s + i.total, 0), [items])

  async function proximoCliente() {
    if (!comandaOk) return alert('Informe o nº da comanda (1–200).')
    if (items.length === 0) return alert('Nenhum item lançado.')

    const orderId = 'COMANDA-' + Number(comanda).toString().padStart(3, '0')
    const order: Order = {
      id: orderId,
      createdAt: Date.now(),
      status: 'OPEN',    // aguardará pagamento no caixa
      items,
      payments: [],
      total,
    }
    await db.orders.put(order)

    // limpa para o próximo cliente
    setItems([])
    setComanda('')
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Balança — Registrar Comanda</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 8, alignItems: 'center', maxWidth: 520 }}>
        <label>Nº Comanda (1–200)</label>
        <input
          type="text"
          value={comanda}
          onChange={e => setComanda(e.target.value)}
          placeholder="Digite ou leia código de barras"
          inputMode="numeric"
          style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
        />
      </div>

      {!comandaOk && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#a00' }}>
          Informe a comanda para habilitar as ações.
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', opacity: comandaOk ? 1 : 0.5, pointerEvents: comandaOk ? 'auto' : 'none' }}>
        <button onClick={addPeso}>Ler Peso</button>
        <button onClick={() => addExtra('Refrigerante Lata', 6)}>+ Refrigerante</button>
        <button onClick={() => addExtra('Sobremesa', 12)}>+ Sobremesa</button>
        <button onClick={() => addExtra('Suco', 8)}>+ Suco</button>
        <button onClick={proximoCliente} style={{ background:'#0b5', color:'#fff' }}>Próximo Cliente (ESC)</button>
      </div>

      <ul style={{ marginTop: 16 }}>
        {items.map(i => (
          <li key={i.id} style={{ marginBottom: 6 }}>
            {i.name} — {i.isWeight ? i.qty.toFixed(3) + 'kg' : i.qty}
            = <b>R$ {i.total.toFixed(2)}</b>
            <button onClick={() => remover(i.id)} style={{ marginLeft: 8 }}>Remover</button>
          </li>
        ))}
        {items.length === 0 && <li style={{ opacity: 0.7 }}><i>Nenhum item lançado.</i></li>}
      </ul>

      <div style={{ marginTop: 12, fontWeight: 700 }}>
        Total parcial: R$ {total.toFixed(2)}
      </div>
    </div>
  )
}
