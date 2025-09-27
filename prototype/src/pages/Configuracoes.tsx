// src/pages/Configuracoes.tsx
import { db } from '../db'

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
  } catch {}
}

export default function Configuracoes() {
  async function handleClearAll() {
    const ok = confirm('Isso irá limpar dados locais (IndexedDB e LocalStorage). Deseja continuar?')
    if (!ok) return
    try {
      // Fecha conexões abertas do Dexie antes de apagar
      try { db.close() } catch {}
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
    </div>
  )
}