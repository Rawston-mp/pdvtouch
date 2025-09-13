// src/pages/Configuracoes.tsx
import React, { useEffect, useState } from "react"
import {
  getSettings, saveSettings,
  listPrinters, upsertPrinter, deletePrinter,
  setAllPrintersProfile,
} from "../db/settings"
import { db, type Destination, type Printer, type PrinterProfile, type Settings } from "../db"

const DESTS: Destination[] = ["CLIENTE", "COZINHA", "BAR"]
const PROFILES: PrinterProfile[] = ["ELGIN", "BEMATECH", "GENERICA"]

export default function Configuracoes() {
  const [cfg, setCfg] = useState<Settings | null>(null)
  const [printers, setPrinters] = useState<Printer[]>([])
  const [busy, setBusy] = useState(false)

  async function load() {
    const c = await getSettings()
    setCfg(c)
    setPrinters(await listPrinters())
  }

  useEffect(() => { load() }, [])

  async function onSaveSettings() {
    if (!cfg) return
    setBusy(true)
    await saveSettings(cfg)
    setBusy(false)
    alert("Configurações salvas.")
  }

  async function addPrinter() {
    const id = crypto.randomUUID()
    const p: Printer = {
      id, name: "Nova Impressora", destination: "CLIENTE", profile: "ELGIN"
    }
    await upsertPrinter(p)
    setPrinters(await listPrinters())
  }

  async function savePrinter(p: Printer) {
    await upsertPrinter(p)
    setPrinters(await listPrinters())
  }

  async function removePrinter(id: string) {
    if (!confirm("Remover impressora?")) return
    await deletePrinter(id)
    setPrinters(await listPrinters())
  }

  async function seedAll() {
    if (!confirm("Reaplicar seeds (config + impressoras + produtos)?")) return
    await db.delete()
    location.reload()
  }

  async function setProfileAll(profile: PrinterProfile) {
    await setAllPrintersProfile(profile)
    setPrinters(await listPrinters())
    alert(`Perfil de todas as impressoras: ${profile}`)
  }

  return (
    <div className="container">
      <h2>Configurações</h2>

      {cfg && (
        <div className="card">
          <h3 className="card-title">Cabeçalho do cupom</h3>
          <div className="grid grid-2">
            <div>
              <label>Nome da empresa</label>
              <input value={cfg.companyName} onChange={e => setCfg({ ...cfg, companyName: e.target.value })}/>
            </div>
            <div>
              <label>CNPJ</label>
              <input value={cfg.cnpj} onChange={e => setCfg({ ...cfg, cnpj: e.target.value })}/>
            </div>
            <div>
              <label>Endereço (linha 1)</label>
              <input value={cfg.addressLine1} onChange={e => setCfg({ ...cfg, addressLine1: e.target.value })}/>
            </div>
            <div>
              <label>Endereço (linha 2)</label>
              <input value={cfg.addressLine2} onChange={e => setCfg({ ...cfg, addressLine2: e.target.value })}/>
            </div>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button onClick={onSaveSettings} className="btn btn-primary" disabled={busy}>Salvar</button>
            <button onClick={seedAll} className="btn">Aplicar seed (reset)</button>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="card-title">Impressoras & Rotas</h3>
        <div className="row" style={{ gap: 8, marginBottom: 8 }}>
          <button className="btn" onClick={addPrinter}>Adicionar impressora</button>
          <span className="muted">Perfil de todas:</span>
          {["ELGIN", "BEMATECH", "GENERICA"].map((p) => (
            <button key={p} className="btn" onClick={() => setProfileAll(p as any)}>{p}</button>
          ))}
        </div>
        {!printers.length && <div className="muted">Nenhuma impressora cadastrada.</div>}
        {printers.map((p) => (
          <div key={p.id} className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
            <input
              value={p.name}
              onChange={e => savePrinter({ ...p, name: e.target.value })}
              style={{ width: 260 }}
            />
            <select value={p.destination} onChange={e => savePrinter({ ...p, destination: e.target.value as Destination })}>
              {DESTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={p.profile} onChange={e => savePrinter({ ...p, profile: e.target.value as PrinterProfile })}>
              {PROFILES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button className="btn" onClick={() => removePrinter(p.id)}>Remover</button>
          </div>
        ))}
      </div>
    </div>
  )
}
