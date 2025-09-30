// src/services/syncClient.ts
import { db, type Product } from '../db'

export type RemoteProduto = {
  id: string
  sku?: string
  descricao: string
  unidade: 'UN' | 'KG' | string
  preco: number
}

function mapToPDV(p: RemoteProduto) {
  const byWeight = String(p.unidade || '').toUpperCase() === 'KG'
  return {
    id: p.id,
    name: p.descricao,
    category: byWeight ? 'Por Peso' : 'Pratos',
    byWeight,
    price: byWeight ? 0 : Number(p.preco || 0),
    pricePerKg: byWeight ? Number(p.preco || 0) : 0,
    code: p.sku,
    active: true,
  }
}

export async function syncProdutosFromBackoffice(baseUrl: string) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/produtos.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha ao buscar produtos do Backoffice (${res.status})`)
  const data = await res.json()
  const items: RemoteProduto[] = Array.isArray(data?.items) ? data.items : []
  if (!items.length) return { inserted: 0, updated: 0 }
  const mapped: Product[] = items.map(mapToPDV) as unknown as Product[]
  // Mescla simples: substitui pelo id
  await db.products.bulkPut(mapped)
  return { inserted: mapped.length, updated: 0 }
}
