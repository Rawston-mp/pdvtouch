// src/db/audit.ts
import { db, initDb } from './index'
import type { AuditLog } from './index'

export async function logAudit(entry: Omit<AuditLog, 'id' | 'ts'> & { ts?: number }) {
  await initDb()
  const e: AuditLog = { ...entry, ts: entry.ts ?? Date.now() }
  await db.audits.add(e)
}

export async function listAudits(limit = 200) {
  await initDb()
  const arr = await db.audits.orderBy('ts').reverse().limit(limit).toArray()
  return arr
}
