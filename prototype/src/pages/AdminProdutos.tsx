// src/pages/AdminProdutos.tsx
import { useEffect, useMemo, useState } from 'react'
import { listProducts, saveProduct, removeProduct } from '../db/products'
import type { Product, Category, PrintRoute } from '../db/models'

const categories: Category[] = ['Pratos', 'Bebidas', 'Sobremesas', 'Por Peso']
const routes: PrintRoute[] = ['CAIXA', 'COZINHA', 'BAR', 'SOBREMESA']

type Row = Product & { _dirty?: boolean; _new?: boolean }

export default function AdminProdutos() {
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')

  useEffect(() => { (async () => setRows((await listProducts()).map(p => ({ ...p }))))() }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter(r =>
      !s || r.name.toLowerCase().includes(s) || (r.code ?? '').toLowerCase().includes(s))
  }, [rows, q])

  function updateRow(id: number | undefined, patch: Partial<Row>) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch, _dirty: true } : r)))
  }

  function addEmpty() {
    const n: Row = {
      _new: true,
      name: '',
      category: 'Pratos',
      price: 0,
      pricePerKg: null,
      route: 'CAIXA',
      code: ''
    }
    setRows(prev => [n, ...prev])
  }

  async function save(r: Row) {
    const payload: Product = {
      id: r.id,
      name: r.name.trim(),
      category: r.category,
      price: r.category === 'Por Peso' ? null : Number(r.price ?? 0),
      pricePerKg: r.category === 'Por Peso' ? Number(r.pricePerKg ?? 0) : null,
      route: r.route,
      code: (r.code ?? '').trim() || null
    }
    await saveProduct(payload)
    const all = await listProducts()
    setRows(all.map(p => ({ ...p })))
    alert('Produto salvo.')
  }

  async function del(r: Row) {
    if (!r.id) { setRows(prev => prev.filter(x => x !== r)); return }
    if (!confirm(`Remover "${r.name}"?`)) return
    await removeProduct(r.id)
    setRows(prev => prev.filter(x => x.id !== r.id))
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Admin · Produtos</h2>

      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <input
          placeholder="Buscar por nome ou código…"
          value={q}
          onChange={e=>setQ(e.target.value)}
          style={{ flex:1, padding:8 }}
        />
        <button onClick={addEmpty}>+ Novo</button>
      </div>

      <div style={{ overflow:auto as any }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #eee', textAlign:'left' }}>
              <th style={{ padding:8, width:70 }}>ID</th>
              <th style={{ padding:8, minWidth:220 }}>Nome</th>
              <th style={{ padding:8, width:140 }}>Categoria</th>
              <th style={{ padding:8, width:120 }}>Preço</th>
              <th style={{ padding:8, width:120 }}>Preço/kg</th>
              <th style={{ padding:8, width:140 }}>Rota</th>
              <th style={{ padding:8, width:180 }}>Código (leitor)</th>
              <th style={{ padding:8, width:180 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id ?? Math.random()} style={{ borderBottom:'1px solid #f6f6f6' }}>
                <td style={{ padding:8, opacity:.6 }}>{r.id ?? '—'}</td>
                <td style={{ padding:8 }}>
                  <input value={r.name} onChange={e=>updateRow(r.id, { name: e.target.value })} style={{ width:'100%' }} />
                </td>
                <td style={{ padding:8 }}>
                  <select
                    value={r.category}
                    onChange={e=>{
                      const c = e.target.value as typeof r.category
                      updateRow(r.id, {
                        category: c,
                        // zera o campo que não for da categoria
                        price: c === 'Por Peso' ? null : Number(r.price ?? 0),
                        pricePerKg: c === 'Por Peso' ? Number(r.pricePerKg ?? 0) : null
                      })
                    }}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td style={{ padding:8 }}>
                  <input
                    type="number" step={0.01} min={0}
                    disabled={r.category === 'Por Peso'}
                    value={r.price ?? 0}
                    onChange={e=>updateRow(r.id, { price: Number(e.target.value || 0) })}
                    style={{ width:110 }}
                  />
                </td>
                <td style={{ padding:8 }}>
                  <input
                    type="number" step={0.01} min={0}
                    disabled={r.category !== 'Por Peso'}
                    value={r.pricePerKg ?? 0}
                    onChange={e=>updateRow(r.id, { pricePerKg: Number(e.target.value || 0) })}
                    style={{ width:110 }}
                  />
                </td>
                <td style={{ padding:8 }}>
                  <select value={r.route ?? 'CAIXA'} onChange={e=>updateRow(r.id, { route: e.target.value as any })}>
                    {routes.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                  </select>
                </td>
                <td style={{ padding:8 }}>
                  <input
                    placeholder="EAN/PLU/SKU"
                    value={r.code ?? ''}
                    onChange={e=>updateRow(r.id, { code: e.target.value })}
                    style={{ width:160 }}
                  />
                </td>
                <td style={{ padding:8 }}>
                  <button onClick={()=>save(r)} style={{ marginRight:8 }}>Salvar</button>
                  <button onClick={()=>del(r)}>Remover</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td style={{ padding:12, opacity:.6 }} colSpan={8}><i>Nenhum item.</i></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
