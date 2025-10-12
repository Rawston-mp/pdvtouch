// src/pages/AdminUsuarios.tsx
import { useCallback, useEffect, useState } from 'react'
import type { Role, User } from '../db'
import { listUsers, createUser, updateUserPin, deleteUser, setUserActive } from '../db/users'
import { useToast } from '../hooks/useToast'

export default function AdminUsuarios() {
  const [users, setUsers] = useState<User[]>([])
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('CAIXA')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const refresh = useCallback(async () => { 
    try {
      const userList = await listUsers()
      setUsers(userList)
    } catch (e) {
      toast.error('Erro', 'Falha ao carregar usuários')
      console.error(e)
    }
  }, [toast])
  
  useEffect(() => { refresh() }, [refresh])

  async function criar() {
    if (!name || !pin) {
      toast.warning('Dados incompletos', 'Preencha nome e PIN')
      return
    }
    if (pin.length < 4) {
      toast.warning('PIN inválido', 'PIN deve ter pelo menos 4 dígitos')
      return
    }
    
    try {
      setLoading(true)
      await createUser({ name, role, pin })
      await refresh()
      setName('')
      setPin('')
      setRole('CAIXA')
      toast.success('Sucesso', `Usuário ${name} criado com sucesso!`)
    } catch (e) {
      toast.error('Erro', 'Erro ao criar usuário: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function alterarPin(u: User) {
    const newPin = prompt('Novo PIN (mínimo 4 dígitos):')
    if (!newPin) return
    if (newPin.length < 4) {
      toast.warning('PIN inválido', 'PIN deve ter pelo menos 4 dígitos')
      return
    }
    
    try {
      setLoading(true)
      await updateUserPin(u.id, newPin)
      await refresh()
      toast.success('Sucesso', `PIN do usuário ${u.name} alterado com sucesso!`)
    } catch (e) {
      toast.error('Erro', 'Erro ao alterar PIN: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function excluir(u: User) {
    if (!confirm(`Remover usuário "${u.name}"? Esta ação não pode ser desfeita.`)) return
    
    try {
      setLoading(true)
      await deleteUser(u.id)
      await refresh()
      toast.success('Sucesso', `Usuário ${u.name} removido com sucesso!`)
    } catch (e) {
      toast.error('Erro', 'Erro ao remover usuário: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(u: User) {
    try {
      setLoading(true)
      await setUserActive(u.id, !u.active)
      await refresh()
      toast.success('Sucesso', `Usuário ${u.name} ${!u.active ? 'ativado' : 'desativado'}`)
    } catch (e) {
      toast.error('Erro', 'Erro ao alterar status: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Admin → Usuários</h2>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Adicionar Usuário</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 180px 140px 120px', gap:12, alignItems:'end' }}>
          <div>
            <label className="small muted">Nome</label>
            <input 
              placeholder="Nome do usuário" 
              value={name} 
              onChange={e=>setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="small muted">Perfil</label>
            <select 
              value={role} 
              onChange={e=>setRole(e.target.value as Role)}
              disabled={loading}
            >
              <option value="CAIXA">CAIXA</option>
              <option value="ATENDENTE">ATENDENTE</option>
              <option value="BALANÇA A">BALANÇA A</option>
              <option value="BALANÇA B">BALANÇA B</option>
              <option value="GERENTE">GERENTE</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div>
            <label className="small muted">PIN</label>
            <input 
              type="password" 
              placeholder="PIN (4+ dígitos)" 
              value={pin} 
              onChange={e=>setPin(e.target.value)}
              disabled={loading}
            />
          </div>
          <button 
            onClick={criar} 
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Criando...' : 'Adicionar'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Usuários Cadastrados ({users.length})</h3>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ textAlign:'left', borderBottom:'2px solid #eee' }}>
              <th style={{padding:12}}>Nome</th>
              <th style={{padding:12}}>Perfil</th>
              <th style={{padding:12}}>Status</th>
              <th style={{padding:12}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom:'1px solid #f4f4f4' }}>
                <td style={{padding:12}}>
                  <strong>{u.name}</strong>
                  <div className="small muted">{u.id}</div>
                </td>
                <td style={{padding:12}}>
                  <span className="pill small">{u.role}</span>
                </td>
                <td style={{padding:12}}>
                  <span className={`pill small ${u.active ? 'success' : 'muted'}`}>
                    {u.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{padding:12}}>
                  <div style={{display:'flex', gap:8}}>
                    <button 
                      onClick={() => alterarPin(u)} 
                      disabled={loading}
                      className="btn small"
                    >
                      Trocar PIN
                    </button>
                    <button 
                      onClick={() => toggleActive(u)} 
                      disabled={loading}
                      className={`btn small ${u.active ? 'btn-warning' : 'btn-success'}`}
                    >
                      {u.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button 
                      onClick={() => excluir(u)} 
                      disabled={loading}
                      className="btn small btn-danger"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length===0 && (
              <tr>
                <td style={{padding:20, textAlign:'center'}} colSpan={4}>
                  <div className="muted">Nenhum usuário cadastrado</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}