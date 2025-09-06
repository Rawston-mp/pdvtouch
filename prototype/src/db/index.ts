// src/db/index.ts
import Dexie, { Table } from 'dexie'
import type {
  Order, OutboxEvent, Product,
  Counters, ZClosure, Settings, Printer
} from './models'

class PDVDB extends Dexie {
  orders!: Table<Order, string>
  outbox!: Table<OutboxEvent, string>
  products!: Table<Product, number>
  counters!: Table<Counters, string>
  closures!: Table<ZClosure, number>
  settings!: Table<Settings, string>
  printers!: Table<Printer, number>

  constructor() {
    super('pdv_db')

    // v1
    this.version(1).stores({
      orders: 'id, status, createdAt',
      outbox: 'id, type, createdAt, tries'
    })

    // v2 (+products) [legacy]
    this.version(2).stores({
      orders: 'id, status, createdAt',
      outbox: 'id, type, createdAt, tries',
      products: '++id, name, category, active'
    })

    // v3 (seed inicial)
    this.version(3)
      .stores({
        orders: 'id, status, createdAt',
        outbox: 'id, type, createdAt, tries',
        products: '++id, name, category, active'
      })
      .upgrade(async tx => {
        const cnt = await tx.table('products').count()
        if (cnt === 0) {
          await tx.table('products').bulkAdd([
            { name: 'Prato Executivo', category: 'Pratos',    price: 24.9, active: true, route: 'COZINHA' },
            { name: 'Guarnição do Dia', category: 'Pratos',   price: 12.0, active: true, route: 'COZINHA' },
            { name: 'Suco Natural 300ml', category: 'Bebidas', price: 8.0,  active: true, route: 'BAR' },
            { name: 'Refrigerante Lata', category: 'Bebidas',  price: 6.5,  active: true, route: 'BAR' },
            { name: 'Pudim', category: 'Sobremesas',           price: 9.0,  active: true, route: 'BAR' },
            { name: 'Mousse', category: 'Sobremesas',          price: 7.5,  active: true, route: 'BAR' },
            { name: 'Self-service por Kg', category: 'Por Peso', pricePerKg: 69.9, active: true, route: 'COZINHA' },
            { name: 'Churrasco por Kg',   category: 'Por Peso', pricePerKg: 89.9, active: true, route: 'COZINHA' }
          ] as Product[])
        }
      })

    // v4 (remove índice booleano)
    this.version(4).stores({
      orders: 'id, status, createdAt',
      outbox: 'id, type, createdAt, tries',
      products: '++id, name, category'
    })

    // v5 (+counters, +closures)
    this.version(5).stores({
      orders: 'id, status, createdAt',
      outbox: 'id, type, createdAt, tries',
      products: '++id, name, category',
      counters: 'id',
      closures: '++id, createdAt'
    }).upgrade(async tx => {
      const has = await tx.table('counters').get('acc')
      if (!has) {
        const d = new Date(); d.setHours(0,0,0,0)
        await tx.table('counters').add({ id: 'acc', zBaseline: +d } as Counters)
      }
    })

    // v6 (+settings, +printers)
    this.version(6).stores({
      orders: 'id, status, createdAt',
      outbox: 'id, type, createdAt, tries',
      products: '++id, name, category',
      counters: 'id',
      closures: '++id, createdAt',
      settings: 'id',                 // id fixo 'cfg'
      printers: '++id, destination'   // simples
    }).upgrade(async tx => {
      const s = await tx.table('settings').get('cfg')
      if (!s) {
        await tx.table('settings').add({
          id: 'cfg',
          companyName: 'PDVTouch Restaurante',
          cnpj: '00.000.000/0000-00',
          addressLine1: 'Rua Exemplo, 123 - Centro',
          addressLine2: 'Cidade/UF'
        } as Settings)
      }
      const hasPrinters = await tx.table('printers').count()
      if (!hasPrinters) {
        await tx.table('printers').bulkAdd([
          { name: 'Caixa',   destination: 'CAIXA',   profile: 'GENERIC' },
          { name: 'Cozinha', destination: 'COZINHA', profile: 'GENERIC' },
          { name: 'Bar',     destination: 'BAR',     profile: 'GENERIC' }
        ] as Printer[])
      }
    })
  }
}

export const db = new PDVDB()

export async function initDb() {
  if (!db.isOpen()) await db.open()
}

export async function resetDb() {
  try { if (db.isOpen()) db.close() } catch {}
  await db.delete()
  const fresh = new PDVDB()
  await fresh.open()
  ;(Object.assign(db, fresh) as any)
}
