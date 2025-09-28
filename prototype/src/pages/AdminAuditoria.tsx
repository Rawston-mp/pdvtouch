// src/pages/AdminAuditoria.tsx
import { useEffect, useMemo, useState } from 'react'
import { listAudits } from '../db/audit'

type Row = { id?: number; ts: number; userName?: string | null; action: string; details?: any }

export default function AdminAuditoria() {
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('') // filtro rápido

  async function refresh() {
    const r = await listAudits(500)
    setRows(r)
  }
  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(r =>
      (r.userName || '').toLowerCase().includes(s) ||
      (r.action || '').toLowerCase().includes(s) ||
      JSON.stringify(r.details || {}).toLowerCase().includes(s)
    )
  }, [rows, q])

  return (
    <div style={{ padding:16 }}>
      <h2>Admin → Auditoria</h2>
      <div style={{ display:'flex', gap:8, margin:'12px 0' }}>
        <input placeholder="Filtrar por texto (usuário/ação/detalhes)" value={q} onChange={e=>setQ(e.target.value)} style={{ flex:1 }} />
        <button onClick={refresh}>Atualizar</button>
      </div>

      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ textAlign:'left', borderBottom:'1px solid #eee' }}>
            <th style={{ padding:8, width:200 }}>Data/Hora</th>
            <th style={{ padding:8, width:220 }}>Usuário</th>
            <th style={{ padding:8, width:160 }}>Ação</th>
            <th style={{ padding:8 }}>Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} style={{ borderBottom:'1px solid #f4f4f4' }}>
              <td style={{ padding:8 }}>{new Date(r.ts).toLocaleString()}</td>
              <td style={{ padding:8 }}>{r.userName || '-'}</td>
              <td style={{ padding:8 }}>{r.action}</td>
              <td style={{ padding:8, fontFamily:'monospace', whiteSpace:'pre-wrap' }}>{JSON.stringify(r.details || {}, null, 2)}</td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td style={{ padding:8 }} colSpan={4}><i>Nenhum registro.</i></td></tr>}
        </tbody>
      </table>
    </div>
  )
}
