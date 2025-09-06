// src/db/models.ts

// ---- Catálogo ----
export type Category = 'Pratos' | 'Bebidas' | 'Sobremesas' | 'Por Peso'

export type Product = {
  id?: number            // auto-increment
  name: string
  category: Category
  price?: number         // unitário
  pricePerKg?: number    // por peso
  active: boolean
}

// ---- Venda ----
export type OrderItem = {
  id: string
  productId: number
  name: string
  qty: number           // se por peso: kg (3 casas)
  unitPrice: number
  total: number
  isWeight: boolean
}

export type Payment = {
  id: string
  method: 'CASH' | 'TEF' | 'PIX' | 'VOUCHER'
  amount: number
  authCode?: string
  meta?: Record<string, any>
}

export type Order = {
  id: string
  createdAt: number
  status: 'OPEN' | 'PAID' | 'CANCELED'
  items: OrderItem[]
  payments: Payment[]
  total: number
  notes?: string
}

// ---- Outbox ----
export type OutboxEvent = {
  id: string
  type: 'ORDER_PAID' | 'ORDER_CANCELED' | 'SYNC_HEARTBEAT'
  payload: any
  createdAt: number
  tries: number
  lastError?: string
}

// ---- Fechamento X/Z ----
export type Counters = { id: 'acc'; zBaseline: number } // baseline do último Z (timestamp)
export type ZClosure = {
  id?: number
  createdAt: number
  from: number
  to: number
  totals: {
    count: number
    gross: number
    byMethod: Record<string, number>
  }
}
