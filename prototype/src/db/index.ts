// src/db/index.ts
import Dexie, { Table } from 'dexie'
import type {
  Order, OutboxEvent, Product, Counters, ZClosure,
  Settings, Printer, Shift, CashMovement
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

  constructor() {
    super('pdvtouch')
    // v1..v6 já existiam — aqui está apenas a versão mais recente com todas as stores
    this.version(7).stores({
      orders: 'id, createdAt, status',
      outbox: 'id, type, createdAt',
      products: '++id, category, active, route',
      counters: 'id',
      closures: '++id, createdAt, from, to',
      settings: 'id',
      printers: '++id, destination, profile',
      shifts: '++id, openedAt, closedAt',
      cashMovs: '++id, shiftId, createdAt, type'
    }).upgrade(async () => {
      // nada a migrar especificamente aqui
    })
  }
}

export const db = new PDVDB()

let inited = false
export async function initDb() {
  if (inited) return
  await db.open()
  // seed mínimo
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
      { name: 'Cozinha Chapa', destination: 'COZINHA', profile: 'ELGIN' },
      { name: 'Bar', destination: 'BAR', profile: 'ELGIN' }
    ])
  }
  inited = true
}
export async function resetDb() {
  await db.delete()
  window.location.reload()
}
