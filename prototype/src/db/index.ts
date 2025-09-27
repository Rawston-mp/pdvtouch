// src/db/index.ts
import Dexie, { Table } from 'dexie'

// Tipos base
export type Destination = 'CLIENTE' | 'COZINHA' | 'BAR'
export type PrinterProfile = 'ELGIN' | 'BEMATECH' | 'GENERICA'

export type Settings = {
  id: 'cfg'
  companyName: string
  cnpj: string
  addressLine1: string
  addressLine2: string
}

export type Printer = {
  id: string
  name: string
  destination: Destination
  profile: PrinterProfile
}

export type Product = {
  id: string
  name: string
  category: 'Pratos' | 'Bebidas' | 'Sobremesas' | 'Por Peso'
  byWeight: boolean
  price: number
  pricePerKg?: number
  code?: string
  active: boolean
}

export type Role = 'ADMIN' | 'BALANÇA A' | 'BALANÇA B' | 'GERENTE' | 'CAIXA' | 'ATENDENTE'

export type User = {
  id: string
  name: string
  role: Role
  pinHash: string
  active: boolean
}

// DB
class PDVDB extends Dexie {
  settings!: Table<Settings, string>
  printers!: Table<Printer, string>
  products!: Table<Product, string>
  users!: Table<User, string>

  constructor() {
    super('pdvtouch-proto')
    this.version(3).stores({
      settings: 'id',
      printers: 'id',
      products: 'id, code, category, byWeight',
      users: 'id, role, active',
    })
    this.on('populate', async () => {
      await seedAll(this)
    })
  }
}
export const db = new PDVDB()

// Util: hash de PIN (SHA-256 → hex)
export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(pin)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Seeds
async function seedAll(d: PDVDB) {
  // Settings
  await d.settings.put({
    id: 'cfg',
    companyName: 'PDVTouch Restaurante',
    cnpj: '00.000.000/0000-00',
    addressLine1: 'Rua Exemplo, 123 - Centro',
    addressLine2: 'Cidade/UF',
  })

  // Printers
  await d.printers.bulkPut([
    { id: 'fiscal01', name: 'Impressora Fiscal/Cliente', destination: 'CLIENTE', profile: 'ELGIN' },
    { id: 'cozinha01', name: 'Cozinha 01', destination: 'COZINHA', profile: 'ELGIN' },
    { id: 'bar01', name: 'Bar 01', destination: 'BAR', profile: 'ELGIN' },
  ])

  // Products
  await d.products.bulkPut([
    {
      id: 'p001',
      name: 'Prato Executivo',
      category: 'Pratos',
      byWeight: false,
      price: 24.9,
      active: true,
      code: 'PR001',
    },
    {
      id: 'p002',
      name: 'Guarnição do Dia',
      category: 'Pratos',
      byWeight: false,
      price: 12.0,
      active: true,
      code: 'PR002',
    },
    {
      id: 's001',
      name: 'Mousse',
      category: 'Sobremesas',
      byWeight: false,
      price: 7.5,
      active: true,
      code: 'SB001',
    },
    {
      id: 's002',
      name: 'Pudim',
      category: 'Sobremesas',
      byWeight: false,
      price: 9.0,
      active: true,
      code: 'SB002',
    },
    {
      id: 'b001',
      name: 'Refrigerante Lata',
      category: 'Bebidas',
      byWeight: false,
      price: 8.0,
      active: true,
      code: 'BD001',
    },
    {
      id: 'b002',
      name: 'Suco Natural 300ml',
      category: 'Bebidas',
      byWeight: false,
      price: 8.0,
      active: true,
      code: 'BD002',
    },
    {
      id: 'b003',
      name: 'Água 500ml',
      category: 'Bebidas',
      byWeight: false,
      price: 5.0,
      active: true,
      code: 'BD003',
    },
    {
      id: 'g001',
      name: 'Self-service por Kg',
      category: 'Por Peso',
      byWeight: true,
      price: 0,
      pricePerKg: 69.9,
      active: true,
      code: 'KG001',
    },
    {
      id: 'g002',
      name: 'Churrasco por Kg',
      category: 'Por Peso',
      byWeight: true,
      price: 0,
      pricePerKg: 89.9,
      active: true,
      code: 'KG002',
    },
  ])

  // Users serão criados separadamente pelo initDb
}

async function seedUsers(d: PDVDB) {
  const users: Array<{ name: string; role: Role; pin: string }> = [
    { name: 'Admin', role: 'ADMIN', pin: '1111' },
    { name: 'Balança A', role: 'BALANÇA A', pin: '2222' },
    { name: 'Balança B', role: 'BALANÇA B', pin: '2233' },
    { name: 'Gerente', role: 'GERENTE', pin: '3333' },
    { name: 'Caixa', role: 'CAIXA', pin: '4444' },
    { name: 'Atendente', role: 'ATENDENTE', pin: '5555' },
  ]
  await d.users.bulkPut(
    await Promise.all(
      users.map(async (u, i) => ({
        id: `u${i + 1}`,
        name: u.name,
        role: u.role,
        active: true,
        pinHash: await hashPin(u.pin),
      })),
    ),
  )
}

// Init idempotente
export async function initDb() {
  await db.open()

  // Verifica se já foi inicializado
  const cfg = await db.settings.get('cfg')
  const userCount = await db.users.count()

  if (!cfg) {
    console.log('🔄 Inicializando banco de dados pela primeira vez...')
    await seedAll(db)
  } else if (userCount === 0) {
    console.log('🔄 Criando usuários padrão...')
    await seedUsers(db)
  }

  console.log(`✅ Banco inicializado. Usuários: ${await db.users.count()}`)
}
