// src/db/shifts.ts
import { db, initDb } from './index'
import type { Shift, CashMovement, CashMovementType } from './models'

/** Retorna o turno aberto (closedAt == null). Usa filter() para evitar erro de key em null. */
export async function getCurrentShift(): Promise<Shift | undefined> {
  await initDb()
  return db.shifts.filter(s => s.closedAt == null).first()
}

/** Abre um novo turno; se já houver aberto, lança erro. */
export async function openShift(params: { user?: string; openingAmount: number }) {
  await initDb()
  const cur = await getCurrentShift()
  if (cur) throw new Error('Já existe um turno aberto.')
  const id = await db.shifts.add({
    openedAt: Date.now(),
    user: params.user,
    openingAmount: Math.max(0, params.openingAmount),
    closedAt: null,
    closingAmount: null
  })
  return id
}

/** Lança suprimento/sangria no turno atual. */
export async function addMovement(shiftId: number, type: CashMovementType, amount: number, note?: string) {
  await initDb()
  if (amount <= 0) throw new Error('Valor deve ser maior que zero.')
  await db.cashMovs.add({
    shiftId, createdAt: Date.now(), type, amount, note, voidedAt: null, voidReason: null
  })
}

/** Cancela (invalida) um movimento — mantém registro para auditoria. */
export async function cancelMovement(movId: number, reason?: string) {
  await initDb()
  const mov = await db.cashMovs.get(movId)
  if (!mov) throw new Error('Movimento não encontrado.')
  if (mov.voidedAt) throw new Error('Movimento já cancelado.')
  mov.voidedAt = Date.now()
  mov.voidReason = reason || null
  await db.cashMovs.put(mov)
}

/** Lista movimentos do turno (ordem crescente). */
export async function listMovements(shiftId: number): Promise<CashMovement[]> {
  await initDb()
  const arr = await db.cashMovs.where('shiftId').equals(shiftId).toArray()
  return arr.sort((a, b) => a.createdAt - b.createdAt)
}

/** Fecha o turno e grava o valor conferido (gaveta). */
export async function closeShift(shiftId: number, closingAmount: number) {
  await initDb()
  const s = await db.shifts.get(shiftId)
  if (!s || s.closedAt != null) throw new Error('Turno inexistente ou já fechado.')
  s.closedAt = Date.now()
  s.closingAmount = Math.max(0, closingAmount)
  await db.shifts.put(s)
  return s
}

/** Sumariza suprimentos/sangrias e saldo teórico do turno (ignora cancelados). */
export async function summarizeShift(shiftId: number) {
  await initDb()
  const s = await db.shifts.get(shiftId)
  if (!s) throw new Error('Turno não encontrado.')
  const movs = await db.cashMovs.where('shiftId').equals(shiftId).toArray()
  const valid = movs.filter(m => !m.voidedAt)
  const suprimento = valid.filter(m => m.type === 'SUPRIMENTO').reduce((a, b) => a + b.amount, 0)
  const sangria    = valid.filter(m => m.type === 'SANGRIA').reduce((a, b) => a + b.amount, 0)
  const saldoTeorico = s.openingAmount + suprimento - sangria
  return { shift: s, suprimento, sangria, saldoTeorico }
}
