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
  try {
    const h = await hashPin(pin)
    const all = await db.users.toArray()
    
    if (all.length === 0) {
      return undefined
    }

    const found = all.find((u) => u.active && u.pinHash === h)
    return found
  } catch (error) {
    console.error('Erro na busca por PIN:', error)
    return undefined
  }
}
