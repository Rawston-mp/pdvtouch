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
  // Campos opcionais usados por impressões mock
  headerLines?: string[]
  footerLines?: string[]
  showPixOnFooter?: boolean
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

export type Sale = {
  id?: number
  orderId: number
  timestamp: number
  userId: string
  userName: string
  userRole: string
  items: Array<{
    id?: string
    productId?: string | number
    name: string
    qty: number
    unitPrice: number
    total: number
    isWeight?: boolean
  }>
  total: number
  payments: {
    cash: number
    pix: number
    tef: number
  }
  docType: 'NAO_FISCAL' | 'NFCE'
  fiscalId?: string
  status: 'COMPLETED' | 'CANCELLED'
}

export type ShiftSummary = {
  id?: number
  userId: string
  userName: string
  startTime: number
  endTime?: number
  totalSales: number
  totalAmount: number
  cashAmount: number
  pixAmount: number
  tefAmount: number
  salesCount: number
  status: 'OPEN' | 'CLOSED'
}

// Auditoria simples (usada em AdminAuditoria)
export type AuditLog = {
  id?: number
  ts: number
  userName?: string | null
  action: string
  details?: unknown
}

// Outbox genérica para eventos offline
export type OutboxEvent = {
  id?: number
  type: string
  payload: unknown
  createdAt: number
  tries: number
  lastError?: string
}

// Contadores e fechamento Z (mínimo para compilar)
export type Counters = {
  id: 'acc'
  zBaseline: number
}

export type ZClosure = {
  id?: number
  createdAt: number
  from: number
  to: number
  totals?: unknown
}

// DB
class PDVDB extends Dexie {
  settings!: Table<Settings, string>
  printers!: Table<Printer, string>
  products!: Table<Product, string>
  users!: Table<User, string>
  sales!: Table<Sale, number>
  shifts!: Table<ShiftSummary, number>
  audits!: Table<AuditLog, number>
  outbox!: Table<OutboxEvent, number>
  counters!: Table<Counters, string>
  closures!: Table<ZClosure, number>

  constructor() {
    super('pdvtouch-proto')
    // Versão original (5) mantida para histórico; nova versão 6 limpa produtos e deixa catálogo vazio.
    this.version(5).stores({
      settings: 'id',
      printers: 'id',
      products: 'id, code, category, byWeight',
      users: 'id, role, active',
      sales: '++id, orderId, timestamp, userId, status',
      shifts: '++id, userId, startTime, status',
      audits: '++id, ts',
      outbox: '++id, createdAt, type',
      counters: 'id',
      closures: '++id, createdAt',
    })
    this.version(6).stores({
      settings: 'id',
      printers: 'id',
      products: 'id, code, category, byWeight',
      users: 'id, role, active',
      sales: '++id, orderId, timestamp, userId, status',
      shifts: '++id, userId, startTime, status',
      audits: '++id, ts',
      outbox: '++id, createdAt, type',
      counters: 'id',
      closures: '++id, createdAt',
    }).upgrade(async (tx) => {
      try {
        // Limpa produtos existentes para que passem a ser gerenciados exclusivamente no AtendeTouch.
        await tx.table('products').clear()
        // Marca em localStorage (best effort) que ocorreu limpeza (evita dúvida em suporte).
        try { localStorage.setItem('pdv.migration.products.cleared', String(Date.now())) } catch (err) { void err }
      } catch (err) {
        console.warn('Falha ao limpar produtos na migração v6:', err)
      }
    })
    this.on('populate', async () => {
      await seedCore(this)
    })
  }
}
export const db = new PDVDB()

// Garante que o banco esteja aberto antes de operações de escrita/leitura críticas
export async function ensureDbOpen() {
  try {
    if (!db.isOpen()) {
      await db.open()
    }
  } catch (err: unknown) {
    // Repassa com mensagem mais clara
    const e = err as { name?: string }
    if (e?.name === 'UpgradeBlockedError') {
      throw new Error('Atualização do banco bloqueada. Feche outras abas/janelas do app e recarregue.')
    }
    throw err
  }
}

// Util: hash de PIN (SHA-256 → hex)
export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(pin)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Seeds
// Seed somente de dados essenciais (sem produtos). Produtos serão trazidos via sync do Backoffice.
async function seedCore(d: PDVDB) {
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

  // Products: nenhum seed → catálogo inicia vazio (será preenchido via Backoffice)
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

// Garantia suave: assegura que as balanças existam, estejam ativas e com PINs padrão
async function ensureBalancaUsers(d: PDVDB) {
  const targets: Array<{ name: string; role: Role; pin: string }> = [
    { name: 'Balança A', role: 'BALANÇA A', pin: '2222' },
    { name: 'Balança B', role: 'BALANÇA B', pin: '2233' },
  ]
  for (const t of targets) {
    const expectedHash = await hashPin(t.pin)
    // Busca por role (indexado)
  const u = await d.users.where('role').equals(t.role).first()
    if (!u) {
      // criar
      await d.users.put({
        id: crypto.randomUUID(),
        name: t.name,
        role: t.role,
        active: true,
        pinHash: expectedHash,
      })
      console.log(`✅ [initDb] Criado usuário padrão: ${t.name} (${t.pin})`)
    } else {
      // atualizar se necessário
      const patch: Partial<User> = {}
      if (u.name !== t.name) patch.name = t.name
      if (!u.active) patch.active = true
      if (u.pinHash !== expectedHash) patch.pinHash = expectedHash
      if (Object.keys(patch).length > 0) {
        await d.users.update(u.id, patch)
        console.log(`🔧 [initDb] Ajustado usuário ${u.name}: ${
          patch.pinHash ? 'PIN atualizado' : ''
        }${patch.active ? ' • reativado' : ''}${patch.name ? ' • nome ajustado' : ''}`)
      }
    }
  }
}

// Init idempotente
export async function initDb() {
  await db.open()

  // Verifica se já foi inicializado
  const cfg = await db.settings.get('cfg')
  const userCount = await db.users.count()

  if (!cfg) {
    console.log('🔄 Inicializando banco de dados (seed core sem produtos)...')
    await seedCore(db)
  } else if (userCount === 0) {
    console.log('🔄 Criando usuários padrão...')
    await seedUsers(db)
  }

  // Garante que as balanças A/B estejam utilizáveis com PINs conhecidos
  try {
    await ensureBalancaUsers(db)
  } catch (e) {
    console.warn('⚠️ Não foi possível assegurar usuários de Balança A/B:', e)
  }

  console.log(`✅ Banco inicializado. Usuários: ${await db.users.count()}`)

  // Salvaguarda: se ainda existirem produtos legados (seed antigo) e nenhum full sync foi feito, limpar agora.
  try {
    const lastFull = localStorage.getItem('pdv.sync.products.lastFull')
    const clearedFlag = localStorage.getItem('pdv.migration.products.cleared')
    const prodCount = await db.products.count()
    if (!lastFull && !clearedFlag && prodCount > 0) {
      // Examina alguns IDs para detectar padrão de seed antigo (p001, b001, s001, g001 ...)
      const sample = await db.products.limit(5).toArray()
      const seedLike = sample.length > 0 && sample.every(p => /^(p|b|s|g)\d{3}$/i.test(p.id))
      if (seedLike) {
        await db.products.clear()
        localStorage.setItem('pdv.migration.products.cleared', String(Date.now()))
        console.log('🧹 Catálogo legacy removido pós-migração (seed antigo).')
      }
    }
  } catch (e) {
    console.warn('Falha ao executar purga defensiva de produtos:', e)
  }
}
