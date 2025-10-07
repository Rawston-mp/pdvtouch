// src/pages/Sync.tsx
import React from 'react'
import { db } from '../db'
import { toCSV } from '../lib/csv'
import { listSales } from '../db/sales'
import { syncProdutosFromBackoffice } from '../services/syncClient'
import { purgeLocalCatalog } from '../sync/catalogSync'
import type { User, Product as PDVProduct, ShiftSummary, Sale } from '../db'

type Counts = {
  settings: number
  printers: number
  products: number
  users: number
  sales: number
  shifts: number
}

export default function Sync() {
  const [counts, setCounts] = React.useState<Counts | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<string>('')
  const [startDate, setStartDate] = React.useState<string>(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = React.useState<string>(() => new Date().toISOString().slice(0, 10))

  async function refresh() {
    try {
      setBusy(true)
      await db.open()
      const [settings, printers, products, users, sales, shifts] = await Promise.all([
        db.settings.count(),
        db.printers.count(),
        db.products.count(),
        db.users.count(),
        db.sales.count(),
        db.shifts.count(),
      ])
      setCounts({ settings, printers, products, users, sales, shifts })
    } catch (e) {
      console.error(e)
      setMsg('Falha ao carregar contagens do banco.')
    } finally {
      setBusy(false)
    }
  }

  React.useEffect(() => {
    refresh()
  }, [])

  async function handleExport() {
    try {
      setBusy(true)
      setMsg('')
      const payload = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        settings: await db.settings.toArray(),
        printers: await db.printers.toArray(),
        products: await db.products.toArray(),
        users: await db.users.toArray(),
        sales: await db.sales.toArray(),
        shifts: await db.shifts.toArray(),
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pdvtouch-backup-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMsg('Backup gerado para download.')
    } catch (e) {
      console.error(e)
      setMsg('Erro ao gerar backup.')
    } finally {
      setBusy(false)
    }
  }

  async function handleImport(file: File) {
    try {
      setBusy(true)
      setMsg('')
      const text = await file.text()
      const data = JSON.parse(text)
      // Checagem simples de versão de schema
      if (data && typeof data === 'object') {
        if (data.schemaVersion != null && data.schemaVersion !== 1) {
          const cont = window.confirm(
            `schemaVersion ${data.schemaVersion} diferente do esperado (1). Continuar mesmo assim?`
          )
          if (!cont) return
        }
      }

      const ok = window.confirm('Importar este backup e substituir os dados locais? Esta ação não pode ser desfeita.')
      if (!ok) return

  await db.transaction('rw', [db.settings, db.printers, db.products, db.users, db.sales, db.shifts], async () => {
        await Promise.all([
          db.settings.clear(),
          db.printers.clear(),
          db.products.clear(),
          db.users.clear(),
          db.sales.clear(),
          db.shifts.clear(),
        ])

        if (Array.isArray(data.settings)) await db.settings.bulkPut(data.settings)
        if (Array.isArray(data.printers)) await db.printers.bulkPut(data.printers)
        if (Array.isArray(data.products)) await db.products.bulkPut(data.products)
        if (Array.isArray(data.users)) await db.users.bulkPut(data.users)
        if (Array.isArray(data.sales)) await db.sales.bulkPut(data.sales)
        if (Array.isArray(data.shifts)) await db.shifts.bulkPut(data.shifts)
      })

      setMsg('Importação concluída. Os dados locais foram substituídos.')
      await refresh()
    } catch (e) {
      console.error(e)
      setMsg('Falha ao importar backup. Verifique o arquivo selecionado.')
    } finally {
      setBusy(false)
    }
  }

  function exportBlob(name: string, payload: unknown) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportOnlyProducts() {
    try {
      setBusy(true)
      setMsg('')
      const products = await db.products.toArray()
      // Exporta JSON e CSV (dois botões? por ora, JSON)
      exportBlob(`pdvtouch-products-${new Date().toISOString().slice(0, 10)}.json`, { products })
      setMsg('Exportação de produtos (JSON) gerada.')
    } catch (e) {
      console.error(e)
      setMsg('Falha ao exportar produtos.')
    } finally {
      setBusy(false)
    }
  }

  async function syncProdutosBackoffice() {
    try {
      setBusy(true)
      setMsg('')
      const base = localStorage.getItem('pdv.backofficeBaseUrl')
      if (!base) {
        setMsg('Backoffice não configurado. Defina em Admin > Integração Backoffice (SSO).')
        return
      }
      const res = await syncProdutosFromBackoffice(base)
      setMsg(`Sync concluído: ${res.inserted} produto(s) importado(s)/atualizado(s).`)
      await refresh()
    } catch (e) {
      console.error(e)
      setMsg('Falha ao sincronizar produtos do Backoffice.')
    } finally {
      setBusy(false)
    }
  }

  async function purgeCatalog() {
    const ok = window.confirm('Limpar completamente o catálogo local? (Somente produtos)')
    if (!ok) return
    try {
      setBusy(true)
      await purgeLocalCatalog()
      setMsg('Catálogo local limpo. Faça um sync para repovoar.')
      await refresh()
    } catch (e) {
      console.error(e)
      setMsg('Falha ao limpar catálogo.')
    } finally {
      setBusy(false)
    }
  }

  async function exportOnlyUsers() {
    try {
      setBusy(true)
      setMsg('')
      const users = await db.users.toArray()
      exportBlob(`pdvtouch-users-${new Date().toISOString().slice(0, 10)}.json`, { users })
      setMsg('Exportação de usuários gerada.')
    } catch (e) {
      console.error(e)
      setMsg('Falha ao exportar usuários.')
    } finally {
      setBusy(false)
    }
  }

  async function exportUsersCSV() {
    try {
      setBusy(true)
      setMsg('')
      const users = await db.users.toArray() as User[]
      const cols = ['id', 'name', 'role', 'active', 'pinHash']
      const rows = users.map((u: User) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        active: u.active ? 'true' : 'false',
        pinHash: u.pinHash || '',
      }))
      const csv = toCSV(rows, cols)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pdvtouch-users-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setMsg('Exportação de usuários (CSV) gerada.')
    } catch (e) {
      console.error(e)
      setMsg('Falha ao exportar usuários em CSV.')
    } finally {
      setBusy(false)
    }
  }

  async function exportProductsCSV() {
    try {
      setBusy(true)
      setMsg('')
      const products = await db.products.toArray() as PDVProduct[]
      const cols = ['id', 'name', 'category', 'byWeight', 'price', 'pricePerKg', 'code', 'active']
      const rows = products.map((p: PDVProduct) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        byWeight: p.byWeight ? 'true' : 'false',
        price: String(p.price ?? 0),
        pricePerKg: String(p.pricePerKg ?? 0),
        code: p.code ?? '',
        active: p.active ? 'true' : 'false',
      }))
      const csv = toCSV(rows, cols)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pdvtouch-products-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setMsg('Exportação de produtos (CSV) gerada.')
    } catch (e) {
      console.error(e)
      setMsg('Falha ao exportar produtos em CSV.')
    } finally {
      setBusy(false)
    }
  }

  async function exportSalesByPeriod() {
    try {
      setBusy(true)
      setMsg('')
      if (!startDate || !endDate) {
        setMsg('Informe as duas datas para exportar vendas por período.')
        return
      }
      const start = new Date(`${startDate}T00:00:00.000`)
      const end = new Date(`${endDate}T23:59:59.999`)
      if (end < start) {
        setMsg('Período inválido: data final menor que a inicial.')
        return
      }
      const sales = await listSales(start, end)
      exportBlob(
        `pdvtouch-sales-${startDate.replace(/-/g, '')}-${endDate.replace(/-/g, '')}.json`,
        { startDate, endDate, count: sales.length, sales }
      )
      setMsg(`Exportação de vendas (${sales.length}) gerada.`)
    } catch (e) {
      console.error(e)
      setMsg('Falha ao exportar vendas do período.')
    } finally {
      setBusy(false)
    }
  }

  async function exportShiftsByPeriod() {
    try {
      setBusy(true)
      setMsg('')
      if (!startDate || !endDate) {
        setMsg('Informe as duas datas para exportar turnos por período.')
        return
      }
      const start = new Date(`${startDate}T00:00:00.000`)
      const end = new Date(`${endDate}T23:59:59.999`)
      if (end < start) {
        setMsg('Período inválido: data final menor que a inicial.')
        return
      }
      // Como não há listagem por período pronta para shifts, faremos um filtro manual
  const all = await db.shifts.toArray() as ShiftSummary[]
  const filtered = all.filter((s) => s.startTime >= start.getTime() && s.startTime <= end.getTime())
      exportBlob(
        `pdvtouch-shifts-${startDate.replace(/-/g, '')}-${endDate.replace(/-/g, '')}.json`,
        { startDate, endDate, count: filtered.length, shifts: filtered }
      )
      setMsg(`Exportação de turnos (${filtered.length}) gerada.`)
    } catch (e) {
      console.error(e)
      setMsg('Falha ao exportar turnos do período.')
    } finally {
      setBusy(false)
    }
  }

  async function importSalesFromFile(file: File) {
    try {
      setBusy(true)
      setMsg('')
  const text = await file.text()
  const data = JSON.parse(text)
  const sales: Sale[] = Array.isArray(data) ? (data as Sale[]) : Array.isArray(data?.sales) ? (data.sales as Sale[]) : []
      if (!sales.length) {
        setMsg('Arquivo inválido: não há vendas para importar.')
        return
      }
      const ok = window.confirm(`Importar/mesclar ${sales.length} vendas no banco local?`)
      if (!ok) return

      // Mescla simples: evita duplicar pela combinação (timestamp,userId,orderId,total)
  const existing = await db.sales.toArray() as Sale[]
  const setKey = new Set(existing.map((s) => `${s.timestamp}|${s.userId}|${s.orderId}|${s.total}`))
      const toInsert = sales.filter((s) => !setKey.has(`${s.timestamp}|${s.userId}|${s.orderId}|${s.total}`))
      if (toInsert.length) await db.sales.bulkAdd(toInsert)
      setMsg(`Importação concluída. Novas vendas inseridas: ${toInsert.length} (de ${sales.length}).`)
      await refresh()
    } catch (e) {
      console.error(e)
      setMsg('Falha ao importar vendas.')
    } finally {
      setBusy(false)
    }
  }

  async function importShiftsFromFile(file: File) {
    try {
      setBusy(true)
      setMsg('')
  const text = await file.text()
  const data = JSON.parse(text)
  const shifts: ShiftSummary[] = Array.isArray(data) ? (data as ShiftSummary[]) : Array.isArray(data?.shifts) ? (data.shifts as ShiftSummary[]) : []
      if (!shifts.length) {
        setMsg('Arquivo inválido: não há turnos para importar.')
        return
      }
      const ok = window.confirm(`Importar/mesclar ${shifts.length} turnos no banco local?`)
      if (!ok) return

      const existing = await db.shifts.toArray() as ShiftSummary[]
      const key = (s: ShiftSummary) => `${s.userId}|${s.startTime}`
      const existingKeys = new Set(existing.map(key))
      const toInsert = shifts
        .filter((s) => !existingKeys.has(key(s)))
        .map((s) => {
          const { id: _id, ...rest } = s
          void _id
          return rest
        })
      if (toInsert.length) await db.shifts.bulkAdd(toInsert)
      setMsg(`Importação de turnos concluída. Novos: ${toInsert.length} (de ${shifts.length}).`)
      await refresh()
    } catch (e) {
      console.error(e)
      setMsg('Falha ao importar turnos.')
    } finally {
      setBusy(false)
    }
  }

  async function importOnlyProducts(file: File) {
    try {
      setBusy(true)
      setMsg('')
      const text = await file.text()
      const data = JSON.parse(text)
      const list = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : []
      if (!Array.isArray(list) || list.length === 0) {
        setMsg('Arquivo inválido: não há produtos para importar.')
        return
      }
      const ok = window.confirm(`Importar/atualizar ${list.length} produtos?`)
      if (!ok) return
      await db.products.bulkPut(list)
      setMsg(`Produtos importados/atualizados: ${list.length}.`)
      await refresh()
    } catch (e) {
      console.error(e)
      setMsg('Falha ao importar produtos.')
    } finally {
      setBusy(false)
    }
  }

  async function importOnlyUsers(file: File) {
    try {
      setBusy(true)
      setMsg('')
      const text = await file.text()
      const data = JSON.parse(text)
      const list = Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : []
      if (!Array.isArray(list) || list.length === 0) {
        setMsg('Arquivo inválido: não há usuários para importar.')
        return
      }
      const ok = window.confirm(`Importar/atualizar ${list.length} usuários?`)
      if (!ok) return
      await db.users.bulkPut(list)
      setMsg(`Usuários importados/atualizados: ${list.length}.`)
      await refresh()
    } catch (e) {
      console.error(e)
      setMsg('Falha ao importar usuários.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container">
      <h2>Sincronização</h2>

      {msg && (
        <div className="card" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
          <div>{msg}</div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Diagnóstico</h3>
          <button className="btn" onClick={refresh} disabled={busy}>Atualizar</button>
        </div>
        {!counts ? (
          <div className="muted">Carregando…</div>
        ) : (
          <div className="grid grid-3">
            <div>
              <div className="small muted">Settings</div>
              <div>{counts.settings}</div>
            </div>
            <div>
              <div className="small muted">Impressoras</div>
              <div>{counts.printers}</div>
            </div>
            <div>
              <div className="small muted">Produtos</div>
              <div>{counts.products}</div>
            </div>
            <div>
              <div className="small muted">Usuários</div>
              <div>{counts.users}</div>
            </div>
            <div>
              <div className="small muted">Vendas</div>
              <div>{counts.sales}</div>
            </div>
            <div>
              <div className="small muted">Turnos</div>
              <div>{counts.shifts}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 className="card-title">Backup e Restauração</h3>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-primary" onClick={handleExport} disabled={busy}>Exportar backup (.json)</button>
          <label className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImport(f)
                e.currentTarget.value = ''
              }}
            />
            Importar backup (.json)
          </label>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          Observação: a importação substitui todos os dados locais (settings, impressoras, produtos, usuários, vendas e turnos).
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 className="card-title">Exportações rápidas</h3>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-primary" onClick={syncProdutosBackoffice} disabled={busy}>Sync produtos do Backoffice</button>
          <button className="btn" onClick={purgeCatalog} disabled={busy}>Limpar catálogo local</button>
          <button className="btn" onClick={exportOnlyProducts} disabled={busy}>Exportar produtos (JSON)</button>
          <button className="btn" onClick={exportProductsCSV} disabled={busy}>Exportar produtos (CSV)</button>
          <button className="btn" onClick={exportOnlyUsers} disabled={busy}>Exportar usuários (JSON)</button>
          <button className="btn" onClick={exportUsersCSV} disabled={busy}>Exportar usuários (CSV)</button>
          <label className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importOnlyProducts(f)
                e.currentTarget.value = ''
              }}
            />
            Importar produtos (.json)
          </label>
          <label className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importOnlyUsers(f)
                e.currentTarget.value = ''
              }}
            />
            Importar usuários (.json)
          </label>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 className="card-title">Exportar vendas por período</h3>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <div>
            <div className="small muted">Início</div>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <div className="small muted">Fim</div>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={exportSalesByPeriod} disabled={busy}>Exportar vendas</button>
          <button className="btn" onClick={exportShiftsByPeriod} disabled={busy}>Exportar turnos</button>
          <label className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importSalesFromFile(f)
                e.currentTarget.value = ''
              }}
            />
            Importar vendas (.json)
          </label>
          <label className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importShiftsFromFile(f)
                e.currentTarget.value = ''
              }}
            />
            Importar turnos (.json)
          </label>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Sincronização com servidor (demo)</h3>
        <p className="muted">
          Nesta demo local não há servidor remoto configurado. Use o backup para transferir dados entre máquinas.
        </p>
      </div>
    </div>
  )
}