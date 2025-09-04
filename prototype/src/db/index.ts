// src/db/index.ts
import Dexie, { Table } from 'dexie'
import type { Order, OutboxEvent, Product } from './models'

class PDVDB extends Dexie {
  orders!: Table<Order, string>
  outbox!: Table<OutboxEvent, string>
  products!: Table<Product, number>

  constructor() {
    super('pdv_db')

    // v1
    this.version(1).stores({
      orders: 'id, status, createdAt',
      outbox: 'id, type, createdAt, tries'
    })

    // v2 (+products, com índice em active — DEPRECATED)
    this.version(2).stores({
      orders: 'id, status, createdAt',
      outbox: 'id, type, createdAt, tries',
      products: '++id, name, category, active'
    })

    // v3 (upgrade com seed)
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
          ] as Product[])
        }
      })

    // v4 (schema correto – remove índice em 'active')
    this.version(4).stores({
      orders: 'id, status, createdAt',
      outbox: 'id, type, createdAt, tries',
      products: '++id, name, category' // <- sem 'active'
    })
  }
}

export const db = new PDVDB()

/** Abre o DB (dispara migrações) */
export async function initDb() {
  if (!db.isOpen()) {
    await db.open()
  }
}

/** Fecha, apaga e reabre o DB – para recuperar de falhas de migração */
export async function resetDb() {
  try { if (db.isOpen()) db.close() } catch {}
  await db.delete()
  const fresh = new PDVDB()
  await fresh.open()
  ;(Object.assign(db, fresh) as any)
}
