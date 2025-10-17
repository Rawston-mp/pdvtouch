// src/db/users.ts
import { db, hashPin, hashPinBoth, ensureDbOpen, type Role, type User } from './index'

const DBG = import.meta.env.DEV && !!import.meta.env.VITE_DEBUG_SESSION && !import.meta.env.VITE_SILENT_SESSION_LOGS

// Cache simples em memória para acelerar lookup por PIN sem índice.
// Invalida em qualquer alteração na store de usuários.
let pinCache: Map<string, User> | null = null

async function ensureCache() {
  if (pinCache) return
  pinCache = new Map<string, User>()
  // Carrega apenas usuários ativos
  const activeUsers = await db.users.filter((u) => u.active).toArray()
  for (const u of activeUsers) {
    if (u.pinHash) pinCache.set(u.pinHash, u)
  }
  if (DBG) console.log(`👤 Cache de PIN carregado: ${activeUsers.length} usuários ativos`)
}

// Invalida cache em qualquer mutação relevante
db.users.hook('creating', () => {
  pinCache = null
})
db.users.hook('updating', () => {
  pinCache = null
})
db.users.hook('deleting', () => {
  pinCache = null
})

export async function listUsers(): Promise<User[]> {
  return db.users.toArray()
}

export async function createUser(u: { name: string; role: Role; pin: string; active?: boolean }) {
  const pinHash = await hashPin(u.pin)
  const user: User = {
    id: crypto.randomUUID(),
    name: u.name,
    role: u.role,
    pinHash,
    active: u.active ?? true,
  }
  await db.users.put(user)
  return user
}

export async function updateUserPin(id: string, pin: string) {
  const pinHash = await hashPin(pin)
  await db.users.update(id, { pinHash })
}

export async function setUserActive(id: string, active: boolean) {
  await db.users.update(id, { active })
}

export async function deleteUser(id: string) {
  await db.users.delete(id)
}

export async function findByPin(pin: string): Promise<User | undefined> {
  try {
    await ensureDbOpen()
    const { sha256, fallback } = await hashPinBoth(pin)
    // Primeiro tenta via cache em memória (rápido e sem depender de índice)
    await ensureCache()
    const c1 = sha256 ? pinCache?.get(sha256) : undefined
    const c2 = pinCache?.get(fallback)
    const cached = c1 ?? c2
    if (cached && cached.active) { if (DBG) console.log('🔎 Login via cache de PIN: HIT'); return cached }
    // Fallback: filtra na store por active e compara hash (compatível sem índice)
    const match = await db.users.filter((u) => u.active && (u.pinHash === sha256 || u.pinHash === fallback)).first()
    // Atualiza cache para próximas consultas
    if (match) {
      if (sha256) pinCache?.set(sha256, match)
      pinCache?.set(fallback, match)
      if (DBG) console.log('🔎 Login via varredura: MATCH encontrado')
    }
    else {
      if (DBG) {
        const total = await db.users.count()
        const some = await db.users.limit(5).toArray()
        console.log(`🔎 Login via varredura: nenhum usuário com este PIN. users=${total}`, some.map(u => ({id: u.id, name: u.name, role: u.role, active: u.active, pinHash: u.pinHash?.slice(0,6)+'…'})))
      }
    }
    return match || undefined
  } catch (error) {
    console.error('Erro na busca por PIN:', error)
    return undefined
  }
}
