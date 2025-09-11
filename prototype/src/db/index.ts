// src/db/index.ts
import Dexie, { Table } from 'dexie'

// Tipos usados nas tabelas (ajusta se seu models.ts tiver nomes diferentes)
import type {
  Product,
  Order,
  Settings,
  Printer,
  Destination,
  PrinterProfile,
} from './models'
import type { UserRole } from './models'

/* ===== Tipos auxiliares internos ===== */

export type DbUser = {
  id?: number
  name: string
  role: UserRole
  pin: string
  active?: boolean
}

export type DbShift = {
  id?: number
  openedAt: number
  closedAt?: number | null
  operatorName: string
  openingAmount?: number
  closingAmount?: number | null
}

export type DbAudit = {
  id?: number
  ts: number
  type: string
  message?: string
  userName?: string
}

export type DbCounter = {
  name: string
  value: number
}

export type DbOutbox = {
  id: string
  kind: 'ORDER' | 'PRINT' | 'SAT' | 'NFCE' | 'TEF' | 'PIX' | string
  state: 'PENDING' | 'SENT' | 'ERROR'
  payload: any
  createdAt: number
  lastAttemptAt?: number
  attempts?: number
}

/* ===== Banco ===== */

class PDVDatabase extends Dexie {
  // Tabelas (tipadas)
  products!: Table<Product, number>
  users!: Table<DbUser, number>
  orders!: Table<Order, string>
  outbox!: Table<DbOutbox, string>
  shifts!: Table<DbShift, number>
  audits!: Table<DbAudit, number>
  counters!: Table<DbCounter, string>

  // Config / Impressão
  settings!: Table<Settings, string> // id fixo 'cfg'
  printers!: Table<Printer, number>
  profiles!: Table<PrinterProfile, number>
  destinations!: Table<Destination, number>

  constructor() {
    super('pdvtouch')

    /**
     * v1 — estrutura básica
     */
    this.version(1).stores({
      products: '++id',
      users: '++id,pin,role,active',
      orders: 'id,status,createdAt',
      outbox: 'id,kind,state,createdAt',
      shifts: '++id,openedAt,closedAt',
      audits: '++id,ts,type',
      counters: 'name',
      // as stores abaixo ainda não existiam
    })

    /**
     * v2 — índice por name em products
     */
    this.version(2).stores({
      products: '++id,name',
    })

    /**
     * v3 — índices para leitor/filtros em products
     */
    this.version(3).stores({
      products: '++id,name,code,category',
    })

    /**
     * v4 — adiciona stores de configuração e impressão
     */
    this.version(4).stores({
      // chave única 'cfg'
      settings: 'id',
      // impressoras e perfis
      printers: '++id,name,destination',
      profiles: '++id,name',
      destinations: '++id,code,name',
    })

    // Mapeamento de tabelas
    this.products = this.table('products')
    this.users = this.table('users')
    this.orders = this.table('orders')
    this.outbox = this.table('outbox')
    this.shifts = this.table('shifts')
    this.audits = this.table('audits')
    this.counters = this.table('counters')

    this.settings = this.table('settings')
    this.printers = this.table('printers')
    this.profiles = this.table('profiles')
    this.destinations = this.table('destinations')
  }
}

export const db = new PDVDatabase()

/**
 * Alguns módulos antigos podem importar initDb(). Mantemos por compatibilidade.
 * Aqui só garantimos que o DB está aberto.
 */
export async function initDb() {
  if (!db.isOpen()) {
    await db.open()
  }
  return db
}

/**
 * (Dev) Apaga todo o DB e reabre — útil para reset de schema em desenvolvimento
 */
export async function resetDbHard() {
  await db.delete()
  await db.open()
}
