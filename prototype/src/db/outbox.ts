import { db } from './index'
import type { OutboxEvent } from './index'

export async function enqueue(event: Omit<OutboxEvent, 'tries' | 'createdAt'>) {
  const ev: OutboxEvent = { ...event, tries: 0, createdAt: Date.now() }
  await db.outbox.add(ev)
  return ev
}

export async function processOutbox(sendFn: (ev: OutboxEvent) => Promise<void>) {
  const events = await db.outbox.orderBy('createdAt').toArray()
  for (const ev of events) {
    try {
      await sendFn(ev)
      if (typeof ev.id === 'number') {
        await db.outbox.delete(ev.id)
      }
    } catch (err: unknown) {
      await db.outbox.update(ev.id as number, {
        tries: ev.tries + 1,
        lastError: String((err as { message?: string })?.message ?? err)
      })
    }
  }
}
