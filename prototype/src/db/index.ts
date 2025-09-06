// src/db/index.ts
import Dexie, { Table } from 'dexie'
import type { Order, OutboxEvent, Product, Counters, ZClosure } from './models'

class PDVDB extends Dexie {
  orders!: Table<Order, string>
  outbox!: Table<OutboxEvent, string>
  products!: Table<Product, number>
  counters!: Table<Counters, string>
  closures!: Table<ZClosure, number>

  constructor() {
    super('pdv_db')

    // v1
    this.version(1).stores({
      orders: 'id, status, createdAt',
      outbox: 'id, type, createdAt, tries'
    })

    // v2 (+products)  (índice em active – deprecado)
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
            { name: 'Prato Executivo', category: 'Pratos',    price: 24.9, active: true },
            { name: 'Guarnição do Dia', category: 'Pratos',   price: 12.0, active: true },
            { name: 'Suco Natural 300ml', category: 'Bebidas', price: 8.0,  active: true },
            { name: 'Refrigerante Lata', category: 'Bebidas',  price: 6.5,  active: true },
            { name: 'Pudim', category: 'Sobremesas',           price: 9.0,  active: true },
            { name: 'Mousse', category: 'Sobremesas',          price: 7.5,  active: true },
            { name: 'Self-service por Kg', category: 'Por Peso', pricePerKg: 69.9, active: true },
            { name: 'Churrasco por Kg',   category: 'Por Peso', pricePerKg: 89.9, active: true }
          ])
        }
      })

    // v4 (remove índice booleano de products)
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
      counters: 'id',              // id fixo 'acc'
      closures: '++id, createdAt'  // histórico de Z
    }).upgrade(async tx => {
      const has = await tx.table('counters').get('acc')
      if (!has) {
        const d = new Date(); d.setHours(0,0,0,0)
        await tx.table('counters').add({ id: 'acc', zBaseline: +d } as Counters)
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
