import React, { useEffect, useState } from "react"
import { listProducts, upsertProduct, deleteProduct, type Product } from "../db/products"
// Se existir: import { listCategories } from "../db/categories"

export default function AdminProdutos() {
  const [products, setProducts] = useState<Product[]>([])
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<Partial<Product>>({})
  // const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const prods = await listProducts()
      setProducts(prods)
      // Se existir: const cats = await listCategories(); setCategories(cats.map(c => c.name))
    }
    load()
  }, [])

  function startEdit(p: Product) {
    setEditing(p)
    setForm({ ...p })
  }
  function cancelEdit() {
    setEditing(null)
    setForm({})
  }
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }
  async function save() {
    if (!form.name || !form.category) return alert("Preencha nome e categoria.")
    const prod: Product = {
      id: form.id || Math.random().toString(36).slice(2),
      name: form.name,
      category: form.category as Product["category"],
      price: Number(form.price || 0),
      byWeight: Boolean(form.byWeight),
      pricePerKg: Number(form.pricePerKg || 0),
      code: form.code || "",
      active: form.active !== false,
    }
    await upsertProduct(prod)
    setEditing(null)
    setForm({})
    setProducts(await listProducts())
  }
  async function remove(id: string) {
    if (!window.confirm("Confirma excluir produto?")) return
    await deleteProduct(id)
    setProducts(await listProducts())
  }

  return (
    <div className="container">
      <h2>Administração de Produtos</h2>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Cadastrar / Editar Produto</h3>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input
            name="name"
            value={form.name || ""}
            onChange={handleChange}
            placeholder="Nome do produto"
            style={{ width: 180 }}
          />
          <select
            name="category"
            value={form.category || ""}
            onChange={handleChange}
            style={{ width: 140 }}
          >
            <option value="">Categoria</option>
            <option value="Pratos">Pratos</option>
            <option value="Bebidas">Bebidas</option>
            <option value="Sobremesas">Sobremesas</option>
            <option value="Por Peso">Por Peso</option>
            {/* Se existir: categories.map(c => <option key={c} value={c}>{c}</option>) */}
          </select>
          <input
            name="price"
            type="number"
            step="0.01"
            value={form.price || ""}
            onChange={handleChange}
            placeholder="Preço un."
            style={{ width: 100 }}
            disabled={form.byWeight === true || form.category === "Por Peso"}
          />
          <input
            name="pricePerKg"
            type="number"
            step="0.01"
            value={form.pricePerKg || ""}
            onChange={handleChange}
            placeholder="Preço/kg"
            style={{ width: 100 }}
            disabled={form.byWeight !== true && form.category !== "Por Peso"}
          />
          <input
            name="code"
            value={form.code || ""}
            onChange={handleChange}
            placeholder="Código/PLU/SKU"
            style={{ width: 120 }}
          />
          <label>
            <input
              name="byWeight"
              type="checkbox"
              checked={form.byWeight === true || form.category === "Por Peso"}
              onChange={(e) => setForm((f) => ({ ...f, byWeight: e.target.checked }))}
            /> Por Peso
          </label>
          <label>
            <input
              name="active"
              type="checkbox"
              checked={form.active !== false}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            /> Ativo
          </label>
          <button className="btn btn-primary" onClick={save}>
            {editing ? "Salvar" : "Cadastrar"}
          </button>
          {editing && <button className="btn" onClick={cancelEdit}>Cancelar</button>}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Produtos cadastrados</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Por Peso</th>
              <th>Código</th>
              <th>Ativo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>{p.byWeight ? `R$ ${Number(p.pricePerKg || 0).toFixed(2)}/kg` : `R$ ${Number(p.price || 0).toFixed(2)}`}</td>
                <td>{p.byWeight ? "Sim" : "Não"}</td>
                <td>{p.code}</td>
                <td>{p.active ? "Sim" : "Não"}</td>
                <td>
                  <button className="btn" onClick={() => startEdit(p)}>Editar</button>
                  <button className="btn" onClick={() => remove(p.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
