// src/pages/AdminProdutos.tsx
import React, { useEffect, useMemo, useState } from 'react'
import type { Product } from '../db'
import { listProducts, upsertProduct } from '../db/products'
import { toCSV } from '../lib/csv'
import { mintSSO } from '../services/ssoClient'

type Category = Product['category']
const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'Pratos', label: 'Pratos' },
  { key: 'Bebidas', label: 'Bebidas' },
  { key: 'Sobremesas', label: 'Sobremesas' },
  { key: 'Por Peso', label: 'Por Peso' },
]

const money = (n: number | string | null | undefined) => (Number(n || 0)).toFixed(2)
const parseNum = (v: string | number | null | undefined, fallback = 0): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback
  if (!v) return fallback
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}

export default function AdminProdutos() {
  // const { hasRole } = useSession()
  // const canEditRole = hasRole('ADMIN') || hasRole('GERENTE')
  // PDV agora é somente leitura para cadastros; edição deve ser feita no Backoffice
  const canEdit = false

  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState<Category | 'Todas'>('Todas')
  const [activeOnly, setActiveOnly] = useState<boolean>(true)

  // Formulário
  type FormState = {
    id?: string
    name: string
    category: Category
    byWeight: boolean
    price: string
    pricePerKg: string
    code: string
    active: boolean
  }
  const emptyForm: FormState = {
    id: undefined,
    name: '',
    category: 'Pratos',
    byWeight: false,
    price: '0',
    pricePerKg: '0',
    code: '',
    active: true,
  }
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [notice, setNotice] = useState<string>('')
  // const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recarrega quando alternar "Apenas ativos"
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly])

  async function load() {
    try {
      setLoading(true)
      const data = await listProducts({ activeOnly })
      setItems(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let base = items
    if (cat !== 'Todas') base = base.filter((i) => i.category === cat)
    if (search.trim()) {
      const s = search.toLowerCase()
      base = base.filter(
        (i) => i.name.toLowerCase().includes(s) || (i.code || '').toLowerCase() === s,
      )
    }
    return base
  }, [items, cat, search])

  function resetForm() {
    setForm(emptyForm)
    setEditing(false)
    setError('')
    setNotice('')
  }

  // function editItem(p: Product) {
  //   setEditing(true)
  //   setError('')
  //   setForm({
  //     id: p.id,
  //     name: p.name,
  //     category: p.category,
  //     byWeight: !!p.byWeight,
  //     price: String(p.price ?? 0),
  //     pricePerKg: String(p.pricePerKg ?? 0),
  //     code: p.code || '',
  //     active: !!p.active,
  //   })
  // }

  async function save() {
    try {
      if (!canEdit) return
      const name = form.name.trim()
      if (!name) return setError('Informe o nome do produto.')
      const category = form.category
      const byWeight = !!form.byWeight
      const price = byWeight ? 0 : Math.max(0, parseNum(form.price, 0))
      const pricePerKg = byWeight ? Math.max(0, parseNum(form.pricePerKg, 0)) : 0
      if (!byWeight && price <= 0) return setError('Preço unitário deve ser maior que zero.')
      if (byWeight && pricePerKg <= 0)
        return setError('Preço por Kg deve ser maior que zero para itens por peso.')

      const id = form.id || (crypto?.randomUUID ? crypto.randomUUID() : `p_${Date.now()}`)

      const prod: Product = {
        id,
        name,
        category,
        byWeight,
        price,
        pricePerKg,
        code: form.code.trim() || undefined,
        active: !!form.active,
      }
      await upsertProduct(prod)
      resetForm()
      await load()
    } catch (e) {
      console.error(e)
      setError('Erro ao salvar produto.')
    }
  }

  // async function remove(p: Product) {
  //   if (!canEdit) return
  //   if (!confirm(`Remover o produto "${p.name}"?`)) return
  //   try {
  //     await deleteProduct(p.id)
  //     await load()
  //   } catch (e) {
  //     console.error(e)
  //     alert('Erro ao remover produto.')
  //   }
  // }

  // async function toggleActive(p: Product) {
  //   if (!canEdit) return
  //   try {
  //     await upsertProduct({ ...p, active: !p.active })
  //     await load()
  //   } catch (e) {
  //     console.error(e)
  //     alert('Erro ao atualizar produto.')
  //   }
  // }

  function download(filename: string, text: string) {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleExportCSV() {
    const cols = ['id', 'name', 'category', 'byWeight', 'price', 'pricePerKg', 'code', 'active']
    const rows = filtered.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      byWeight: p.byWeight ? 'true' : 'false',
      price: String(p.price ?? 0),
      pricePerKg: String(p.pricePerKg ?? 0),
      code: p.code ?? '',
      active: p.active ? 'true' : 'false',
    }))
    const csv = toCSV(rows, cols)
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
    download(`produtos_${stamp}.csv`, csv)
  }

  function handleDownloadModelCSV() {
    const head = ['id', 'name', 'category', 'byWeight', 'price', 'pricePerKg', 'code', 'active']
    download('modelo_produtos.csv', head.join(','))
  }

  function handleDownloadSampleCSV() {
    const cols = ['id', 'name', 'category', 'byWeight', 'price', 'pricePerKg', 'code', 'active']
    const rows = [
      {
        id: 'p_demo_1',
        name: 'Exemplo Unitário',
        category: 'Pratos',
        byWeight: 'false',
        price: '24,90',
        pricePerKg: '0',
        code: 'EX001',
        active: 'true',
      },
      {
        id: 'p_demo_2',
        name: 'Exemplo Por Kg',
        category: 'Por Peso',
        byWeight: 'true',
        price: '0',
        pricePerKg: '69,90',
        code: 'EXKG1',
        active: 'true',
      },
    ]
  const csv = toCSV(rows as Record<string, string | number | boolean>[], cols)
    download('exemplo_produtos.csv', csv)
  }

  // const parseBool = (v: unknown): boolean => {
  //   if (typeof v === 'boolean') return v
  //   if (typeof v === 'number') return v !== 0
  //   const s = String(v || '').trim().toLowerCase()
  //   return s === '1' || s === 'true' || s === 'sim' || s === 'yes' || s === 'y'
  // }

  // const normalizeCategory = (v: unknown): Category => {
  //   const s = String(v || '').trim()
  //   const cats = CATEGORIES.map((c) => c.key)
  //   if (cats.includes(s as Category)) return s as Category
  //   // tenta por label
  //   const found = CATEGORIES.find((c) => c.label.toLowerCase() === s.toLowerCase())
  //   return (found?.key ?? 'Pratos') as Category
  // }

  // const parseLocaleNumber = (v: unknown, fallback = 0): number => {
  //   if (typeof v === 'number') return Number.isFinite(v) ? v : fallback
  //   const s = String(v ?? '').trim()
  //   if (!s) return fallback
  //   if (s.includes(',') && s.includes('.')) {
  //     // Assumir ponto como milhar e vírgula como decimal
  //     const n = Number(s.replace(/\./g, '').replace(',', '.'))
  //     return Number.isFinite(n) ? n : fallback
  //   }
  //   if (s.includes(',')) {
  //     const n = Number(s.replace(',', '.'))
  //     return Number.isFinite(n) ? n : fallback
  //   }
  //   const n = Number(s)
  //   return Number.isFinite(n) ? n : fallback
  // }

  // Importação de CSV desabilitada no PDV; realizar no Backoffice

  return (
    <div className="container">
      <h2>Admin → Produtos</h2>
      <div className="pill" style={{ margin: '8px 0', background: '#fff8e1', borderColor: '#ffb300' }}>
        Edição de produtos agora é feita no Backoffice. Use o botão abaixo para abrir Cadastros no Backoffice.
      </div>
      {!!notice && (
        <div className="pill" style={{ margin: '8px 0', background: '#e8f5e9', borderColor: '#4caf50' }}>
          {notice}
        </div>
      )}

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <label className="small muted">Busca</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou código"
              style={{ width: 220 }}
            />
          </div>
          <div>
            <label className="small muted">Categoria</label>
            <select value={cat} onChange={(e) => setCat(e.target.value as Category | 'Todas')}>
              <option value="Todas">Todas</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            Apenas ativos
          </label>
          <button className="btn" onClick={load} disabled={loading}>
            Atualizar
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
          <h3 className="card-title">Produtos</h3>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary" onClick={() => mintSSO('/cadastro/produtos')}>
              Abrir no Backoffice (Cadastros)
            </button>
            <button className="btn" onClick={handleDownloadModelCSV}>
              Baixar modelo CSV
            </button>
            <button className="btn" onClick={handleDownloadSampleCSV}>
              Baixar exemplo CSV
            </button>
            <button className="btn" onClick={handleExportCSV} disabled={loading}>
              Exportar CSV
            </button>
            {/* Importação e criação ficam disponíveis no Backoffice */}
          </div>
        </div>

        {loading && <div className="muted">Carregando…</div>}
        {!loading && filtered.length === 0 && (
          <div className="muted">Nenhum produto para os filtros atuais.</div>
        )}

        {!!filtered.length && (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Nome</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Preço</th>
                <th>Preço/kg</th>
                <th>Código</th>
                <th>Status</th>
                <th style={{ width: 210 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.byWeight ? 'Por Peso' : 'Unitário'}</td>
                  <td>{p.byWeight ? '-' : `R$ ${money(p.price)}`}</td>
                  <td>{p.byWeight ? `R$ ${money(p.pricePerKg)}` : '-'}</td>
                  <td>{p.code || '-'}</td>
                  <td>
                    <span className={`pill small ${p.active ? 'success' : ''}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn" onClick={() => mintSSO('/cadastro/produtos')}>
                        Editar no Backoffice
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Formulário */}
      {/* Formulário de edição desativado no PDV; edição ocorre no Backoffice */}
      {editing && canEdit && (
        <div className="card">
          <h3 className="card-title">
            {form.id ? 'Editar produto' : 'Novo produto'}
          </h3>

          {!!error && (
            <div className="pill" style={{ background: '#fdecea', borderColor: '#f44336' }}>
              {error}
            </div>
          )}

          <div className="grid grid-3" style={{ alignItems: 'end' }}>
            <div>
              <label className="small muted">Nome</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="small muted">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={form.byWeight}
                onChange={(e) => setForm((f) => ({ ...f, byWeight: e.target.checked }))}
              />
              Por peso (Kg)
            </label>
          </div>

          <div className="grid grid-3" style={{ alignItems: 'end', marginTop: 8 }}>
            <div>
              <label className="small muted">Preço unitário</label>
              <input
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value.replace(/[^\d.,]/g, '') }))
                }
                style={{ width: '100%', textAlign: 'right' }}
                disabled={form.byWeight}
              />
            </div>

            <div>
              <label className="small muted">Preço por Kg</label>
              <input
                value={form.pricePerKg}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pricePerKg: e.target.value.replace(/[^\d.,]/g, '') }))
                }
                style={{ width: '100%', textAlign: 'right' }}
                disabled={!form.byWeight}
              />
            </div>

            <div>
              <label className="small muted">Código (opcional)</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                style={{ width: '100%' }}
                placeholder="Usado pelo leitor/PLU"
              />
            </div>
          </div>

          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Ativo
            </label>

            <div style={{ flex: 1 }} />

            <button className="btn" onClick={resetForm}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={save} disabled={!canEdit}>
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}