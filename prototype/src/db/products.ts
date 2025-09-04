// src/db/products.ts
import { db, initDb, resetDb } from './index'
import type { Product, Category } from './models'

export async function listProducts(activeOnly = true): Promise<Product[]> {
  try {
    await initDb()
    const all = await db.products.toArray()
    return activeOnly ? all.filter(p => p.active) : all
  } catch (e) {
    console.warn('[DB] listProducts falhou, resetando IndexedDB…', e)
    await resetDb()
    await ensureSeed()
    const all = await db.products.toArray()
    return activeOnly ? all.filter(p => p.active) : all
  }
}

export async function getProduct(id: number) {
  await initDb()
  return db.products.get(id)
}

export async function createProduct(p: Omit<Product, 'id'>) {
  await initDb()
  const id = await db.products.add({ ...p })
  return id
}

export async function updateProduct(id: number, p: Partial<Product>) {
  await initDb()
  await db.products.update(id, p)
}

export async function deleteProduct(id: number) {
  await initDb()
  await db.products.delete(id)
}

/** Seed manual (usado no primeiro load ou no botão ‘Carregar catálogo’) */
export async function ensureSeed() {
  await initDb()
  const count = await db.products.count()
  if (count > 0) return

  const seed: Omit<Product, 'id'>[] = [
    { name: 'Prato Executivo', category: 'Pratos',    price: 24.9, active: true },
    { name: 'Guarnição do Dia', category: 'Pratos',   price: 12.0, active: true },
    { name: 'Suco Natural 300ml', category: 'Bebidas', price: 8.0,  active: true },
    { name: 'Refrigerante Lata', category: 'Bebidas',  price: 6.5,  active: true },
    { name: 'Pudim', category: 'Sobremesas',           price: 9.0,  active: true },
    { name: 'Mousse', category: 'Sobremesas',          price: 7.5,  active: true },
    { name: 'Self-service por Kg', category: 'Por Peso', pricePerKg: 69.9, active: true },
    { name: 'Churrasco por Kg',   category: 'Por Peso', pricePerKg: 89.9, active: true }
  ]
  await db.products.bulkAdd(seed as Product[])
}

export const CATEGORIES: Category[] = ['Pratos', 'Bebidas', 'Sobremesas', 'Por Peso']
