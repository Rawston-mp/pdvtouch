// src/db/sales.ts
import { db, ensureDbOpen, type Sale, type ShiftSummary } from './index'
import { listDraftOrders, removeCartDraft, clearCurrentOrderId } from '../lib/cartStorage'
import type { CartItem } from '../lib/cartStorage'

// Funções para gerenciar vendas
export async function addSale(sale: Omit<Sale, 'id'>): Promise<number> {
  await ensureDbOpen()
  try {
    return await db.sales.add(sale)
  } catch (err: any) {
    // Erros comuns do IndexedDB/Dexie
    if (err?.name === 'ConstraintError') {
      throw new Error('Falha ao salvar venda: violação de chave/índice. Tente novamente.')
    }
    if (err?.name === 'QuotaExceededError') {
      throw new Error('Espaço de armazenamento esgotado no navegador. Limpe dados antigos em Configurações > Limpar dados locais.')
    }
    if (err?.name === 'InvalidStateError') {
      throw new Error('Banco de dados não está pronto. Recarregue a página e tente novamente.')
    }
    throw err
  }
}

export async function listSales(startDate?: Date, endDate?: Date): Promise<Sale[]> {
  let query = db.sales.orderBy('timestamp').reverse()
  
  if (startDate && endDate) {
    query = query.filter((sale: Sale) => 
      sale.timestamp >= startDate.getTime() && 
      sale.timestamp <= endDate.getTime()
    )
  }
  
  return await query.toArray()
}

export async function getSalesToday(): Promise<Sale[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  return await listSales(today, tomorrow)
}

export async function getSalesReport(startDate: Date, endDate: Date) {
  const sales = await listSales(startDate, endDate)
  
  const summary = {
    totalSales: sales.length,
    totalAmount: sales.reduce((sum, sale) => sum + sale.total, 0),
    cashAmount: sales.reduce((sum, sale) => sum + sale.payments.cash, 0),
    pixAmount: sales.reduce((sum, sale) => sum + sale.payments.pix, 0),
    tefAmount: sales.reduce((sum, sale) => sum + sale.payments.tef, 0),
    averageTicket: 0,
    salesByUser: {} as Record<string, { count: number; amount: number }>,
    salesByHour: {} as Record<string, number>,
  }
  
  summary.averageTicket = summary.totalSales > 0 ? summary.totalAmount / summary.totalSales : 0
  
  // Vendas por usuário
  sales.forEach(sale => {
    if (!summary.salesByUser[sale.userName]) {
      summary.salesByUser[sale.userName] = { count: 0, amount: 0 }
    }
    summary.salesByUser[sale.userName].count++
    summary.salesByUser[sale.userName].amount += sale.total
  })
  
  // Vendas por hora
  sales.forEach(sale => {
    const hour = new Date(sale.timestamp).getHours().toString().padStart(2, '0')
    summary.salesByHour[hour] = (summary.salesByHour[hour] || 0) + 1
  })
  
  return { sales, summary }
}

// Funções para gerenciar turnos
export async function openShift(userId: string, userName: string): Promise<number> {
  // Fechar turno anterior se existir
  await closeCurrentShift(userId)
  
  const shift: Omit<ShiftSummary, 'id'> = {
    userId,
    userName,
    startTime: Date.now(),
    totalSales: 0,
    totalAmount: 0,
    cashAmount: 0,
    pixAmount: 0,
    tefAmount: 0,
    salesCount: 0,
    status: 'OPEN'
  }
  
  return await db.shifts.add(shift)
}

export async function getCurrentShift(userId: string): Promise<ShiftSummary | null> {
  return await db.shifts
    .where('userId')
    .equals(userId)
    .and((shift: ShiftSummary) => shift.status === 'OPEN')
    .first() || null
}

export async function closeCurrentShift(userId: string): Promise<void> {
  const currentShift = await getCurrentShift(userId)
  if (!currentShift) return
  
  // Calcular totais do turno
  const shiftSales = await db.sales
    .where('timestamp')
    .between(currentShift.startTime, Date.now())
    .and((sale: Sale) => sale.userId === userId)
    .toArray()
  
  const totals = shiftSales.reduce((acc: any, sale: Sale) => ({
    totalAmount: acc.totalAmount + sale.total,
    cashAmount: acc.cashAmount + sale.payments.cash,
    pixAmount: acc.pixAmount + sale.payments.pix,
    tefAmount: acc.tefAmount + sale.payments.tef,
    salesCount: acc.salesCount + 1
  }), {
    totalAmount: 0,
    cashAmount: 0,
    pixAmount: 0,
    tefAmount: 0,
    salesCount: 0
  })
  
  await db.shifts.update(currentShift.id!, {
    endTime: Date.now(),
    status: 'CLOSED',
    ...totals
  })
}

export async function getShiftReport(userId: string, date?: Date): Promise<ShiftSummary[]> {
  let query = db.shifts.where('userId').equals(userId)
  
  if (date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    
    query = query.and((shift: ShiftSummary) => 
      shift.startTime >= startOfDay.getTime() && 
      shift.startTime <= endOfDay.getTime()
    )
  }
  
  return await query.reverse().toArray()
}

// Reset geral: limpa comandas (rascunhos), vendas e turnos
export async function resetAllData(): Promise<{ removedDrafts: number; clearedSales: boolean; clearedShifts: boolean }> {
  // Limpa rascunhos de comandas no localStorage
  const drafts = listDraftOrders()
  for (const id of drafts) {
    try { removeCartDraft(id) } catch {}
  }
  try { clearCurrentOrderId() } catch {}

  // Limpa tabelas de vendas e turnos no IndexedDB
  await db.transaction('rw', db.sales, db.shifts, async () => {
    await db.sales.clear()
    await db.shifts.clear()
  })

  return {
    removedDrafts: drafts.length,
    clearedSales: true,
    clearedShifts: true,
  }
}