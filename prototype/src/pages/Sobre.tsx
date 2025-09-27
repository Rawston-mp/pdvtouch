// src/pages/Sobre.tsx
import React from 'react'
import { requestWeight, printText } from '../mock/devices'
import { db } from '../db'

function getWsStatus() {
  try {
    const anyWin = window as any
    // Sem estado global do socket; indicamos a URL do servidor mock
    return {
      url: 'ws://localhost:8787',
      note: 'Verifique se o comando "npm run mock:ws" está em execução.'
    }
  } catch {
    return { url: 'ws://localhost:8787' }
  }
}

export default function Sobre() {
  const [dbOpen, setDbOpen] = React.useState<boolean | null>(null)
  const [dbName, setDbName] = React.useState<string>('pdvtouch-proto')
  const [wsOnline, setWsOnline] = React.useState<'checando' | 'online' | 'offline'>('checando')
  const [counts, setCounts] = React.useState<Record<string, number>>({})

  React.useEffect(() => {
    try {
      setDbName((db as any)?.name ?? 'pdvtouch-proto')
      setDbOpen((db as any)?.isOpen?.() ?? null)
    } catch {
      setDbOpen(null)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const c = {
          settings: await db.settings.count(),
          printers: await db.printers.count(),
          products: await db.products.count(),
          users: await db.users.count(),
          sales: await db.sales.count(),
          shifts: await db.shifts.count(),
        }
        if (!cancelled) setCounts(c)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Usamos requestWeight como um ping simples
        await requestWeight().catch(() => { throw new Error('ws fail') })
        if (!cancelled) setWsOnline('online')
      } catch {
        if (!cancelled) setWsOnline('offline')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const ws = getWsStatus()
  const version = (import.meta as any).env?.VITE_APP_VERSION || '0.0.0'
  const gitCommit = (import.meta as any).env?.VITE_GIT_COMMIT || ''
  const gitTag = (import.meta as any).env?.VITE_GIT_TAG || ''

  function testPrint() {
    try {
      printText('fiscal01', '[MOCK] Teste de impressão a partir da página Sobre/Suporte.')
      alert('Comando de impressão enviado. Verifique o terminal do servidor WS (mock).')
    } catch (e) {
      alert('Falha ao enviar impressão (veja o console).')
      console.error(e)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Sobre / Suporte</h2>

      <div className="card" style={{ maxWidth: 800 }}>
        <h3 className="card-title">Aplicação</h3>
        <ul>
          <li><b>Versão:</b> {version}</li>
          <li><b>Git commit:</b> {gitCommit || 'N/D'}</li>
          <li><b>Git tag:</b> {gitTag || 'N/D'}</li>
          <li><b>URL atual:</b> {window.location.href}</li>
        </ul>
      </div>

      <div className="card" style={{ maxWidth: 800 }}>
        <h3 className="card-title">Dispositivos (Mock)</h3>
        <ul>
          <li><b>Servidor WebSocket:</b> {ws.url}</li>
          <li><b>Status WS:</b> {wsOnline === 'checando' ? 'checando…' : wsOnline}</li>
          <li className="muted">{ws.note}</li>
        </ul>
      </div>

      <div className="card" style={{ maxWidth: 800 }}>
        <h3 className="card-title">Banco de Dados</h3>
        <ul>
          <li><b>IndexedDB (Dexie):</b> {dbName}</li>
          <li><b>Status:</b> {dbOpen === null ? 'indefinido' : dbOpen ? 'aberto' : 'fechado'}</li>
          <li><b>Contagens:</b> settings {counts.settings ?? 0}, printers {counts.printers ?? 0}, products {counts.products ?? 0}, users {counts.users ?? 0}, sales {counts.sales ?? 0}, shifts {counts.shifts ?? 0}</li>
        </ul>
      </div>

      <div className="card" style={{ maxWidth: 800 }}>
        <h3 className="card-title">Atalhos úteis</h3>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <a className="btn" href="/relatorioxz">Relatório X/Z</a>
          <a className="btn" href="/relatorios">Relatórios</a>
          <a className="btn" href="/admin/produtos">Admin → Produtos</a>
          <a className="btn" href="/configuracoes">Configurações</a>
          <button className="btn" onClick={testPrint}>Testar impressão mock</button>
        </div>
      </div>
    </div>
  )
}
