// src/pages/AdminProdutos.tsx
import React, { useEffect, useMemo, useState } from "react"
import { deleteProduct, listProducts, seedProducts, upsertProduct } from "../db/products"
import type { Product } from "../db"

const CATS: Product["category"][] = ["Pratos", "Bebidas", "Sobremesas", "Por Peso"]

export default function AdminProdutos() {
  const [items, setItems] = useState<Product[]>([])
  const [filter, setFilter] = useState<Product["category"] | "Todas">("Todas")

  async function load() {
    const all = await listProducts()
    setItems(all.sort((a,b)=>a.category.localeCompare(b.category) || a.name.localeCompare(b.name)))
  }
  useEffect(() => { load() }, [])

  const list = useMemo(
    () => (filter === "Todas" ? items : items.filter(i => i.category === filter)),
    [items, filter]
  )

  async function add() {
    const id = crypto.randomUUID()
    const p: Product = {
      id, name: "Novo Produto", category: "Pratos", byWeight: false,
      price: 0, pricePerKg: 0, active: true, code: ""
    }
    await upsertProduct(p)
    await load()
  }

  async function save(p: Product) {
    await upsertProduct(p)
    await load()
  }

  async function remove(id: string) {
    if (!confirm("Remover produto?")) return
    await deleteProduct(id)
    await load()
  }

  async function applySeed() {
    if (!confirm("Reaplicar seed de produtos (substitui os atuais se vazio)?")) return
    await seedProducts()
    await load()
  }

  return (
    <div className="container">
      <h2>Produtos</h2>

      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <button className="btn" onClick={add}>Adicionar</button>
        <button className="btn" onClick={applySeed}>Aplicar seed</button>
        <span className="muted">Filtro:</span>
        <select value={filter} onChange={e => setFilter(e.target.value as any)}>
          <option>Todas</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {!list.length && <div className="muted">Nenhum produto.</div>}

      {list.map(p => (
        <div key={p.id} className="card" style={{ marginBottom: 8 }}>
          <div className="grid grid-3">
            <div>
              <label>Nome</label>
              <input value={p.name} onChange={e => save({ ...p, name: e.target.value })}/>
            </div>
            <div>
              <label>Categoria</label>
              <select value={p.category} onChange={e => save({ ...p, category: e.target.value as any })}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label>Ativo</label>
              <select value={p.active ? "1" : "0"} onChange={e => save({ ...p, active: e.target.value === "1" })}>
                <option value="1">Sim</option>
                <option value="0">Não</option>
              </select>
            </div>

            <div>
              <label>Por peso?</label>
              <select value={p.byWeight ? "1" : "0"} onChange={e => save({ ...p, byWeight: e.target.value === "1" })}>
                <option value="0">Não (unitário)</option>
                <option value="1">Sim (Kg)</option>
              </select>
            </div>

            {!p.byWeight && (
              <div>
                <label>Preço (R$)</label>
                <input
                  value={String(p.price)}
                  onChange={e => save({ ...p, price: Number(e.target.value || 0) })}
                />
              </div>
            )}

            {p.byWeight && (
              <div>
                <label>Preço/Kg (R$)</label>
                <input
                  value={String(p.pricePerKg || 0)}
                  onChange={e => save({ ...p, pricePerKg: Number(e.target.value || 0) })}
                />
              </div>
            )}

            <div>
              <label>PLU/Código (leitor)</label>
              <input value={p.code || ""} onChange={e => save({ ...p, code: e.target.value })} />
            </div>
          </div>

          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={() => remove(p.id)}>Remover</button>
          </div>
        </div>
      ))}
    </div>
  )
}
