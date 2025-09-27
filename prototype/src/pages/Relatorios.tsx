// src/pages/Relatorios.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../auth/session'
import { getSalesReport, getSalesToday, getCurrentShift } from '../db/sales'
import type { Sale } from '../db'

const fmt = (v: number) => v.toFixed(2)
const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString('pt-BR')
const formatDateOnly = (timestamp: number) => new Date(timestamp).toLocaleDateString('pt-BR')
const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString('pt-BR')

export default function Relatorios() {
  const nav = useNavigate()
  const { user } = useSession()
  
  const [todaySales, setTodaySales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [currentShift, setCurrentShift] = useState<any>(null)
  
  // Filtros para relatório personalizado
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [customReport, setCustomReport] = useState<any>(null)
  const [loadingCustom, setLoadingCustom] = useState(false)

  useEffect(() => {
    loadTodayData()
  }, [user])

  async function loadTodayData() {
    if (!user) return
    
    try {
      setLoading(true)
      const sales = await getSalesToday()
      setTodaySales(sales)
      
      const shift = await getCurrentShift(user.id)
      setCurrentShift(shift)
    } catch (error) {
      console.error('Erro ao carregar dados do dia:', error)
    } finally {
      setLoading(false)
    }
  }

  async function generateCustomReport() {
    if (!startDate || !endDate) {
      alert('Selecione as datas de início e fim')
      return
    }

    try {
      setLoadingCustom(true)
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      
      const report = await getSalesReport(start, end)
      setCustomReport(report)
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      alert('Erro ao gerar relatório')
    } finally {
      setLoadingCustom(false)
    }
  }

  // Estatísticas do dia
  const todayStats = {
    totalSales: todaySales.length,
    totalAmount: todaySales.reduce((sum, sale) => sum + sale.total, 0),
    cashAmount: todaySales.reduce((sum, sale) => sum + sale.payments.cash, 0),
    pixAmount: todaySales.reduce((sum, sale) => sum + sale.payments.pix, 0),
    tefAmount: todaySales.reduce((sum, sale) => sum + sale.payments.tef, 0),
    averageTicket: todaySales.length > 0 ? 
      todaySales.reduce((sum, sale) => sum + sale.total, 0) / todaySales.length : 0
  }

  if (!user) {
    return (
      <div className="container">
        <h2>Relatórios</h2>
        <div className="card">
          <p className="muted">Faça login para acessar os relatórios.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h2>Relatórios</h2>

      {/* Resumo do Dia */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Resumo do Dia - {formatDateOnly(Date.now())}</h3>
        
        {loading ? (
          <div className="muted">Carregando...</div>
        ) : (
          <>
            <div className="grid grid-4" style={{ marginBottom: 16 }}>
              <div className="pill">
                <strong>{todayStats.totalSales}</strong>
                <div className="small muted">Vendas</div>
              </div>
              <div className="pill">
                <strong>R$ {fmt(todayStats.totalAmount)}</strong>  
                <div className="small muted">Total</div>
              </div>
              <div className="pill">
                <strong>R$ {fmt(todayStats.averageTicket)}</strong>
                <div className="small muted">Ticket Médio</div>
              </div>
              <div className="pill">
                <strong>{currentShift ? 'ABERTO' : 'FECHADO'}</strong>
                <div className="small muted">Turno</div>
              </div>
            </div>

            <div className="grid grid-3" style={{ marginBottom: 16 }}>
              <div className="card" style={{ padding: 12 }}>
                <strong>Dinheiro</strong>
                <div>R$ {fmt(todayStats.cashAmount)}</div>
                <div className="small muted">
                  {todayStats.totalAmount > 0 ? 
                    `${((todayStats.cashAmount / todayStats.totalAmount) * 100).toFixed(1)}%` : '0%'}
                </div>
              </div>
              <div className="card" style={{ padding: 12 }}>
                <strong>PIX</strong>
                <div>R$ {fmt(todayStats.pixAmount)}</div>
                <div className="small muted">
                  {todayStats.totalAmount > 0 ? 
                    `${((todayStats.pixAmount / todayStats.totalAmount) * 100).toFixed(1)}%` : '0%'}
                </div>
              </div>
              <div className="card" style={{ padding: 12 }}>
                <strong>Cartão</strong>
                <div>R$ {fmt(todayStats.tefAmount)}</div>
                <div className="small muted">
                  {todayStats.totalAmount > 0 ? 
                    `${((todayStats.tefAmount / todayStats.totalAmount) * 100).toFixed(1)}%` : '0%'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Relatório Personalizado */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Relatório por Período</h3>
        
        <div className="row" style={{ gap: 12, alignItems: 'end', marginBottom: 16 }}>
          <div>
            <label className="small muted">Data Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: 150 }}
            />
          </div>
          <div>
            <label className="small muted">Data Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: 150 }}
            />
          </div>
          <button 
            className="btn btn-primary" 
            onClick={generateCustomReport}
            disabled={loadingCustom}
          >
            {loadingCustom ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>

        {customReport && (
          <div>
            <h4>Resultado: {startDate} a {endDate}</h4>
            <div className="grid grid-4" style={{ marginBottom: 16 }}>
              <div className="pill">
                <strong>{customReport.summary.totalSales}</strong>
                <div className="small muted">Vendas</div>
              </div>
              <div className="pill">
                <strong>R$ {fmt(customReport.summary.totalAmount)}</strong>
                <div className="small muted">Total</div>
              </div>
              <div className="pill">
                <strong>R$ {fmt(customReport.summary.averageTicket)}</strong>
                <div className="small muted">Ticket Médio</div>
              </div>
              <div className="pill">
                <strong>R$ {fmt(customReport.summary.cashAmount + customReport.summary.pixAmount + customReport.summary.tefAmount)}</strong>
                <div className="small muted">Recebido</div>
              </div>
            </div>

            {/* Vendas por usuário */}
            {Object.keys(customReport.summary.salesByUser).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h5>Por Operador</h5>
                {Object.entries(customReport.summary.salesByUser).map(([user, data]: [string, any]) => (
                  <div key={user} className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                    <span>{user}</span>
                    <span>{data.count} vendas - R$ {fmt(data.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vendas de Hoje */}
      {todaySales.length > 0 && (
        <div className="card">
          <h3 className="card-title">Vendas de Hoje ({todaySales.length})</h3>
          
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {todaySales.map((sale) => (
              <div key={sale.id} className="row" style={{ 
                justifyContent: 'space-between', 
                padding: '12px 0', 
                borderBottom: '1px solid #eee' 
              }}>
                <div>
                  <div><strong>Comanda #{sale.orderId}</strong></div>
                  <div className="small muted">
                    {formatTime(sale.timestamp)} • {sale.userName} ({sale.userRole})
                  </div>
                  <div className="small muted">
                    {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><strong>R$ {fmt(sale.total)}</strong></div>
                  <div className="small muted">
                    {sale.payments.cash > 0 && `💰 ${fmt(sale.payments.cash)} `}
                    {sale.payments.pix > 0 && `📱 ${fmt(sale.payments.pix)} `}
                    {sale.payments.tef > 0 && `💳 ${fmt(sale.payments.tef)}`}
                  </div>
                  <div className="small muted">{sale.docType}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        <button onClick={() => nav('/relatorioxz')} className="btn btn-primary">
          Relatório X/Z
        </button>
        <button onClick={loadTodayData} className="btn">
          Atualizar
        </button>
        <button onClick={() => nav('/dashboard')} className="btn">
          Voltar
        </button>
      </div>
    </div>
  )
}