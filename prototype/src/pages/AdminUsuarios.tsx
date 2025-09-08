// src/pages/AdminUsuarios.tsx
import { useEffect, useState } from 'react'
import { createUser, deleteUser, listUsers, updateUserPin } from '../db/users'
import type { Role } from '../db/models'

export default function AdminUsuarios() {
  const [users, setUsers] = useState<any[]>([])
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('BALANÇA')
  const [pin, setPin] = useState('')

  async function refresh() { setUsers(await listUsers()) }
  useEffect(() => { refresh() }, [])

  async function add() {
    if (!name || !pin) return alert('Preencha nome e PIN')
    await createUser(name, role, pin)
    setName(''); setPin(''); setRole('BALANÇA')
    await refresh()
  }

  async function changePin(id: number) {
    const n = prompt('Novo PIN:')
    if (!n) return
    await updateUserPin(id, n); await refresh()
  }

  async function remove(id: number) {
    if (!confirm('Remover usuário?')) return
    await deleteUser(id); await refresh()
  }

  return (
    <div style={{ padding:16 }}>
      <h2>Admin → Usuários</h2>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 180px 140px 120px', gap:8, margin: '12px 0' }}>
        <input placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} />
        <select value={role} onChange={e=>setRole(e.target.value as Role)}>
          <option value="BALANÇA">BALANÇA</option>
          <option value="CAIXA">CAIXA</option>
          <option value="GERENTE">GERENTE</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <input placeholder="PIN" value={pin} onChange={e=>setPin(e.target.value)} />
        <button onClick={add}>Adicionar</button>
      </div>

      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ textAlign:'left', borderBottom:'1px solid #eee' }}>
            <th style={{padding:8}}>ID</th><th style={{padding:8}}>Nome</th><th style={{padding:8}}>Perfil</th><th style={{padding:8}}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom:'1px solid #f4f4f4' }}>
              <td style={{padding:8}}>{u.id}</td>
              <td style={{padding:8}}>{u.name}</td>
              <td style={{padding:8}}>{u.role}</td>
              <td style={{padding:8, display:'flex', gap:8}}>
                <button onClick={() => changePin(u.id)}>Trocar PIN</button>
                <button onClick={() => remove(u.id)}>Remover</button>
              </td>
            </tr>
          ))}
          {users.length===0 && <tr><td style={{padding:8}} colSpan={4}><i>Nenhum usuário.</i></td></tr>}
        </tbody>
      </table>
    </div>
  )
}
