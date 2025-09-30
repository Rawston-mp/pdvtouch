// src/db/shifts.ts (compat baseado em ShiftSummary existente)
import { db, initDb, type ShiftSummary } from './index'

/** Retorna o turno aberto para um usuário. */
export async function getCurrentShift(userId: string): Promise<ShiftSummary | null> {
  await initDb()
  const s = await db.shifts.where('userId').equals(userId).and((x) => x.status === 'OPEN').first()
  return s ?? null
}

/** Fecha o turno aberto do usuário, marcando endTime e status. */
export async function closeShiftForUser(userId: string): Promise<ShiftSummary | null> {
  await initDb()
  const cur = await getCurrentShift(userId)
  if (!cur) return null
  await db.shifts.update(cur.id!, { endTime: Date.now(), status: 'CLOSED' })
  return { ...cur, endTime: Date.now(), status: 'CLOSED' }
}
