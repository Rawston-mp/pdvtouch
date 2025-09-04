// src/pages/Sync.tsx
import { useEffect, useState } from 'react'
import { db } from '../db'
import type { OutboxEvent } from '../db/models'
import { processOutbox } from '../db/outbox'

export default function Sync() {
  const [events, setEvents] = useState<OutboxEvent[]>([])
  const [processing, setProcessing] = useState(false)

  async function refresh() {
    const list = await db.outbox.orderBy('createdAt').toArray()
    setEvents(list)
  }

  async function sendNow() {
    setProcessing(true)
    try {
      await processOutbox(async (ev) => {
        // aqui iria o POST real para o backoffice
        // por enquanto apenas simula sucesso
        console.log('[SYNC] enviando', ev)
        await wait(300) // simula latência
      })
      await refresh()
      alert('Reenvio concluído (mock).')
    } catch (e: any) {
      console.error(e)
      alert('Falha no reenvio: ' + (e?.message ?? e))
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => { refresh() }, [])

  return (
    <div style={{ padding: 16 }}>
      <h2>Sincronização</h2>
      <div style={{ marginBottom: 12 }}>
        <button onClick={refresh} style={btnLight}>Atualizar</button>{' '}
        <button onClick={sendNow} disabled={processing} style={btnPrimary}>
          {processing ? 'Reenviando...' : 'Reenviar outbox agora'}
        </button>
      </div>

      {events.length === 0 ? (
        <div style={{ opacity: 0.7 }}>Sem eventos pendentes.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: 8 }}>Quando</th>
              <th style={{ padding: 8 }}>Tipo</th>
              <th style={{ padding: 8 }}>Tentativas</th>
              <th style={{ padding: 8 }}>Erro</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev.id} style={{ borderBottom: '1px solid #f4f4f4' }}>
                <td style={{ padding: 8 }}>{new Date(ev.createdAt).toLocaleString()}</td>
                <td style={{ padding: 8 }}>{ev.type}</td>
                <td style={{ padding: 8 }}>{ev.tries}</td>
                <td style={{ padding: 8, color: ev.lastError ? '#b00' : '#666' }}>{ev.lastError ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function wait(ms: number) { return new Promise(res => setTimeout(res, ms)) }
const btnPrimary: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #0b5', background: '#0b5', color: '#fff', cursor: 'pointer' }
const btnLight: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }
