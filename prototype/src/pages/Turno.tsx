// src/pages/Turno.tsx
import React from 'react'
import { useSession } from '../auth/session'
import type { ShiftSummary } from '../db'
import { openShift, getCurrentShift, closeCurrentShift, getShiftReport } from '../db/sales'
import { printText } from '../mock/devices'

function fmtMoney(n: number) {
  return `R$ ${Number(n || 0).toFixed(2)}`
}

function fmtDateTime(ts?: number) {
  if (!ts) return '-'
  const d = new Date(ts)
  const dia = d.toLocaleDateString()
  const hora = d.toLocaleTimeString()
  return `${dia} ${hora}`
}

export default function Turno() {
  const { user } = useSession()
  const [current, setCurrent] = React.useState<ShiftSummary | null>(null)
  const [history, setHistory] = React.useState<ShiftSummary[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string>('')

  async function load() {
    if (!user) return
    try {
      setLoading(true)
      setError('')
      const cur = await getCurrentShift(user.id)
      setCurrent(cur)
      const hs = await getShiftReport(user.id, new Date())
      setHistory(hs)
    } catch (e) {
      console.error(e)
      setError('Erro ao carregar dados de turno.')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function handleOpen() {
    if (!user) return
    try {
      setLoading(true)
      await openShift(user.id, user.name)
      await load()
    } catch (e) {
      console.error(e)
      setError('Não foi possível abrir o turno.')
    } finally {
      setLoading(false)
    }
  }

  async function handleClose() {
    if (!user) return
    try {
      setLoading(true)
      await closeCurrentShift(user.id)

      // Buscar o turno recém-fechado e imprimir um resumo (mock)
      try {
        const shifts = await getShiftReport(user.id, new Date())
        const lastClosed = shifts
          .filter((s) => s.status === 'CLOSED' && s.endTime)
          .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))[0]
        if (lastClosed) {
          const lines = [
            '='.repeat(48),
            'RESUMO DE TURNO',
            '='.repeat(48),
            `Operador: ${lastClosed.userName}`,
            `Início: ${fmtDateTime(lastClosed.startTime)}`,
            `Fim:    ${fmtDateTime(lastClosed.endTime)}`,
            '',
            `Vendas: ${lastClosed.salesCount}`,
            `Total:  ${fmtMoney(lastClosed.totalAmount)}`,
            `  Dinheiro: ${fmtMoney(lastClosed.cashAmount)}`,
            `  PIX:      ${fmtMoney(lastClosed.pixAmount)}`,
            `  Cartão:   ${fmtMoney(lastClosed.tefAmount)}`,
            '',
            '='.repeat(48),
            'PDVTouch - Fechamento de Turno (Demo)',
            '='.repeat(48),
          ]
          printText('fiscal01', lines.join('\n'))
        }
      } catch (err) {
        console.warn('Falha ao imprimir resumo do turno (mock):', err)
      }

      await load()
    } catch (e) {
      console.error(e)
      setError('Não foi possível fechar o turno.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h2>Turno</h2>

      {!!error && (
        <div className="pill" style={{ background: '#fdecea', borderColor: '#f44336' }}>{error}</div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Status atual</h3>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={load} disabled={loading}>Atualizar</button>
            {!current && (
              <button className="btn btn-primary" onClick={handleOpen} disabled={loading}>Abrir turno</button>
            )}
            {current && (
              <button className="btn" onClick={handleClose} disabled={loading}>Fechar turno</button>
            )}
          </div>
        </div>

        {!current && (
          <div className="muted">Nenhum turno aberto para {user?.name}.</div>
        )}

        {current && (
          <div className="grid grid-3" style={{ alignItems: 'start' }}>
            <div>
              <div className="small muted">Operador</div>
              <div>{current.userName}</div>
            </div>
            <div>
              <div className="small muted">Início</div>
              <div>{fmtDateTime(current.startTime)}</div>
            </div>
            <div>
              <div className="small muted">Status</div>
              <span className={`pill small ${current.status === 'OPEN' ? 'success' : ''}`}>
                {current.status === 'OPEN' ? 'Aberto' : 'Fechado'}
              </span>
            </div>

            <div>
              <div className="small muted">Vendas</div>
              <div>{current.salesCount}</div>
            </div>
            <div>
              <div className="small muted">Total</div>
              <div>{fmtMoney(current.totalAmount)}</div>
            </div>
            <div>
              <div className="small muted">Dinheiro / PIX / TEF</div>
              <div>
                {fmtMoney(current.cashAmount)} / {fmtMoney(current.pixAmount)} / {fmtMoney(current.tefAmount)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Histórico (hoje)</h3>
        {history.length === 0 ? (
          <div className="muted">Sem registros para hoje.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Operador</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Status</th>
                <th>Vendas</th>
                <th>Total</th>
                <th>Dinheiro</th>
                <th>PIX</th>
                <th>TEF</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id}>
                  <td>{s.userName}</td>
                  <td>{fmtDateTime(s.startTime)}</td>
                  <td>{fmtDateTime(s.endTime)}</td>
                  <td>
                    <span className={`pill small ${s.status === 'OPEN' ? 'success' : ''}`}>
                      {s.status === 'OPEN' ? 'Aberto' : 'Fechado'}
                    </span>
                  </td>
                  <td>{s.salesCount}</td>
                  <td>{fmtMoney(s.totalAmount)}</td>
                  <td>{fmtMoney(s.cashAmount)}</td>
                  <td>{fmtMoney(s.pixAmount)}</td>
                  <td>{fmtMoney(s.tefAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}