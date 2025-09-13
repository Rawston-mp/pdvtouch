// src/pages/AdminUsuarios.tsx
import React, { useEffect, useMemo, useState } from "react"
import { listUsers, createUser, updateUserPin, setUserActive, deleteUser } from "../db/users"
import type { Role, User } from "../db"
import { useSession } from "../auth/session"

const ROLES: Array<{ value: Role; label: string }> = [
  { value: "ADMIN", label: "Administrador" },
  { value: "GERENTE", label: "Gerente" },
  { value: "CAIXA", label: "Caixa" },
  { value: "ATENDENTE", label: "Atendente" },
  { value: "BALANCA", label: "Balança" },
]

export default function AdminUsuarios() {
  const { hasRole } = useSession()
  const allowed = hasRole(["ADMIN", "GERENTE"])

  // Bloqueia acesso pela própria página (defesa extra além das rotas)
  if (!allowed) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ marginBottom: 8 }}>Acesso restrito</h2>
        <p>Você não possui permissão para acessar esta página.</p>
      </div>
    )
  }

  return <UsuariosInner />
}

function UsuariosInner() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")

  // Form: novo usuário
  const [name, setName] = useState("")
  const [role, setRole] = useState<Role>("ATENDENTE")
  const [pin, setPin] = useState("")

  // Modal: trocar PIN
  const [pinUser, setPinUser] = useState<User | null>(null)
  const [newPin, setNewPin] = useState("")

  async function refresh() {
    setLoading(true)
    const list = await listUsers()
    // Ordena: ativos primeiro, depois por nome
    list.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
    setUsers(list)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return users
    return users.filter(u =>
      u.name.toLowerCase().includes(t) ||
      u.role.toLowerCase().includes(t)
    )
  }, [users, q])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    const ok = validatePin(pin)
    if (!ok) {
      alert("PIN inválido. Use 4 a 6 dígitos.")
      return
    }
    await createUser({ name: name.trim(), role, pin: pin.trim(), active: true })
    setName("")
    setRole("ATENDENTE")
    setPin("")
    await refresh()
  }

  async function onToggleActive(u: User) {
    await setUserActive(u.id, !u.active)
    await refresh()
  }

  async function onDelete(u: User) {
    if (!confirm(`Excluir usuário "${u.name}"?`)) return
    await deleteUser(u.id)
    await refresh()
  }

  async function onSavePin() {
    if (!pinUser) return
    const ok = validatePin(newPin)
    if (!ok) {
      alert("PIN inválido. Use 4 a 6 dígitos.")
      return
    }
    await updateUserPin(pinUser.id, newPin.trim())
    setNewPin("")
    setPinUser(null)
    await refresh()
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 16 }}>Admin • Usuários</h2>

      {/* Busca */}
      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nome/role…"
          style={inputStyle}
        />
        <span style={{ opacity: 0.7, fontSize: 13 }}>
          {filtered.length} de {users.length} usuários
        </span>
      </div>

      {/* Form de criação */}
      <form onSubmit={onCreate} style={cardStyle}>
        <h3 style={{ margin: 0, marginBottom: 12 }}>Novo usuário</h3>
        <div style={grid2}>
          <div>
            <label style={lbl}>Nome</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={inputStyle}
              placeholder="Ex.: Maria"
            />
          </div>
          <div>
            <label style={lbl}>Perfil</label>
            <select value={role} onChange={e => setRole(e.target.value as Role)} style={inputStyle}>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>PIN (4–6 dígitos)</label>
            <input
              value={pin}
              onChange={e => setPin(e.target.value)}
              style={inputStyle}
              inputMode="numeric"
              pattern="[0-9]{4,6}"
              placeholder="Ex.: 1234"
              required
            />
          </div>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button type="submit" style={btnPrimary}>Criar usuário</button>
          </div>
        </div>
      </form>

      {/* Tabela */}
      <div style={{ ...cardStyle, paddingTop: 8 }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Nome</th>
              <th style={th}>Perfil</th>
              <th style={th}>Status</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={td}>Carregando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} style={td}>Nenhum usuário encontrado.</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id}>
                <td style={td}>{u.name}</td>
                <td style={td}>{roleLabel(u.role)}</td>
                <td style={td}>
                  <StatusBadge active={u.active} />
                </td>
                <td style={{ ...td, textAlign: "right" }}>
                  <button style={btnGhost} onClick={() => setPinUser(u)}>Definir PIN</button>
                  <button style={btnGhost} onClick={() => onToggleActive(u)}>
                    {u.active ? "Desativar" : "Ativar"}
                  </button>
                  <button style={btnDanger} onClick={() => onDelete(u)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal PIN */}
      {pinUser && (
        <div style={modalOverlay} onClick={() => setPinUser(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>
              Definir novo PIN — <span style={{ opacity: 0.8 }}>{pinUser.name}</span>
            </h3>
            <input
              value={newPin}
              onChange={e => setNewPin(e.target.value)}
              style={inputStyle}
              inputMode="numeric"
              autoFocus
              placeholder="Digite o novo PIN (4–6 dígitos)"
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button style={btnGhost} onClick={() => setPinUser(null)}>Cancelar</button>
              <button style={btnPrimary} onClick={onSavePin}>Salvar PIN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- UI helpers ---------- */

function roleLabel(r: Role) {
  return ROLES.find(x => x.value === r)?.label ?? r
}

function validatePin(p: string) {
  return /^[0-9]{4,6}$/.test(p.trim())
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 12,
      background: active ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)",
      color: active ? "rgb(16,185,129)" : "rgb(239,68,68)",
      border: `1px solid ${active ? "rgba(16,185,129,.35)" : "rgba(239,68,68,.35)"}`,
    }}>
      {active ? "Ativo" : "Inativo"}
    </span>
  )
}

/* ---------- estilos inline simples (dark claro) ---------- */
const cardStyle: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  boxShadow: "0 8px 24px rgba(0,0,0,.25)",
  color: "#e5e7eb",
}

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 240px 200px 160px",
  gap: 12,
}

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  marginBottom: 4,
  opacity: .8,
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0b1220",
  color: "#e5e7eb",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
}

const btnPrimary: React.CSSProperties = {
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
}

const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: "#cbd5e1",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  marginLeft: 6,
}

const btnDanger: React.CSSProperties = {
  background: "transparent",
  color: "#ef4444",
  border: "1px solid rgba(239,68,68,.5)",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  marginLeft: 6,
}

const table: React.CSSProperties = {
  borderCollapse: "separate",
  borderSpacing: 0,
  width: "100%",
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 600,
  color: "#cbd5e1",
  borderBottom: "1px solid #1f2937",
}

const td: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #1f2937",
  color: "#e5e7eb",
}

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
}

const modal: React.CSSProperties = {
  width: 420,
  maxWidth: "90vw",
  background: "#0b1220",
  color: "#e5e7eb",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 16,
}
