// src/audit/secureLog.ts
import Dexie, { Table } from 'dexie';

export type SecureAudit = {
  id?: number;
  ts: number;
  actor?: string;
  type: string;
  message: string;
  data?: any;
  prevHash: string;  // hash do registro anterior
  hash: string;      // hash deste (prevHash + payload)
};

class AuditDb extends Dexie {
  logs!: Table<SecureAudit, number>;
  constructor() {
    super('secureAuditDb');
    this.version(1).stores({ logs: '++id, ts, type' });
  }
}
const db = new AuditDb();

async function sha256B64(s: string) {
  const a = new TextEncoder().encode(s);
  const h = await crypto.subtle.digest('SHA-256', a);
  return btoa(String.fromCharCode(...new Uint8Array(h)));
}

export async function logSecure(e: Omit<SecureAudit,'id'|'prevHash'|'hash'>) {
  const last = await db.logs.orderBy('id').last();
  const prevHash = last?.hash ?? '';
  const payload = JSON.stringify({ ...e, prevHash });
  const hash = await sha256B64(payload);
  await db.logs.add({ ...e, prevHash, hash });
}

export async function listSecure(from?: number, to?: number) {
  if (!from || !to) return db.logs.orderBy('ts').reverse().limit(500).toArray();
  return db.logs.where('ts').between(from, to, true, true).reverse().toArray();
}
