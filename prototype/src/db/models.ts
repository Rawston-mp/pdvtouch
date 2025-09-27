// src/db/models.ts

export type PaymentMethod = 'CASH' | 'PIX' | 'TEF'

export type ReceiptMode = 'NAO_FISCAL' | 'FISCAL_NFCE'
export type CustomerIdType = 'NONE' | 'CPF' | 'CNPJ'

export type UserRole = 'ADMIN' | 'GERENTE' | 'CAIXA' | 'BALANÇA A' | 'BALANÇA B' | 'ATENDENTE'

export type Category = 'Pratos' | 'Bebidas' | 'Sobremesas' | 'Por Peso'

export type PrintRoute = 'CAIXA' | 'COZINHA' | 'BAR'

export interface Product {
  id?: number
  name: string
  category: Category
  /** preço unitário (quando não é por kg) */
  price?: number | null
  /** preço por kg (quando é por peso) */
  pricePerKg?: number | null
  /** destino de impressão (cozinha/bar/…) */
  route?: PrintRoute
  /** NOVO: código de barras / PLU / SKU para leitor */
  code?: string | null
}

export interface OrderItem {
  id: string
  productId: number
  name: string
  qty: number
  unitPrice: number
  total: number
  isWeight: boolean
  route?: PrintRoute
}

export interface Payment {
  id: string
  method: PaymentMethod
  amount: number
  authCode?: string
}

export interface Order {
  id: string // COMANDA-XYZ
  createdAt: number
  status: 'OPEN' | 'PAID' | 'CANCELLED'
  items: OrderItem[]
  payments: Payment[]
  total: number
  receiptMode?: ReceiptMode
  customerIdType?: CustomerIdType
  customerTaxId?: string | null
}
