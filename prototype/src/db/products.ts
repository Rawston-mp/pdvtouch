// src/db/products.ts
import { db, type Product } from './index'

export async function listProducts(opts?: {
  category?: Product['category']
  activeOnly?: boolean
}) {
  let q = db.products.toCollection()
  if (opts?.category) q = db.products.where('category').equals(opts.category).toCollection()
  let items = await q.toArray()
  if (opts?.activeOnly) items = items.filter((i) => i.active)
  // Normaliza numéricos
  return items.map((i) => ({
    ...i,
    price: Number(i.price || 0),
    pricePerKg: Number(i.pricePerKg || 0),
  }))
}

export async function upsertProduct(p: Product) {
  await db.products.put(p)
}

export async function deleteProduct(id: string) {
  await db.products.delete(id)
}

export async function seedProducts() {
  // Reaplica os padrões (idempotente)
  const exists = await db.products.count()
  if (exists > 0) return
  await db.transaction('rw', db.products, async () => {
    await db.products.clear()
    await db.products.bulkPut([
      {
        id: 'p001',
        name: 'Prato Executivo',
        category: 'Pratos',
        byWeight: false,
        price: 24.9,
        active: true,
        code: 'PR001',
      },
      {
        id: 'p002',
        name: 'Guarnição do Dia',
        category: 'Pratos',
        byWeight: false,
        price: 12.0,
        active: true,
        code: 'PR002',
      },
      {
        id: 's001',
        name: 'Mousse',
        category: 'Sobremesas',
        byWeight: false,
        price: 7.5,
        active: true,
        code: 'SB001',
      },
      {
        id: 's002',
        name: 'Pudim',
        category: 'Sobremesas',
        byWeight: false,
        price: 9.0,
        active: true,
        code: 'SB002',
      },
      {
        id: 'b001',
        name: 'Refrigerante Lata',
        category: 'Bebidas',
        byWeight: false,
        price: 8.0,
        active: true,
        code: 'BD001',
      },
      {
        id: 'b002',
        name: 'Suco Natural 300ml',
        category: 'Bebidas',
        byWeight: false,
        price: 8.0,
        active: true,
        code: 'BD002',
      },
      {
        id: 'b003',
        name: 'Água 500ml',
        category: 'Bebidas',
        byWeight: false,
        price: 5.0,
        active: true,
        code: 'BD003',
      },
      {
        id: 'g001',
        name: 'Self-service por Kg',
        category: 'Por Peso',
        byWeight: true,
        price: 0,
        pricePerKg: 69.9,
        active: true,
        code: 'KG001',
      },
      {
        id: 'g002',
        name: 'Churrasco por Kg',
        category: 'Por Peso',
        byWeight: true,
        price: 0,
        pricePerKg: 89.9,
        active: true,
        code: 'KG002',
      },
    ])
  })
}
