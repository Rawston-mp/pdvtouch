// src/db/users.ts
import { db } from './index'
import type { DbUser } from './index'
import type { UserRole } from './models'

export async function createUser(name: string, role: UserRole, pin: string, active = true) {
  const user: DbUser = { name, role, pin, active }
  const id = await db.users.add(user)
  return { ...user, id }
}

export async function listUsers(): Promise<DbUser[]> {
  return db.users.toArray()
}

export async function updateUserPin(id: number, newPin: string) {
  await db.users.update(id, { pin: newPin })
}

export async function deleteUser(id: number) {
  await db.users.delete(id)
}

export async function findByPin(pin: string): Promise<DbUser | null> {
  const u = await db.users.where('pin').equals(pin).first()
  if (!u || u.active === false) return null
  return u
}

export async function ensureSeedUsers() {
  const count = await db.users.count()
  if (count > 0) return
  const seed: DbUser[] = [
    { name: 'Administrador', role: 'ADMIN', pin: '1111', active: true },
    { name: 'Balança',       role: 'BALANÇA', pin: '2222', active: true },
    { name: 'Gerente',       role: 'GERENTE', pin: '3333', active: true },
    { name: 'Caixa',         role: 'CAIXA',   pin: '4444', active: true },
    { name: 'Atendente',     role: 'ATENDENTE', pin: '5555', active: true },
  ]
  await db.users.bulkAdd(seed)
}
