// src/pages/AdminUsuarios.tsx
import { useEffect, useState } from 'react'
// import type { UserRole } from '../db/models'
import { mintSSO } from '../services/ssoClient'

type UserRow = { id: number | string; name: string; role: string }
export default function AdminUsuarios() {
  const [users, setUsers] = useState<UserRow[]>([])

  async function refresh() { 
    // TODO: implementar listUsers
    setUsers([]) 
  }
  useEffect(() => { refresh() }, [])

  // Edição e criação de usuários agora são feitas no Backoffice

  // async function changePin(id: number) { /* desabilitado no PDV */ }

  // async function remove(id: number) { /* desabilitado no PDV */ }

  return (
    <div style={{ padding:16 }}>
      <h2>Admin → Usuários</h2>
      <div className="pill" style={{ margin: '8px 0', background: '#fff8e1', borderColor: '#ffb300' }}>
        Gestão de usuários agora é feita no Backoffice. Use o botão abaixo para abrir Usuários no Backoffice.
      </div>
      <div style={{ margin: '12px 0' }}>
        <button className="btn btn-primary" onClick={() => mintSSO('/cadastro/usuarios')}>
          Abrir no Backoffice (Usuários)
        </button>
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
              <td style={{padding:8, display:'flex', gap:8, justifyContent:'flex-end'}}>
                <button className="btn" onClick={() => mintSSO('/cadastro/usuarios')}>Gerenciar no Backoffice</button>
              </td>
            </tr>
          ))}
          {users.length===0 && <tr><td style={{padding:8}} colSpan={4}><i>Nenhum usuário.</i></td></tr>}
        </tbody>
      </table>
    </div>
  )
}