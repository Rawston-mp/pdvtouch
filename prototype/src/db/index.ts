import Dexie, { Table } from 'dexie'
import type { Order, OutboxEvent } from './models'

class PDVDB extends Dexie {
  orders!: Table<Order, string>
  outbox!: Table<OutboxEvent, string>

  constructor() {
    super('pdv_db')
    this.version(1).stores({
      orders: 'id, status, createdAt',
      outbox: 'id, type, createdAt, tries'
    })
  }
}

export const db = new PDVDB()
