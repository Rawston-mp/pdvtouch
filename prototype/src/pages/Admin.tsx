// src/pages/Admin.tsx
import { Link } from 'react-router-dom'

import { useSession } from '../auth/session'

export default function Admin() {
  const { user, hasRole } = useSession()

  if (!hasRole('ADMIN') && !hasRole('GERENTE')) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Admin</h2>
        <p>Você não possui permissão para acessar esta área.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Admin</h2>

      <p style={{ opacity: .8, marginTop: 4 }}>
        Usuário: <b>{user?.name}</b> — Perfil: <b>{user?.role}</b>
      </p>

      <div style={{ marginTop: 16 }}>
        <h3>Cadastros & Configurações</h3>
        <ul style={{ lineHeight: 1.9 }}>
          <li>
            <Link to="/admin/produtos">Produtos</Link>
            <span style={{ opacity: .6 }}> — editar nome, preço/porkg, rota e código (leitor)</span>
          </li>
          <li>
            <Link to="/admin/usuarios">Usuários</Link>
            <span style={{ opacity: .6 }}> — perfis, PIN, ativação</span>
          </li>
          <li>
            <Link to="/configuracoes">Configurações</Link>
            <span style={{ opacity: .6 }}> — cabeçalho do cupom, impressoras/rotas, perfis de impressão</span>
          </li>
        </ul>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>Atalhos úteis</h3>
        <ul style={{ lineHeight: 1.9 }}>
          <li><Link to="/relatorioxz">Relatório X/Z</Link></li>
          <li><Link to="/turno">Turno (abertura/suprimento/sangria)</Link></li>
          <li><Link to="/sync">Sync</Link></li>
        </ul>
      </div>
    </div>
  )
}