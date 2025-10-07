// src/pages/Configuracoes.tsx
import React from 'react'
import { db } from '../db'
import { getLockTimings, setLockTimings } from '../lib/cartStorage'

async function clearIndexedDB(databaseName?: string) {
  return new Promise<void>((resolve) => {
    try {
      if (!('indexedDB' in window)) return resolve()
      if (databaseName) {
        const req = indexedDB.deleteDatabase(databaseName)
        req.onsuccess = () => resolve()
        req.onerror = () => resolve()
        req.onblocked = () => resolve()
      } else {
        // fallback: best effort para bancos conhecidos
        const req = indexedDB.deleteDatabase('pdvtouch-proto')
        req.onsuccess = () => resolve()
        req.onerror = () => resolve()
        req.onblocked = () => resolve()
      }
    } catch {
      resolve()
    }
  })
}

function clearLocalData() {
  try {
    // Remove chaves conhecidas
    Object.keys(localStorage)
      .filter((k) => k.startsWith('pdv.'))
      .forEach((k) => localStorage.removeItem(k))
  } catch (err) { void err }
}

export default function Configuracoes() {
  const [ttlMs, setTtlMs] = React.useState<number>(getLockTimings().ttlMs)
  const [hbMs, setHbMs] = React.useState<number>(getLockTimings().heartbeatMs)
  const [saved, setSaved] = React.useState<string>('')
  // Integração Backoffice / PDV
  const [backofficeUrl, setBackofficeUrl] = React.useState<string>('')
  const [devPath, setDevPath] = React.useState<string>('')
  const [integrationSaved, setIntegrationSaved] = React.useState<string>('')
  const defaultDevPath = '\\\\wsl.localhost\\Ubuntu-20.04\\home\\rawston\\pdvtouch'

  React.useEffect(() => {
    // Carrega valores previamente salvos
    try {
      const bo = localStorage.getItem('pdv.backofficeBaseUrl') || ''
      if (bo) setBackofficeUrl(bo)
      const path = localStorage.getItem('pdv.devPath') || ''
      if (path) setDevPath(path)
      else setDevPath(defaultDevPath)
    } catch (err) { void err }
  }, [])

  function saveIntegration() {
    try {
      const trimmed = (backofficeUrl || '').trim()
      if (trimmed) {
        localStorage.setItem('pdv.backofficeBaseUrl', trimmed)
      } else {
        localStorage.removeItem('pdv.backofficeBaseUrl')
      }
      if (devPath.trim()) {
        localStorage.setItem('pdv.devPath', devPath.trim())
      } else {
        localStorage.removeItem('pdv.devPath')
      }
      setIntegrationSaved('Salvo!')
      setTimeout(() => setIntegrationSaved(''), 1500)
    } catch (err) {
      void err
      alert('Falha ao salvar integração')
    }
  }

  function openBackoffice(path: string) {
    const base = (backofficeUrl || '').trim()
    if (!base) return alert('Defina a URL do Backoffice primeiro.')
    const href = base.replace(/\/$/, '') + path
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  function copyDevPath() {
    if (!devPath) return
    try {
      navigator.clipboard.writeText(devPath)
      setIntegrationSaved('Copiado!')
      setTimeout(() => setIntegrationSaved(''), 1200)
    } catch (err) {
      void err
      alert('Não foi possível copiar.')
    }
  }

  function saveLockTimings() {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0 || !Number.isFinite(hbMs) || hbMs <= 0) {
      alert('Valores inválidos. Use números positivos (ms).')
      return
    }
    if (ttlMs <= hbMs) {
      alert('TTL deve ser maior que o Heartbeat.')
      return
    }
    setLockTimings({ ttlMs, heartbeatMs: hbMs })
    setSaved('Salvo!')
    setTimeout(() => setSaved(''), 1200)
  }

  function restoreDefaults() {
    // remove chaves para voltar aos defaults do app/env
    try { localStorage.removeItem('pdv.lock.ttlMs') } catch (err) { void err }
    try { localStorage.removeItem('pdv.lock.heartbeatMs') } catch (err) { void err }
    const curr = getLockTimings()
    setTtlMs(curr.ttlMs)
    setHbMs(curr.heartbeatMs)
  }
  async function handleClearAll() {
    const ok = confirm('Isso irá limpar dados locais (IndexedDB e LocalStorage). Deseja continuar?')
    if (!ok) return
    try {
      // Fecha conexões abertas do Dexie antes de apagar
  try { db.close() } catch (err) { void err }
      await clearIndexedDB('pdvtouch-proto')
      clearLocalData()
      alert('Dados locais limpos. A página será recarregada.')
      window.location.reload()
    } catch (e) {
      console.error(e)
      alert('Falha ao limpar dados locais. Veja o console para detalhes.')
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Configurações</h2>
      <div className="card" style={{ maxWidth: 680 }}>
        <h3 className="card-title">Dados locais</h3>
        <p className="muted">Apaga o banco IndexedDB (pdvtouch-proto) e chaves locais do prefixo “pdv.”.</p>
        <button className="btn" onClick={handleClearAll}>Limpar dados locais</button>
      </div>

      <div className="card" style={{ maxWidth: 680, marginTop: 16 }}>
        <h3 className="card-title">Locks de comanda</h3>
        <p className="muted">Ajuste fino do TTL (tempo de vida) e do heartbeat (renovação periódica) dos locks.</p>
        <div className="row" style={{ gap: 8 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            TTL (ms)
            <input
              type="number"
              value={ttlMs}
              onChange={(e) => setTtlMs(Number(e.target.value))}
              min={1000}
              step={500}
              style={{ width: 160, textAlign: 'right' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            Heartbeat (ms)
            <input
              type="number"
              value={hbMs}
              onChange={(e) => setHbMs(Number(e.target.value))}
              min={500}
              step={500}
              style={{ width: 160, textAlign: 'right' }}
            />
          </label>
          <div style={{ alignSelf: 'end', display: 'flex', gap: 8 }}>
            <button className="btn" onClick={saveLockTimings}>Salvar</button>
            <button onClick={restoreDefaults}>Restaurar padrão</button>
            {saved && <span className="small" style={{ color: '#16a34a', alignSelf: 'center' }}>{saved}</span>}
          </div>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          Atual: TTL {getLockTimings().ttlMs} ms • Heartbeat {getLockTimings().heartbeatMs} ms
        </p>
      </div>

      <div className="card" style={{ maxWidth: 680, marginTop: 16 }}>
        <h3 className="card-title">Integração Backoffice / Desenvolvimento</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Configure a URL do Backoffice (AtendeTouch) para que atalhos e SSO funcionem. O caminho de desenvolvimento
          (Windows/WSL) é apenas um lembrete rápido para abrir ou copiar o diretório compartilhado local.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            URL do Backoffice
            <input
              placeholder="http://localhost:5174"
              value={backofficeUrl}
              onChange={(e) => setBackofficeUrl(e.target.value)}
              style={{ width: '100%' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            Caminho do Projeto PDV (WSL/Windows)
            <input
              value={devPath}
              onChange={(e) => setDevPath(e.target.value)}
              placeholder={defaultDevPath}
              style={{ width: '100%' }}
            />
          </label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={saveIntegration}>Salvar integração</button>
            <button onClick={() => openBackoffice('')}>Abrir Backoffice (Home)</button>
            <button onClick={() => openBackoffice('/cadastro/produtos')}>Abrir Backoffice (Produtos)</button>
            <button onClick={() => openBackoffice('/estoque')}>Abrir Backoffice (Estoque)</button>
            <button onClick={copyDevPath}>Copiar caminho PDV</button>
            {integrationSaved && <span className="small" style={{ color: '#16a34a', alignSelf: 'center' }}>{integrationSaved}</span>}
          </div>
          <div className="muted small">
            Status: {backofficeUrl.trim() ? <span style={{ color: '#16a34a' }}>Configurado</span> : 'Não configurado'}
            {backofficeUrl.trim() && ' • Atalhos de SSO no Admin usarão esta URL.'}
          </div>
        </div>
      </div>
    </div>
  )
}