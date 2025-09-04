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

export type OutboxEvent = {
  id: string           // uuid
  type: 'ORDER_PAID' | 'ORDER_CANCELED' | 'SYNC_HEARTBEAT'
  payload: any
  createdAt: number
  tries: number
  lastError?: string
}
