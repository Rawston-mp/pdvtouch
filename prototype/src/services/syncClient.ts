// src/services/syncClient.ts
import { db, type Product, type User } from '../db'

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

// ==== USUÁRIOS (FULL SYNC) ====
export type RemoteUsuario = {
  id: string
  nome: string
  perfil: string
  pinHash: string // hash já calculado no Backoffice
  ativo?: boolean
}

function mapUser(u: RemoteUsuario): User {
  // Map simplista de perfil remoto → Role local
  const roleMap: Record<string, User['role']> = {
    ADMIN: 'ADMIN', GERENTE: 'GERENTE', CAIXA: 'CAIXA', ATENDENTE: 'ATENDENTE', 'BALANCA A': 'BALANÇA A', 'BALANCA B': 'BALANÇA B',
  }
  const key = u.perfil?.toUpperCase?.() || ''
  const role = roleMap[key] || 'ATENDENTE'
  return {
    id: u.id,
    name: u.nome,
    role,
    pinHash: u.pinHash,
    active: u.ativo !== false,
  }
}

export async function syncUsuariosFromBackoffice(baseUrl: string) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/usuarios.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha ao buscar usuários do Backoffice (${res.status})`)
  const data = await res.json()
  const items: RemoteUsuario[] = Array.isArray(data?.items) ? data.items : []
  if (!items.length) return { inserted: 0, updated: 0 }
  const mapped: User[] = items.map(mapUser)
  await db.users.bulkPut(mapped)
  return { inserted: mapped.length, updated: 0 }
}

// ==== PRODUTOS DELTA (BÁSICO) ====
export async function deltaSyncProdutos(baseUrl: string) {
  const since = Number(localStorage.getItem('pdv.sync.products.lastDelta') || '0')
  const base = baseUrl.replace(/\/$/, '')
  const deltaUrl = `${base}/api/produtos.delta?since=${since}`
  const res = await fetch(deltaUrl)
  if (res.status === 404) {
    // Sem endpoint delta → faz full e marca tempos
    const full = await syncProdutosFromBackoffice(base)
    const now = Date.now()
    localStorage.setItem('pdv.sync.products.lastFull', String(now))
    localStorage.setItem('pdv.sync.products.lastDelta', String(now))
    return { mode: 'full', ...full }
  }
  if (!res.ok) throw new Error(`Falha delta produtos (${res.status})`)
  const payload = await res.json()
  const changed: RemoteProduto[] = Array.isArray(payload?.products) ? payload.products : []
  const removed: string[] = Array.isArray(payload?.removed) ? payload.removed : []
  if (changed.length) {
    const mapped: Product[] = changed.map(mapToPDV) as unknown as Product[]
    await db.products.bulkPut(mapped)
  }
  if (removed.length) {
    // Estratégia: soft delete (marcar active=false)
    for (const id of removed) {
      await db.products.update(id, { active: false })
    }
  }
  const current = Number(payload?.current || Date.now())
  localStorage.setItem('pdv.sync.products.lastDelta', String(current))
  return { mode: 'delta', changed: changed.length, removed: removed.length }
}
