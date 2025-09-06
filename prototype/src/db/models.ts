// src/db/models.ts

// ---- Destinos / Rotas ----
export type Destination = 'CAIXA' | 'COZINHA' | 'BAR'

// ---- Catálogo ----
export type Category = 'Pratos' | 'Bebidas' | 'Sobremesas' | 'Por Peso'

export type Product = {
  id?: number
  name: string
  category: Category
  price?: number
  pricePerKg?: number
  active: boolean
  route?: Destination        // <- destino padrão do item
}

// ---- Venda ----
export type OrderItem = {
  id: string
  productId: number
  name: string
  qty: number
  unitPrice: number
  total: number
  isWeight: boolean
  route?: Destination        // <- resolvido na venda a partir do produto
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
export type Counters = { id: 'acc'; zBaseline: number }
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

// ---- Configurações / Impressoras ----
export type Settings = {
  id: 'cfg'
  companyName: string
  cnpj: string
  addressLine1?: string
  addressLine2?: string
}

export type PrinterProfile = 'GENERIC' | 'ELGIN' | 'BEMATECH'

export type Printer = {
  id?: number
  name: string               // ex.: "Caixa"
  destination: Destination   // CAIXA | COZINHA | BAR
  profile: PrinterProfile
  // (futuro: host/ip/serial/baud etc.)
}
