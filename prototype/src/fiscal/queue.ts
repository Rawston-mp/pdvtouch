// src/fiscal/queue.ts
import Dexie, { Table } from 'dexie';
import { NfceSale, NfceAuthResponse } from './types';

export type FiscalJob = {
  id?: number;
  kind: 'Nfce.Emit' | 'Nfce.Cancel';
  payload: any;
  status: 'PENDING' | 'SENT' | 'DONE' | 'ERROR';
  lastError?: string;
  attempts: number;
  createdAt: number;
  updatedAt: number;
};

class FiscalDb extends Dexie {
  jobs!: Table<FiscalJob, number>;
  constructor() {
    super('fiscalQueueDb');
    this.version(1).stores({
      jobs: '++id, status, kind, createdAt'
    });
  }
}
const db = new FiscalDb();

export async function enqueueNfceEmit(sale: NfceSale) {
  const job: FiscalJob = {
    kind: 'Nfce.Emit',
    payload: sale,
    status: 'PENDING',
    attempts: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.jobs.add(job);
}

export async function pollPending(limit = 5): Promise<FiscalJob[]> {
  return db.jobs.where('status').equals('PENDING').limit(limit).toArray();
}

export async function markSent(id: number) {
  await db.jobs.update(id, { status: 'SENT', updatedAt: Date.now() });
}

export async function completeJob(id: number) {
  await db.jobs.update(id, { status: 'DONE', updatedAt: Date.now() });
}

export async function failJob(id: number, err: string) {
  await db.jobs.update(id, { status: 'ERROR', lastError: err, updatedAt: Date.now() });
}

export async function retryErrored(olderThanMs = 60_000) {
  const now = Date.now();
  const rows = await db.jobs.where('status').equals('ERROR').toArray();
  await Promise.all(rows
    .filter(r => now - r.updatedAt > olderThanMs)
    .map(r => db.jobs.update(r.id!, { status: 'PENDING', attempts: r.attempts + 1, updatedAt: now })));
}
