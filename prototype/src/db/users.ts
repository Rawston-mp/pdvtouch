// src/db/users.ts
import { db, hashPin, type Role, type User } from './index'

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
  console.log(`🔍 [DEBUG] Buscando usuário com PIN: "${pin}"`)

  try {
    const h = await hashPin(pin)
    console.log(`🔐 [DEBUG] Hash gerado para "${pin}": ${h}`)

    const all = await db.users.toArray()
    console.log(`👥 [DEBUG] Total de usuários no banco: ${all.length}`)

    if (all.length === 0) {
      console.warn('⚠️ [DEBUG] Nenhum usuário encontrado no banco!')
      return undefined
    }

    all.forEach((u, index) => {
      const hashMatch = u.pinHash === h
      console.log(`   [${index + 1}] ${u.name} (${u.role}):`)
      console.log(`       Ativo: ${u.active}`)
      console.log(`       Hash armazenado: ${u.pinHash}`)
      console.log(`       Hash calculado: ${h}`)
      console.log(`       Hashes coincidem: ${hashMatch}`)
      console.log(`       Resultado: ${u.active && hashMatch ? '✅ MATCH' : '❌ NO MATCH'}`)
    })

    const found = all.find((u) => u.active && u.pinHash === h)
    console.log(`🎯 [DEBUG] Usuário encontrado: ${found ? `✅ ${found.name}` : '❌ nenhum'}`)

    return found
  } catch (error) {
    console.error('❌ [DEBUG] Erro na busca por PIN:', error)
    return undefined
  }
}
