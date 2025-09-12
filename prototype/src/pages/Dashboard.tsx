// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
// Suponha que você tenha vendas em IndexedDB; adapte "fetchAggregates()"
type TopItem = { name: string; total: number }
type HourBucket = { hour: string; total: number }
type OperatorScore = { name: string; total: number }

export default function Dashboard() {
  const [top, setTop] = useState<TopItem[]>([])
  const [hours, setHours] = useState<HourBucket[]>([])
  const [ops, setOps] = useState<OperatorScore[]>([])

  useEffect(() => {
    // TODO: ligue ao seu repositório de vendas (IndexedDB/Sync)
    setTop([{ name: 'Buffet', total: 1234 }, { name: 'Churrasco', total: 987 }])
    setHours([{ hour: '12h', total: 560 }, { hour: '13h', total: 620 }])
    setOps([{ name: 'Meire', total: 1500 }, { name: 'Carlos', total: 900 }])
  }, [])

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <h2 style={{ margin: 0 }}>Dashboard</h2>

      <section style={card}>
        <h3>Itens mais vendidos</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={top}><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="total" /></BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section style={card}>
        <h3>Pico por horário</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={hours}><XAxis dataKey="hour"/><YAxis/><Tooltip/><Bar dataKey="total" /></BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section style={card}>
        <h3>Ranking de operadores</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={ops} dataKey="total" nameKey="name" label>
                {ops.map((_, i) => <Cell key={i} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
const card: React.CSSProperties = { background:'#fff', border:'1px solid #eee', borderRadius:12, padding:12, boxShadow:'0 4px 16px rgba(0,0,0,.06)' }
