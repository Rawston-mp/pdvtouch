// src/db/index.ts
import Dexie, { Table } from 'dexie'
import type {
  Order, OutboxEvent, Product, Counters, ZClosure,
  Settings, Printer, Shift, CashMovement, User
} from './models'

export class PDVDB extends Dexie {
  orders!: Table<Order, string>
  outbox!: Table<OutboxEvent, string>
  products!: Table<Product, number>
  counters!: Table<Counters, string>
  closures!: Table<ZClosure, number>
  settings!: Table<Settings, string>
  printers!: Table<Printer, number>
  shifts!: Table<Shift, number>
  cashMovs!: Table<CashMovement, number>
  users!: Table<User, number>

  constructor() {
    super('pdvtouch')
    this.version(8).stores({
      orders: 'id, createdAt, status',
      outbox: 'id, type, createdAt',
      products: '++id, category, active, route',
      counters: 'id',
      closures: '++id, createdAt, from, to',
      settings: 'id',
      printers: '++id, destination, profile',
      shifts: '++id, openedAt, closedAt',
      cashMovs: '++id, shiftId, createdAt, type',
      users: '++id, role, name'
    })
  }
}

export const db = new PDVDB()

let inited = false
export async function initDb() {
  if (inited) return
  await db.open()

  // Seed mínimo
  const cfg = await db.settings.get('cfg')
  if (!cfg) {
    await db.settings.put({
      id: 'cfg',
      companyName: 'PDVTouch Restaurante',
      cnpj: '00.000.000/0000-00',
      addressLine1: 'Rua Exemplo, 123 - Centro',
      addressLine2: 'Cidade/UF'
    })
  }
  const printers = await db.printers.toArray()
  if (printers.length === 0) {
    await db.printers.bulkAdd([
      { name: 'Caixa Principal', destination: 'CAIXA', profile: 'ELGIN' },
      { name: 'Cozinha', destination: 'COZINHA', profile: 'ELGIN' },
      { name: 'Bar', destination: 'BAR', profile: 'ELGIN' }
    ])
  }
  const users = await db.users.toArray()
  if (users.length === 0) {
    await db.users.bulkAdd([
      { name: 'Administrador', role: 'ADMIN',  pinHash: hashPin('9999') },
      { name: 'Gerente',       role: 'GERENTE', pinHash: hashPin('1234') },
      { name: 'Caixa',         role: 'CAIXA',   pinHash: hashPin('0000') },
    ])
  }
  inited = true
}

export function hashPin(pin: string) {
  // hash dev (não criptográfico). Em produção use PBKDF2/Argon2 com salt.
  const s = 'pdv-salt'
  let h = 0
  const t = (pin + s)
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0
  return String(h)
}

export async function resetDb() {
  await db.delete()
  window.location.reload()
}
