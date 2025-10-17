// src/pages/Configuracoes.tsx
import React from 'react'
import { db, repairDefaultUsers } from '../db'
import { getLockTimings, setLockTimings } from '../lib/cartStorage'
import ConnectivityTest from '../components/ConnectivityTest'

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
  const [cleared, setCleared] = React.useState<string>('')
  const [repairMsg, setRepairMsg] = React.useState<string>('')

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

  function resetCartPositions() {
    try {
      const keys = Object.keys(localStorage)
      const toRemove = keys.filter((k) => k.startsWith('pdv.ui.cart.') || k === 'pdv.ui.resizableCart')
      toRemove.forEach((k) => localStorage.removeItem(k))
      setCleared(`Resetado (${toRemove.length})`)
      setTimeout(() => setCleared(''), 1200)
    } catch (err) { void err }
  }

  async function handleRepairUsers() {
    try {
      const { created, updated } = await repairDefaultUsers()
      setRepairMsg(`Feito. Criados: ${created} • Ajustados: ${updated}`)
      setTimeout(() => setRepairMsg(''), 2000)
    } catch (e) {
      console.error(e)
      setRepairMsg('Falha ao reparar usuários. Veja o console.')
      setTimeout(() => setRepairMsg(''), 3000)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Configurações</h2>
      
      <div className="card" style={{ maxWidth: 680 }}>
        <h3 className="card-title">Teste de Conectividade</h3>
        <p className="muted">Verifica o status das conexões essenciais do sistema (Internet, WebSocket, IndexedDB, etc).</p>
        <ConnectivityTest />
      </div>

      <div className="card" style={{ maxWidth: 680, marginTop: 16 }}>
        <h3 className="card-title">Dados locais</h3>
        <p className="muted">Apaga o banco IndexedDB (pdvtouch-proto) e chaves locais do prefixo "pdv.".</p>
        <button className="btn" onClick={handleClearAll}>Limpar dados locais</button>
      </div>

      <div className="card" style={{ maxWidth: 680, marginTop: 16 }}>
        <h3 className="card-title">UI do Carrinho</h3>
        <p className="muted">Redefine a posição/tamanho salvos do carrinho flutuante.</p>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <button className="btn" onClick={resetCartPositions}>Resetar posição do carrinho</button>
          {cleared && <span className="small" style={{ color: '#16a34a' }}>{cleared}</span>}
        </div>
      </div>

      <div className="card" style={{ maxWidth: 680, marginTop: 16 }}>
        <h3 className="card-title">Usuários padrão</h3>
        <p className="muted">Repara/cria usuários padrão com PINs conhecidos (não remove outros).</p>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <button className="btn" onClick={handleRepairUsers}>Reparar usuários padrão</button>
          {repairMsg && <span className="small" style={{ color: '#16a34a' }}>{repairMsg}</span>}
        </div>
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
    </div>
  )
}