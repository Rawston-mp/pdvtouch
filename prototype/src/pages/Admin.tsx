// src/pages/Admin.tsx
import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, createProduct, deleteProduct, listProducts, updateProduct } from '../db/products'
import type { Product, Category } from '../db/models'

type FormState = {
  id?: number
  name: string
  category: Category
  price?: string
  pricePerKg?: string
  active: boolean
}

const emptyForm: FormState = {
  name: '',
  category: 'Pratos',
  price: '',
  pricePerKg: '',
  active: true
}

export default function Admin() {
  const [items, setItems] = useState<Product[]>([])
  const [form, setForm] = useState<FormState>({ ...emptyForm })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  async function refresh() {
    const list = await listProducts(!showInactive)
    setItems(list)
  }

  useEffect(() => {
    refresh()
  }, [showInactive])

  function onEdit(p: Product) {
    setEditingId(p.id!)
    setForm({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price?.toString() ?? '',
      pricePerKg: p.pricePerKg?.toString() ?? '',
      active: p.active
    })
  }

  function onCancel() {
    setEditingId(null)
    setForm({ ...emptyForm })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    const payload: Omit<Product, 'id'> = {
      name: form.name.trim(),
      category: form.category,
      price: form.category === 'Por Peso' ? undefined : numberOrUndefined(form.price),
      pricePerKg: form.category === 'Por Peso' ? numberOrUndefined(form.pricePerKg) : undefined,
      active: form.active
    }
    if (!payload.name) {
      alert('Nome é obrigatório.')
      return
    }
    if (payload.category === 'Por Peso' && !payload.pricePerKg) {
      alert('Preço por Kg é obrigatório para a categoria "Por Peso".')
      return
    }
    if (payload.category !== 'Por Peso' && !payload.price) {
      alert('Preço unitário é obrigatório para categorias não "Por Peso".')
      return
    }

    if (editingId) {
      await updateProduct(editingId, payload)
    } else {
      await createProduct(payload)
    }
    await refresh()
    onCancel()
  }

  async function onDelete(id?: number) {
    if (!id) return
    if (!confirm('Excluir este produto?')) return
    await deleteProduct(id)
    await refresh()
  }

  const view = useMemo(() => items.sort((a, b) => (a.category + a.name).localeCompare(b.category + b.name)), [items])

  return (
    <div style={{ padding: 16 }}>
      <h2>Admin – Produtos</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <label>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} /> Mostrar inativos
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 2fr', gap: 16 }}>
        {/* Formulário */}
        <form onSubmit={onSubmit} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
          <h3>{editingId ? 'Editar produto' : 'Novo produto'}</h3>

          <div style={row}>
            <label style={lbl}>Nome</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} />
          </div>

          <div style={row}>
            <label style={lbl}>Categoria</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Category })} style={inp}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {form.category === 'Por Peso' ? (
            <div style={row}>
              <label style={lbl}>Preço por Kg</label>
              <input type="number" step="0.01" value={form.pricePerKg} onChange={e => setForm({ ...form, pricePerKg: e.target.value })} style={inp} />
            </div>
          ) : (
            <div style={row}>
              <label style={lbl}>Preço unitário</label>
              <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={inp} />
            </div>
          )}

          <div style={row}>
            <label style={lbl}>Ativo</label>
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" style={btnPrimary}>{editingId ? 'Salvar' : 'Adicionar'}</button>
            {editingId && <button type="button" onClick={onCancel} style={btnLight}>Cancelar</button>}
          </div>
        </form>

        {/* Tabela */}
        <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
          <h3>Catálogo</h3>
          {view.length === 0 ? (
            <div style={{ opacity: 0.7 }}>Nenhum produto.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                  <th style={th}>Nome</th>
                  <th style={th}>Categoria</th>
                  <th style={th}>Preço</th>
                  <th style={th}>Ativo</th>
                  <th style={th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {view.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f4f4f4' }}>
                    <td style={td}>{p.name}</td>
                    <td style={td}>{p.category}</td>
                    <td style={td}>
                      {p.category === 'Por Peso'
                        ? (p.pricePerKg ? `R$ ${p.pricePerKg.toFixed(2)} / kg` : '—')
                        : (p.price ? `R$ ${p.price.toFixed(2)}` : '—')}
                    </td>
                    <td style={td}>{p.active ? 'Sim' : 'Não'}</td>
                    <td style={td}>
                      <button onClick={() => onEdit(p)} style={btnLight}>Editar</button>{' '}
                      <button onClick={() => onDelete(p.id)} style={btnDanger}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function numberOrUndefined(v?: string) {
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: 8, marginBottom: 8 }
const lbl: React.CSSProperties = { fontSize: 14, color: '#444' }
const inp: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }
const th: React.CSSProperties = { padding: 8 }
const td: React.CSSProperties = { padding: 8 }
const btnPrimary: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #0b5', background: '#0b5', color: '#fff', cursor: 'pointer' }
const btnLight: React.CSSProperties  = { padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }
const btnDanger: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #b00', background: '#fff0f0', color: '#b00', cursor: 'pointer' }
