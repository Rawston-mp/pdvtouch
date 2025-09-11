// src/pages/Turno.tsx
import { useEffect, useMemo, useState } from 'react'
import { getCurrentShift, openShift, addMovement, listMovements, closeShift, summarizeShift, cancelMovement } from '../db/shifts'
import { getSettings, findPrinterByDestination } from '../db/settings'
import { ticketFechamentoTurno } from '../lib/escposTurno'
import { printText } from '../mock/devices'
import type { CashMovement } from '../db/models'
import { useSession } from '../auth/session'

type Mov = CashMovement

export default function Turno() {
  const { user, hasRole } = useSession()
  const isGerente = hasRole('GERENTE')

  const [curId, setCurId] = useState<number | null>(null)
  const [userName, setUserName] = useState(user?.name || '')
  const [openingAmount, setOpeningAmount] = useState(0)
  const [movs, setMovs] = useState<Mov[]>([])
  const [movType, setMovType] = useState<'SUPRIMENTO'|'SANGRIA'>('SUPRIMENTO')
  const [movValue, setMovValue] = useState<number>(0)
  const [movNote, setMovNote] = useState<string>('')

  async function refresh() {
    const s = await getCurrentShift()
    if (s?.id != null) {
      setCurId(s.id)
      setUserName(s.user || user?.name || '')
      setOpeningAmount(s.openingAmount)
      setMovs(await listMovements(s.id))
    } else {
      setCurId(null)
      setMovs([])
    }
  }

  useEffect(() => { refresh() }, [])

  async function onOpen() {
    if (curId) return alert('Já existe um turno aberto.')
    if (openingAmount < 0) return alert('Abertura inválida.')
    await openShift({ user: userName || user?.name, openingAmount })
    setOpeningAmount(0)
    await refresh()
  }

  async function onMovement() {
    if (!curId) return alert('Abra um turno primeiro.')
    if (movValue <= 0) return alert('Valor inválido.')
    if (movType === 'SANGRIA' && !isGerente) return alert('Sangria requer perfil GERENTE.')
    await addMovement(curId, movType, movValue, movNote || undefined)
    setMovValue(0); setMovNote(''); await refresh()
  }

  async function onCancelMovement(m: Mov) {
    if (!m.id) return
    if (!isGerente) return alert('Cancelar movimento requer GERENTE.')
    if (m.voidedAt) return
    const reason = prompt(`Cancelar ${m.type} de R$ ${m.amount.toFixed(2)}? Motivo (opcional):`, '')
    await cancelMovement(m.id, reason || undefined).catch(e => alert(e?.message || 'Falha ao cancelar.'))
    await refresh()
  }

  async function onClose() {
    if (!curId) return
    if (!isGerente) return alert('Fechar turno requer GERENTE.')
    const info = await summarizeShift(curId)
    const closingAmountStr = prompt(
      `Saldo teórico ${money(info.saldoTeorico)}\nInforme o valor contado na gaveta:`,
      info.saldoTeorico.toFixed(2)
    )
    if (closingAmountStr == null) return
    const closingAmount = Number(closingAmountStr.replace(',', '.')) || 0
    const s = await closeShift(curId, closingAmount)

    const settings = await getSettings()
    const printer = await findPrinterByDestination('CAIXA')
    if (!printer) { alert('Sem impressora de CAIXA configurada.'); await refresh(); return }
    const text = ticketFechamentoTurno({
      settings, printer,
      data: {
        user: s.user, openedAt: s.openedAt, closedAt: s.closedAt!,
        openingAmount: s.openingAmount, closingAmount: s.closingAmount!,
        suprimento: info.suprimento, sangria: info.sangria, saldoTeorico: info.saldoTeorico
      }
    })
    printText('TURNO:' + s.id, text)
    alert('Fechamento emitido (mock).')
    await refresh()
  }

  // totais (ignorando cancelados)
  const validMovs = useMemo(() => movs.filter(m => !m.voidedAt), [movs])
  const totalSupr = useMemo(() => validMovs.filter(m => m.type==='SUPRIMENTO').reduce((a,b)=>a+b.amount,0), [validMovs])
  const totalSang = useMemo(() => validMovs.filter(m => m.type==='SANGRIA').reduce((a,b)=>a+b.amount,0), [validMovs])
  const saldoTeor = useMemo(() => (openingAmount + totalSupr - totalSang), [openingAmount, totalSupr, totalSang])

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <h2>Turno</h2>

      {/* Abertura */}
      <section style={box}>
        <h3>Abertura de turno</h3>
        {curId ? (
          <div style={{ opacity:.8 }}>Turno <b>#{curId}</b> aberto. Operador: <b>{userName || '-'}</b></div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 160px 120px', gap:8 }}>
            <input placeholder="Operador (opcional)" value={userName} onChange={e=>setUserName(e.target.value)} style={inp}/>
            <input type="number" step="0.01" placeholder="Fundo (R$)" value={openingAmount} onChange={e=>setOpeningAmount(Number(e.target.value||0))} style={inp}/>
            <button onClick={onOpen} style={btnPrimary}>Abrir turno</button>
          </div>
        )}
      </section>

      {/* Movimentos */}
      <section style={box}>
        <h3>Movimentos (suprimento / sangria)</h3>
        <div style={{ display:'grid', gridTemplateColumns:'140px 140px 1fr 120px', gap:8 }}>
          <select value={movType} onChange={e=>setMovType(e.target.value as any)} style={inp}>
            <option value="SUPRIMENTO">Suprimento (+)</option>
            <option value="SANGRIA">Sangria (−) {isGerente ? '' : ' — bloqueado'}</option>
          </select>
          <input type="number" step="0.01" placeholder="Valor (R$)" value={movValue} onChange={e=>setMovValue(Number(e.target.value||0))} style={inp}/>
          <input placeholder="Observação (opcional)" value={movNote} onChange={e=>setMovNote(e.target.value)} style={inp}/>
          <button onClick={onMovement} disabled={!curId || (movType==='SANGRIA' && !isGerente)} style={btnLight}>Lançar</button>
        </div>

        <div style={{ marginTop:12 }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ textAlign:'left', borderBottom:'1px solid #eee' }}>
                <th style={th}>Data/hora</th>
                <th style={th}>Tipo</th>
                <th style={th}>Valor</th>
                <th style={th}>Obs.</th>
                <th style={th}>Status</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {movs.map(m => {
                const canceled = !!m.voidedAt
                return (
                  <tr key={m.id} style={{ borderBottom:'1px solid #f4f4f4', opacity: canceled ? .6 : 1 }}>
                    <td style={td}>{new Date(m.createdAt).toLocaleString()}</td>
                    <td style={td}>{m.type}</td>
                    <td style={td}>{money(m.amount)}</td>
                    <td style={td}>{m.note || ''}</td>
                    <td style={td}>
                      {canceled
                        ? <span style={{ color:'#a00' }}>CANCELADO{m.voidReason ? ` — ${m.voidReason}` : ''}</span>
                        : <span style={{ color:'#0a0' }}>Válido</span>
                      }
                    </td>
                    <td style={td}>
                      {!canceled && (
                        <button onClick={() => onCancelMovement(m)} disabled={!isGerente} style={btnDanger}>
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {movs.length===0 && <tr><td style={td} colSpan={6}><i>Sem movimentos.</i></td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Resumo / Fechamento */}
      <section style={box}>
        <h3>Resumo</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
          <Kpi label="Abertura" value={money(openingAmount)} />
          <Kpi label="Suprimentos" value={money(totalSupr)} />
          <Kpi label="Sangrias" value={money(totalSang)} />
          <Kpi label="Saldo teórico" value={money(saldoTeor)} />
        </div>
        <div style={{ marginTop:12 }}>
          <button onClick={onClose} disabled={!curId || !isGerente} style={btnPrimary}>Fechar turno (imprime)</button>
        </div>
      </section>
    </div>
  )
}

function Kpi({label, value}:{label:string; value:string}) {
  return (
    <div style={{ border:'1px solid #eee', borderRadius:10, padding:10 }}>
      <div style={{ fontSize:12, opacity:.7 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700 }}>{value}</div>
    </div>
  )
}
const money = (v:number) => 'R$ ' + v.toFixed(2)

const box: React.CSSProperties = { border:'1px solid #eee', borderRadius:12, padding:12 }
const inp: React.CSSProperties = { padding:'8px 10px', borderRadius:8, border:'1px solid #ddd' }
const th: React.CSSProperties = { padding:8 }
const td: React.CSSProperties = { padding:8 }
const btnPrimary: React.CSSProperties = { padding:'8px 12px', borderRadius:8, border:'1px solid #0b5', background:'#0b5', color:'#fff', cursor:'pointer' }
const btnLight: React.CSSProperties = { padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer' }
const btnDanger: React.CSSProperties = { padding:'6px 10px', borderRadius:8, border:'1px solid #c33', background:'#fff5f5', color:'#c33', cursor:'pointer' }
