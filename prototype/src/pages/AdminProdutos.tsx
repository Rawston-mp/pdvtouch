// src/pages/AdminProdutos.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Product } from '../db'
import { listProducts, upsertProduct, deleteProduct } from '../db/products'
import { useSession } from '../auth/session'
import { parseCSV, toCSV } from '../lib/csv'
import ProductFormTabs from '../components/ProductFormTabs'
import { notifyProductChange } from '../hooks/useProductSync'

type Category = Product['category']
const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'Pratos', label: 'Pratos' },
  { key: 'Bebidas', label: 'Bebidas' },
  { key: 'Sobremesas', label: 'Sobremesas' },
  { key: 'Por Peso', label: 'Por Peso' },
]

const money = (n: number | string | null | undefined) => (Number(n || 0)).toFixed(2)

export default function AdminProdutos() {
  const { hasRole } = useSession()
  const canEdit = hasRole('ADMIN') || hasRole('GERENTE')

  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState<Category | 'Todas'>('Todas')
  const [activeOnly, setActiveOnly] = useState<boolean>(true)

  // Formulário - Compatível com ExtendedProduct
  type FormState = Partial<Product> & {
    // Override para campos que podem ser strings durante edição
    price?: number
    pricePerKg?: number
    costPrice?: number
    profitMargin?: number
    salePrice?: number
    mcm?: number
    icmsRate?: number
    pisRate?: number
    cofinsRate?: number
  }
  
  const emptyForm: FormState = {
    id: undefined,
    name: '',
    category: 'Pratos',
    byWeight: false,
    price: 0,
    pricePerKg: 0,
    code: '',
    active: true,
    unit: 'UN',
    costPrice: 0,
    profitMargin: 0,
    mcm: 1,
    cfop: '5102',
    cst: '102',
    ncm: '',
    icmsRate: 0,
    pisCst: '49',
    pisRate: 0,
    cofinsCst: '49',
    cofinsRate: 0,
  }
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [notice, setNotice] = useState<string>('')
  const fileRef = useRef<HTMLInputElement | null>(null)

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

  function editItem(p: Product) {
    setEditing(true)
    setError('')
    setForm({
      ...p,
      // Campos que podem estar undefined devem ter valores padrão
      name: p.name || '',
      category: p.category || 'Pratos',
      byWeight: !!p.byWeight,
      price: p.price ?? 0,
      pricePerKg: p.pricePerKg ?? 0,
      code: p.code || '',
      active: p.active !== false,
      unit: p.unit || 'UN',
      costPrice: p.costPrice || 0,
      profitMargin: p.profitMargin || 0,
      mcm: p.mcm || 1,
      salePrice: p.salePrice || p.price || 0,
      cfop: p.cfop || '5102',
      cst: p.cst || '102',
      ncm: p.ncm || '',
      icmsRate: p.icmsRate || 0,
      pisCst: p.pisCst || '49',
      pisRate: p.pisRate || 0,
      cofinsCst: p.cofinsCst || '49',
      cofinsRate: p.cofinsRate || 0,
    })
  }

  async function save() {
    try {
      if (!canEdit) return
      const name = (form.name || '').trim()
      if (!name) return setError('Informe o nome do produto.')
      const category = form.category || 'Pratos'
      const byWeight = !!form.byWeight
      
      // Para produtos unitários: usar price (campo principal)
      // Para produtos por peso: usar salePrice (preço unitário) + pricePerKg
      const price = byWeight ? 0 : Math.max(0, form.price || 0)
      const pricePerKg = byWeight ? Math.max(0, form.pricePerKg || 0) : 0
      const salePrice = byWeight ? Math.max(0, form.salePrice || 0) : (form.price || 0)
      
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
        code: (form.code || '').trim() || undefined,
        active: form.active !== false,
        // Novos campos
        unit: form.unit || 'UN',
        costPrice: form.costPrice || 0,
        profitMargin: form.profitMargin || 0,
        mcm: form.mcm || 1,
        salePrice: salePrice,
        cfop: form.cfop || '5102',
        cst: form.cst || '102',
        ncm: form.ncm || '',
        icmsRate: form.icmsRate || 0,
        pisCst: form.pisCst || '49',
        pisRate: form.pisRate || 0,
        cofinsCst: form.cofinsCst || '49',
        cofinsRate: form.cofinsRate || 0,
      }
      await upsertProduct(prod)
      resetForm()
      await load()
      notifyProductChange() // Notifica outras páginas
    } catch (e) {
      console.error(e)
      setError('Erro ao salvar produto.')
    }
  }

  async function remove(p: Product) {
    if (!canEdit) return
    if (!confirm(`Remover o produto "${p.name}"?`)) return
    try {
      await deleteProduct(p.id)
      await load()
      notifyProductChange() // Notifica outras páginas
    } catch (e) {
      console.error(e)
      alert('Erro ao remover produto.')
    }
  }

  async function toggleActive(p: Product) {
    if (!canEdit) return
    try {
      await upsertProduct({ ...p, active: !p.active })
      await load()
      notifyProductChange() // Notifica outras páginas
    } catch (e) {
      console.error(e)
      alert('Erro ao atualizar produto.')
    }
  }

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
    const csv = toCSV(rows, cols)
    download('exemplo_produtos.csv', csv)
  }

  const parseBool = (v: unknown): boolean => {
    if (typeof v === 'boolean') return v
    if (typeof v === 'number') return v !== 0
    const s = String(v || '').trim().toLowerCase()
    return s === '1' || s === 'true' || s === 'sim' || s === 'yes' || s === 'y'
  }

  const normalizeCategory = (v: unknown): Category => {
    const s = String(v || '').trim()
    const cats = CATEGORIES.map((c) => c.key)
    if (cats.includes(s as Category)) return s as Category
    // tenta por label
    const found = CATEGORIES.find((c) => c.label.toLowerCase() === s.toLowerCase())
    return (found?.key ?? 'Pratos') as Category
  }

  const parseLocaleNumber = (v: unknown, fallback = 0): number => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : fallback
    const s = String(v ?? '').trim()
    if (!s) return fallback
    if (s.includes(',') && s.includes('.')) {
      // Assumir ponto como milhar e vírgula como decimal
      const n = Number(s.replace(/\./g, '').replace(',', '.'))
      return Number.isFinite(n) ? n : fallback
    }
    if (s.includes(',')) {
      const n = Number(s.replace(',', '.'))
      return Number.isFinite(n) ? n : fallback
    }
    const n = Number(s)
    return Number.isFinite(n) ? n : fallback
  }

  async function handleImportFile(file: File) {
    try {
      if (!canEdit) return
      const text = await file.text()
      const rows = parseCSV(text)
      if (!rows.length) {
        setError('CSV vazio ou inválido.')
        return
      }
      let ok = 0
      let fail = 0
      for (const r of rows) {
        try {
          const byWeight = parseBool(r.byWeight)
          const prod: Product = {
            id: r.id?.trim() || (crypto?.randomUUID ? crypto.randomUUID() : `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
            name: (r.name || '').trim(),
            category: normalizeCategory(r.category),
            byWeight,
            price: byWeight ? 0 : Math.max(0, parseLocaleNumber(r.price, 0)),
            pricePerKg: byWeight ? Math.max(0, parseLocaleNumber(r.pricePerKg, 0)) : 0,
            code: (r.code || '').trim() || undefined,
            active: parseBool(r.active ?? true),
          }
          if (!prod.name) throw new Error('Nome vazio')
          if (!byWeight && prod.price <= 0) throw new Error('Preço unitário inválido')
          if (byWeight && (prod.pricePerKg || 0) <= 0) throw new Error('Preço/kg inválido')
          await upsertProduct(prod)
          ok++
        } catch (e) {
          console.warn('Falha em linha CSV:', r, e)
          fail++
        }
      }
      setNotice(`Importação concluída. Sucesso: ${ok}. Falhas: ${fail}.`)
      setError('')
      await load()
      if (ok > 0) notifyProductChange() // Notifica outras páginas se houve alterações
    } catch (e) {
      console.error(e)
      setError('Erro ao importar CSV.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="container">
      <h2>Admin → Produtos</h2>

      {!canEdit && (
        <div className="pill" style={{ margin: '8px 0', background: '#fff8e1', borderColor: '#ffb300' }}>
          Você está em um perfil sem permissão de edição (somente ADMIN/GERENTE podem criar/editar/remover produtos).
        </div>
      )}
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
            <button className="btn" onClick={handleDownloadModelCSV}>
              Baixar modelo CSV
            </button>
            <button className="btn" onClick={handleDownloadSampleCSV}>
              Baixar exemplo CSV
            </button>
            <button className="btn" onClick={handleExportCSV} disabled={loading}>
              Exportar CSV
            </button>
            {canEdit && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImportFile(f)
                  }}
                />
                <button className="btn" onClick={() => fileRef.current?.click()} disabled={loading}>
                  Importar CSV
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setForm(emptyForm)
                    setEditing(true)
                  }}
                >
                  Novo produto
                </button>
              </>
            )}
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
                <th style={{ width: '20%' }}>Nome</th>
                <th>Categoria</th>
                <th>Unidade</th>
                <th>Custo</th>
                <th>Margem</th>
                <th>Preço Venda</th>
                <th>CFOP</th>
                <th>Código</th>
                <th>Status</th>
                <th style={{ width: 210 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div>
                      <strong>{p.name}</strong>
                      {p.byWeight && <small className="muted"> (Por Peso)</small>}
                    </div>
                  </td>
                  <td>{p.category}</td>
                  <td>{p.unit || 'UN'}</td>
                  <td>{p.costPrice ? `R$ ${money(p.costPrice)}` : '-'}</td>
                  <td>{p.profitMargin ? `${p.profitMargin.toFixed(1)}%` : '-'}</td>
                  <td>
                    {p.byWeight ? (
                      <span>R$ {money(p.pricePerKg)}/kg</span>
                    ) : (
                      <span>R$ {money(p.price)}</span>
                    )}
                  </td>
                  <td>
                    <span className="pill small" style={{ fontSize: '10px' }}>
                      {p.cfop || '5102'}
                    </span>
                  </td>
                  <td>{p.code || '-'}</td>
                  <td>
                    <span className={`pill small ${p.active ? 'success' : ''}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => editItem(p)} disabled={!canEdit}>
                        Editar
                      </button>
                      <button onClick={() => toggleActive(p)} disabled={!canEdit}>
                        {p.active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button className="btn" onClick={() => remove(p)} disabled={!canEdit}>
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Formulário Moderno com Abas */}
      {editing && (
        <>
          {!!error && (
            <div className="pill" style={{ background: '#fdecea', borderColor: '#f44336', marginBottom: 16 }}>
              {error}
            </div>
          )}
          
          <ProductFormTabs
            product={form}
            onChange={setForm}
            onSave={save}
            onCancel={resetForm}
            isEditing={!!form.id}
          />
        </>
      )}
    </div>
  )
}