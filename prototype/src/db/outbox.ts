import { db } from './index'
import { OutboxEvent } from './models'

export async function enqueue(event: Omit<OutboxEvent, 'tries' | 'createdAt'>) {
  const ev: OutboxEvent = {
    ...event,
    tries: 0,
    createdAt: Date.now()
  }
  await db.outbox.add(ev)
  return ev
}

export async function processOutbox(sendFn: (ev: OutboxEvent) => Promise<void>) {
  const events = await db.outbox.orderBy('createdAt').toArray()
  for (const ev of events) {
    try {
      await sendFn(ev)              // tenta enviar ao backoffice
      await db.outbox.delete(ev.id) // remove se sucesso
    } catch (err: any) {
      await db.outbox.update(ev.id, {
        tries: ev.tries + 1,
        lastError: String(err?.message ?? err)
      })
    }
  }
}
