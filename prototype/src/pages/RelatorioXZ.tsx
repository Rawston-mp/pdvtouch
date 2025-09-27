// src/pages/RelatorioXZ.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../auth/session'
import { getSalesToday, getCurrentShift, closeCurrentShift, openShift, resetAllData } from '../db/sales'
import { printText } from '../mock/devices'
import type { Sale, ShiftSummary } from '../db'

const fmt = (v: number) => v.toFixed(2)
const formatDateTime = (timestamp: number) => new Date(timestamp).toLocaleString('pt-BR')

export default function RelatorioXZ() {
  const nav = useNavigate()
  const { user, hasRole } = useSession()
  
  const [todaySales, setTodaySales] = useState<Sale[]>([])
  const [currentShift, setCurrentShift] = useState<ShiftSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  // Controle para relatórios gerenciais
  const canManageShifts = hasRole(['ADMIN', 'GERENTE'])
  const isAdminOrManager = canManageShifts

  useEffect(() => {
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    
    try {
      setLoading(true)
      const [sales, shift] = await Promise.all([
        getSalesToday(),
        getCurrentShift(user.id)
      ])
      
      setTodaySales(sales)
      setCurrentShift(shift)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Estatísticas consolidadas
  const stats = {
    totalSales: todaySales.length,
    totalAmount: todaySales.reduce((sum, sale) => sum + sale.total, 0),
    cashAmount: todaySales.reduce((sum, sale) => sum + sale.payments.cash, 0),
    pixAmount: todaySales.reduce((sum, sale) => sum + sale.payments.pix, 0),
    tefAmount: todaySales.reduce((sum, sale) => sum + sale.payments.tef, 0),
    averageTicket: 0,
    firstSale: todaySales.length > 0 ? Math.min(...todaySales.map(s => s.timestamp)) : null,
    lastSale: todaySales.length > 0 ? Math.max(...todaySales.map(s => s.timestamp)) : null,
    
    // Agrupamentos
    salesByUser: {} as Record<string, { count: number; amount: number }>,
    salesByHour: {} as Record<string, number>,
    salesByPayment: {
      cash: todaySales.filter(s => s.payments.cash > 0).length,
      pix: todaySales.filter(s => s.payments.pix > 0).length,
      tef: todaySales.filter(s => s.payments.tef > 0).length,
    }
  }

  stats.averageTicket = stats.totalSales > 0 ? stats.totalAmount / stats.totalSales : 0

  // Vendas por usuário
  todaySales.forEach(sale => {
    if (!stats.salesByUser[sale.userName]) {
      stats.salesByUser[sale.userName] = { count: 0, amount: 0 }
    }
    stats.salesByUser[sale.userName].count++
    stats.salesByUser[sale.userName].amount += sale.total
  })

  // Vendas por hora
  todaySales.forEach(sale => {
    const hour = new Date(sale.timestamp).getHours().toString().padStart(2, '0') + 'h'
    stats.salesByHour[hour] = (stats.salesByHour[hour] || 0) + 1
  })

  async function handleOpenShift() {
    if (!user) return
    
    try {
      setProcessing(true)
      await openShift(user.id, user.name)
      await loadData()
      alert('Turno aberto com sucesso!')
    } catch (error) {
      console.error('Erro ao abrir turno:', error)
      alert('Erro ao abrir turno')
    } finally {
      setProcessing(false)
    }
  }

  async function handleCloseShift() {
    if (!user || !currentShift) return
    
    const confirm = window.confirm('Fechar o turno atual? Esta ação não pode ser desfeita.')
    if (!confirm) return

    try {
      setProcessing(true)
      await closeCurrentShift(user.id)
      await loadData()
      alert('Turno fechado com sucesso!')
    } catch (error) {
      console.error('Erro ao fechar turno:', error)
      alert('Erro ao fechar turno')
    } finally {
      setProcessing(false)
    }
  }

  async function printReportX() {
    const report = [
      '='.repeat(48),
      'RELATÓRIO LEITURA X',
      '='.repeat(48),
      `Data/Hora: ${formatDateTime(Date.now())}`,
      `Operador: ${user?.name} (${user?.role})`,
      '',
      'RESUMO DE VENDAS:',
      `-  Total de vendas: ${stats.totalSales}`,
      `-  Valor total: R$ ${fmt(stats.totalAmount)}`,
      `-  Ticket médio: R$ ${fmt(stats.averageTicket)}`,
      '',
      'FORMAS OF PAGAMENTO:',
      `-  Dinheiro: R$ ${fmt(stats.cashAmount)} (${stats.salesByPayment.cash} vendas)`,
      `-  PIX: R$ ${fmt(stats.pixAmount)} (${stats.salesByPayment.pix} vendas)`,
      `-  Cartão: R$ ${fmt(stats.tefAmount)} (${stats.salesByPayment.tef} vendas)`,
      '',
      stats.firstSale ? `Primeira venda: ${formatDateTime(stats.firstSale)}` : 'Nenhuma venda registrada',
      stats.lastSale ? `Última venda: ${formatDateTime(stats.lastSale)}` : '',
      '',
      'VENDAS POR OPERADOR:',
      ...Object.entries(stats.salesByUser).map(([name, data]) => 
        `-  ${name}: ${data.count} vendas - R$ ${fmt(data.amount)}`
      ),
      '',
      '='.repeat(48),
      'PDVTouch - Relatório X',
      '='.repeat(48)
    ]

    try {
      printText('fiscal01', report.join('\n'))
      alert('Relatório X impresso!')
    } catch (error) {
      console.error('Erro na impressão:', error)
      alert('Erro na impressão (modo demo)')
    }
  }

  async function printReportZ() {
    if (!canManageShifts) {
      alert('Somente gerentes e administradores podem emitir Relatório Z')
      return
    }

    const confirm = window.confirm(
      'ATENÇÃO: O Relatório Z fechará o dia fiscal e zerará os contadores. Deseja continuar?'
    )
    if (!confirm) return

    const report = [
      '='.repeat(48),
      'RELATÓRIO REDUÇÃO Z',
      '='.repeat(48),
      `Data/Hora: ${formatDateTime(Date.now())}`,
      `Operador: ${user?.name} (${user?.role})`,
      '',
      'TOTALIZADORES DO DIA:',
      `-  Total de vendas: ${stats.totalSales}`,
      `-  Valor bruto: R$ ${fmt(stats.totalAmount)}`,
      `-  Ticket médio: R$ ${fmt(stats.averageTicket)}`,
      '',
      'FORMAS DE PAGAMENTO:',
      `-  Dinheiro: R$ ${fmt(stats.cashAmount)}`,
      `-  PIX: R$ ${fmt(stats.pixAmount)}`,
      `-  Cartão: R$ ${fmt(stats.tefAmount)}`,
      '',
      'ESTATÍSTICAS:',
      stats.firstSale ? `-  Primeira venda: ${formatDateTime(stats.firstSale)}` : '-  Nenhuma venda',
      stats.lastSale ? `-  Última venda: ${formatDateTime(stats.lastSale)}` : '',
      `-  Período ativo: ${stats.firstSale && stats.lastSale ? 
        `${((stats.lastSale - stats.firstSale) / (1000 * 60 * 60)).toFixed(1)}h` : 'N/A'}`,
      '',
      'VENDAS POR HORA:',
      ...Object.entries(stats.salesByHour)
        .sort()
        .map(([hour, count]) => `-  ${hour}: ${count} vendas`),
      '',
      '='.repeat(48),
      'FECHAMENTO FISCAL - Z',
      '='.repeat(48)
    ]

    try {
      printText('fiscal01', report.join('\n'))
      
      // Em um sistema real, aqui seria feito:
      // 1. Registro no banco fiscal
      // 2. Reset dos contadores
      // 3. Backup dos dados
      
      alert('Relatório Z emitido! (Modo demonstração - dados não foram zerados)')
    } catch (error) {
      console.error('Erro na impressão:', error)
      alert('Erro na impressão do Relatório Z')
    }
  }

  async function handleResetAll() {
    if (!isAdminOrManager) {
      alert('Somente gerentes e administradores podem limpar os dados.')
      return
    }
    const ok = window.confirm('ATENÇÃO: Esta ação irá apagar TODAS as comandas (rascunhos), vendas e turnos. Deseja continuar?')
    if (!ok) return
    try {
      setProcessing(true)
      const res = await resetAllData()
      await loadData()
      alert(`Limpeza concluída. Rascunhos removidos: ${res.removedDrafts}. Vendas e turnos limpos.`)
    } catch (e) {
      console.error('Erro no reset:', e)
      alert('Erro ao limpar dados.')
    } finally {
      setProcessing(false)
    }
  }

  if (!user) {
    return (
      <div className="container">
        <h2>Relatório X/Z</h2>
        <div className="card">
          <p className="muted">Faça login para acessar os relatórios.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h2>Relatório X/Z</h2>

      {/* Status do Turno */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Status do Turno</h3>
        
        {loading ? (
          <div className="muted">Carregando...</div>
        ) : (
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {currentShift ? (
                <div>
                  <div className="pill success">
                    <strong>TURNO ABERTO</strong>
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>
                    Iniciado em: {formatDateTime(currentShift.startTime)}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="pill">
                    <strong>TURNO FECHADO</strong>
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>
                    Nenhum turno ativo
                  </div>
                </div>
              )}
            </div>

            <div className="row" style={{ gap: 8 }}>
              {!currentShift ? (
                <button 
                  className="btn btn-primary" 
                  onClick={handleOpenShift}
                  disabled={processing}
                >
                  {processing ? 'Abrindo...' : 'Abrir Turno'}
                </button>
              ) : (
                <button 
                  className="btn" 
                  onClick={handleCloseShift}
                  disabled={processing}
                >
                  {processing ? 'Fechando...' : 'Fechar Turno'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resumo do Dia */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Resumo do Movimento</h3>
        
        <div className="grid grid-4" style={{ marginBottom: 16 }}>
          <div className="pill">
            <strong>{stats.totalSales}</strong>
            <div className="small muted">Vendas</div>
          </div>
          <div className="pill">
            <strong>R$ {fmt(stats.totalAmount)}</strong>
            <div className="small muted">Total Bruto</div>
          </div>
          <div className="pill">
            <strong>R$ {fmt(stats.averageTicket)}</strong>
            <div className="small muted">Ticket Médio</div>
          </div>
          <div className="pill">
            <strong>{Object.keys(stats.salesByUser).length}</strong>
            <div className="small muted">Operadores</div>
          </div>
        </div>

        <div className="grid grid-3" style={{ marginBottom: 16 }}>
          <div className="card" style={{ padding: 12 }}>
            <strong>💰 Dinheiro</strong>
            <div style={{ fontSize: '18px', margin: '8px 0' }}>R$ {fmt(stats.cashAmount)}</div>
            <div className="small muted">{stats.salesByPayment.cash} transações</div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <strong>📱 PIX</strong>
            <div style={{ fontSize: '18px', margin: '8px 0' }}>R$ {fmt(stats.pixAmount)}</div>
            <div className="small muted">{stats.salesByPayment.pix} transações</div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <strong>💳 Cartão</strong>
            <div style={{ fontSize: '18px', margin: '8px 0' }}>R$ {fmt(stats.tefAmount)}</div>  
            <div className="small muted">{stats.salesByPayment.tef} transações</div>
          </div>
        </div>

        {/* Período de atividade */}
        {stats.firstSale && stats.lastSale && (
          <div className="row" style={{ gap: 16, fontSize: '14px', color: '#666' }}>
            <span>📅 Primeira venda: {formatDateTime(stats.firstSale)}</span>
            <span>🕐 Última venda: {formatDateTime(stats.lastSale)}</span>
            <span>⏱️ Período: {((stats.lastSale - stats.firstSale) / (1000 * 60 * 60)).toFixed(1)}h</span>
          </div>
        )}
      </div>

      {/* Operadores */}
      {Object.keys(stats.salesByUser).length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 className="card-title">Vendas por Operador</h3>
          
          {Object.entries(stats.salesByUser).map(([userName, data]) => (
            <div key={userName} className="row" style={{ 
              justifyContent: 'space-between', 
              padding: '8px 0', 
              borderBottom: '1px solid #eee' 
            }}>
              <span><strong>{userName}</strong></span>
              <span>{data.count} vendas • R$ {fmt(data.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Ações de Relatório */}
      <div className="card">
        <h3 className="card-title">Relatórios Fiscais</h3>
        
        <div className="row" style={{ gap: 12, marginBottom: 12 }}>
          <button className="btn btn-primary" onClick={printReportX}>
            📄 Relatório X (Leitura)
          </button>
          
          {canManageShifts && (
            <button className="btn" onClick={printReportZ} style={{ color: '#d32f2f' }}>
              📋 Relatório Z (Redução)
            </button>
          )}

          {isAdminOrManager && (
            <button className="btn" onClick={handleResetAll} style={{ color: '#b71c1c' }} title="Limpa rascunhos de comandas, vendas e turnos">
              🗑️ Limpar TUDO (Reset)
            </button>
          )}
          
          <button onClick={() => nav('/relatorios')} className="btn">
            📊 Relatórios Detalhados
          </button>
        </div>

        <div className="small muted">
          <strong>Relatório X:</strong> Leitura dos totalizadores sem zerá-los.<br/>
          <strong>Relatório Z:</strong> Fechamento do dia fiscal com zeramento dos contadores. 
          {!canManageShifts && ' (Restrito a gerentes)'}
        </div>
      </div>

      {/* Navegação */}
      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        <button onClick={() => nav('/dashboard')} className="btn">
          🏠 Dashboard
        </button>
        <button onClick={loadData} className="btn">
          🔄 Atualizar
        </button>
      </div>
    </div>
  )
}