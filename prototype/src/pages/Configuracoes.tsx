// src/pages/Configuracoes.tsx
import { useEffect, useState } from 'react'
import {
  getSettings, saveSettings, listPrinters,
  upsertPrinter, deletePrinter, setAllPrintersProfile
} from '../db/settings'
import type { Printer, Destination, PrinterProfile, Settings } from '../db/models'

const DESTS: Destination[] = ['CAIXA', 'COZINHA', 'BAR']
const PROFILES: PrinterProfile[] = ['GENERIC', 'ELGIN', 'BEMATECH']

export default function Configuracoes() {
  const [cfg, setCfg] = useState<Settings | null>(null)
  const [printers, setPrinters] = useState<Printer[]>([])
  const [form, setForm] = useState<Partial<Printer>>({ name: '', destination: 'CAIXA', profile: 'GENERIC' })
  const [editing, setEditing] = useState<Printer | null>(null)

  async function refresh() {
    setCfg(await getSettings())
    setPrinters(await listPrinters())
  }
  useEffect(() => { refresh() }, [])

  async function saveCfg() {
    if (!cfg) return
    await saveSettings(cfg)
    alert('Configurações salvas.')
  }

  async function submitPrinter(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) return alert('Nome da impressora é obrigatório.')
    await upsertPrinter({
      id: editing?.id,
      name: form.name as string,
      destination: form.destination as Destination,
      profile: form.profile as PrinterProfile
    })
    setForm({ name: '', destination: 'CAIXA', profile: 'GENERIC' })
    setEditing(null)
    await refresh()
  }

  function startEdit(p: Printer) {
    setEditing(p)
    setForm({ id: p.id, name: p.name, destination: p.destination, profile: p.profile })
  }

  function cancelEdit() {
    setEditing(null)
    setForm({ name: '', destination: 'CAIXA', profile: 'GENERIC' })
  }

  async function removePrinter(id?: number) {
    if (!id) return
    if (!confirm('Excluir impressora?')) return
    await deletePrinter(id)
    if (editing?.id === id) cancelEdit()
    await refresh()
  }

  async function allElgin() {
    await setAllPrintersProfile('ELGIN'); await refresh()
    alert('Todas as impressoras definidas como ELGIN.')
  }
  async function allGeneric() {
    await setAllPrintersProfile('GENERIC'); await refresh()
    alert('Todas as impressoras definidas como GENERIC.')
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Configurações</h2>

      {/* Empresa / cabeçalho */}
      {cfg && (
        <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <h3>Empresa / Cabeçalho</h3>
          <div style={row}>
            <label style={lbl}>Nome do estabelecimento</label>
            <input value={cfg.companyName} onChange={e => setCfg({ ...cfg, companyName: e.target.value })} style={inp} />
          </div>
          <div style={row}>
            <label style={lbl}>CNPJ</label>
            <input value={cfg.cnpj} onChange={e => setCfg({ ...cfg, cnpj: e.target.value })} style={inp} />
          </div>
          <div style={row}>
            <label style={lbl}>Endereço (linha 1)</label>
            <input value={cfg.addressLine1 ?? ''} onChange={e => setCfg({ ...cfg, addressLine1: e.target.value })} style={inp} />
          </div>
          <div style={row}>
            <label style={lbl}>Endereço (linha 2)</label>
            <input value={cfg.addressLine2 ?? ''} onChange={e => setCfg({ ...cfg, addressLine2: e.target.value })} style={inp} />
          </div>
          <button onClick={saveCfg} style={btnPrimary}>Salvar</button>
        </section>
      )}

      {/* Impressoras */}
      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
        <h3>Impressoras</h3>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={allElgin} style={btnLight}>Todas Elgin</button>
          <button onClick={allGeneric} style={btnLight}>Todas Genéricas</button>
        </div>

        <form onSubmit={submitPrinter} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto auto', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input placeholder="Nome visível (ex.: Caixa Principal, Cozinha Chapa)" value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} />
          <select value={form.destination as string} onChange={e => setForm({ ...form, destination: e.target.value as Destination })} style={inp}>
            {DESTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={form.profile as string} onChange={e => setForm({ ...form, profile: e.target.value as PrinterProfile })} style={inp}>
            {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button type="submit" style={btnPrimary}>{editing ? 'Salvar' : 'Adicionar'}</button>
          {editing && <button type="button" onClick={cancelEdit} style={btnLight}>Cancelar</button>}
        </form>

        {printers.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Nenhuma impressora cadastrada.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={th}>Nome (apelido)</th>
                <th style={th}>Destino</th>
                <th style={th}>Perfil</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {printers.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f4f4f4' }}>
                  <td style={td}>{p.name}</td>
                  <td style={td}>{p.destination}</td>
                  <td style={td}>{p.profile}</td>
                  <td style={td}>
                    <button onClick={() => startEdit(p)} style={btnLight}>Editar</button>{' '}
                    <button onClick={() => removePrinter(p.id)} style={btnDanger}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: 8, marginBottom: 8 }
const lbl: React.CSSProperties = { fontSize: 14, color: '#444' }
const inp: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }
const th: React.CSSProperties = { padding: 8 }
const td: React.CSSProperties = { padding: 8 }
const btnPrimary: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #0b5', background: '#0b5', color: '#fff', cursor: 'pointer' }
const btnLight: React.CSSProperties  = { padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }
const btnDanger: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #b00', background: '#fff0f0', color: '#b00', cursor: 'pointer' }
