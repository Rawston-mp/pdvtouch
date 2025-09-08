// src/db/users.ts
import { db, hashPin, initDb } from './index'
import type { Role, User } from './models'

export async function listUsers() {
  await initDb()
  return db.users.toArray()
}

export async function createUser(name: string, role: Role, pin: string) {
  await initDb()
  return db.users.add({ name, role, pinHash: hashPin(pin) })
}

export async function updateUserPin(userId: number, newPin: string) {
  await initDb()
  const u = await db.users.get(userId)
  if (!u) throw new Error('Usuário não encontrado')
  u.pinHash = hashPin(newPin)
  await db.users.put(u)
}

export async function deleteUser(userId: number) {
  await initDb()
  await db.users.delete(userId)
}

export async function findByPin(pin: string): Promise<User | undefined> {
  await initDb()
  const pinHash = hashPin(pin)
  return db.users.filter(u => u.pinHash === pinHash).first()
}
