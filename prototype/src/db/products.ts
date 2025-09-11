// src/db/products.ts
import { db } from './index'
import type { Product } from './models'

/** Lista todos os produtos do catálogo (ordenado por nome, sem exigir índice) */
export async function listProducts(): Promise<Product[]> {
  return db.products.toCollection().sortBy('name')
}

/** Busca por id */
export async function getProduct(id: number) {
  return db.products.get(id)
}

/** Procurar por code/ID/nome (para leitor) */
export async function findByCodeOrName(input: string): Promise<Product | null> {
  const x = (input || '').trim()
  if (!x) return null

  // 1) code exato (se existir o campo)
  const byCode = await db.products.where('code' as any).equalsIgnoreCase?.(x).first?.()
  if (byCode) return byCode as Product

  // 2) id
  const asId = Number(x)
  if (Number.isFinite(asId)) {
    const byId = await db.products.get(asId)
    if (byId) return byId
  }

  // 3) nome (exato) -> depois contém
  // sem índice, fazemos em memória
  const all = await db.products.toArray()
  const byNameEq = all.find(p => p.name?.toLowerCase() === x.toLowerCase())
  if (byNameEq) return byNameEq
  const like = all.find(p => p.name?.toLowerCase().includes(x.toLowerCase()))
  return like ?? null
}

/** Salva/atualiza um produto */
export async function saveProduct(p: Product) {
  if (p.id) await db.products.update(p.id, p)
  else await db.products.add(p)
}

/** Remove um produto */
export async function removeProduct(id: number) {
  await db.products.delete(id)
}

/** SEED: cria catálogo mínimo caso esteja vazio */
export async function ensureSeedProducts() {
  const count = await db.products.count()
  if (count > 0) return

  const seed: Product[] = [
    // Por Kg
    {
      name: 'Self-service por Kg',
      category: 'Por Peso',
      pricePerKg: 69.90,
      route: 'COZINHA',
      code: 'PLU100'
    },
    // Pratos
    { name: 'Prato Executivo', category: 'Pratos', price: 24.90, route: 'COZINHA', code: '7890000001001' },
    { name: 'Guarnição do Dia', category: 'Pratos', price: 12.00, route: 'COZINHA', code: '7890000001002' },
    // Bebidas
    { name: 'Refrigerante Lata', category: 'Bebidas', price: 8.00, route: 'BAR', code: '7891000000001' },
    { name: 'Água 500ml', category: 'Bebidas', price: 5.00, route: 'BAR', code: '7891000000002' },
    { name: 'Suco Natural 300ml', category: 'Bebidas', price: 8.00, route: 'BAR', code: '7891000000003' },
    // Sobremesas
    { name: 'Mousse', category: 'Sobremesas', price: 7.50, route: 'SOBREMESA', code: '7892000000001' },
    { name: 'Pudim', category: 'Sobremesas', price: 9.00, route: 'SOBREMESA', code: '7892000000002' }
  ]

  await db.products.bulkAdd(seed)
}
;(async () => { try { await ensureSeedProducts() } catch { /* noop */ } })()
