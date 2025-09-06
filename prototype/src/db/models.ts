// src/db/models.ts

// ---- Rotas de produção ----
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
  route?: Destination
}

// ---- Venda / Pedido ----
export type OrderItem = {
  id: string
  productId: number
  name: string
  qty: number
  unitPrice: number
  total: number
  isWeight: boolean
  route?: Destination
}

export type PaymentMethod = 'CASH' | 'TEF' | 'PIX' | 'VOUCHER'
export type Payment = {
  id: string
  method: PaymentMethod
  amount: number
  authCode?: string
  meta?: Record<string, any>
}

export type CustomerIdType = 'CPF' | 'CNPJ' | 'NONE'
export type ReceiptMode = 'NAO_FISCAL' | 'FISCAL_NFCE' | 'FISCAL_SAT'

export type Order = {
  id: string
  createdAt: number
  status: 'OPEN' | 'PAID' | 'CANCELED'
  items: OrderItem[]
  payments: Payment[]
  total: number
  notes?: string
  receiptMode?: ReceiptMode
  customerIdType?: CustomerIdType
  customerTaxId?: string | null
}

// ---- Outbox (sync mock) ----
export type OutboxEvent = {
  id: string
  type: 'ORDER_PAID' | 'ORDER_CANCELED' | 'SYNC_HEARTBEAT'
  payload: any
  createdAt: number
  tries: number
  lastError?: string
}

// ---- X/Z ----
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
  name: string
  destination: Destination
  profile: PrinterProfile
}

// ---- Turno (Caixa) ----
export type Shift = {
  id?: number
  openedAt: number
  closedAt?: number | null
  user?: string
  openingAmount: number
  closingAmount?: number | null
}

export type CashMovementType = 'SUPRIMENTO' | 'SANGRIA'
export type CashMovement = {
  id?: number
  shiftId: number
  createdAt: number
  type: CashMovementType
  amount: number           // >0
  note?: string

  // Cancelamento (auditoria)
  voidedAt?: number | null
  voidReason?: string | null
}
