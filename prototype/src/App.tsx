// src/App.tsx
import { NavLink, Routes, Route } from 'react-router-dom'
import { SessionProvider, useSession } from './auth/session'
import VendaRapida from './pages/VendaRapida'
import VendaBalanca from './pages/VendaBalanca'
import Finalizacao from './pages/Finalizacao'
import Impressao from './pages/Impressao'
import Relatorios from './pages/Relatorios'
import RelatorioXZ from './pages/RelatorioXZ'
import Admin from './pages/Admin'
import Configuracoes from './pages/Configuracoes'
import Sync from './pages/Sync'
import Turno from './pages/Turno'
import LoginPin from './components/LoginPin'
import AdminUsuarios from './pages/AdminUsuarios'
import AdminAuditoria from './pages/AdminAuditoria'

export default function App() {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  )
}

function Shell() {
  const { user, logout, hasRole } = useSession()
  const needLogin = user == null
  const isBalanca = user?.role === 'BALANÇA'

  return (
    <div>
      <nav style={{ display: 'flex', gap: 16, padding: 12, borderBottom: '1px solid #eee', alignItems:'center' }}>
        <b>PDVTouch (Protótipo)</b>

        <NavLink to="/venda">Venda</NavLink>

        {!isBalanca && <>
          <NavLink to="/finalizacao">Finalização</NavLink>
          <NavLink to="/impressao">Impressão</NavLink>
          <NavLink to="/relatorios">Relatórios</NavLink>
          <NavLink to="/relatorio-xz">Relatório X/Z</NavLink>
          <NavLink to="/turno">Turno</NavLink>
          <NavLink to="/sync">Sync</NavLink>
        </>}

        {hasRole('GERENTE') && <NavLink to="/config">Configurações</NavLink>}
        {hasRole('ADMIN') && <>
          <NavLink to="/admin">Admin</NavLink>
          <NavLink to="/admin-usuarios">Usuários</NavLink>
          <NavLink to="/admin-auditoria">Auditoria</NavLink>
        </>}

        <div style={{ marginLeft:'auto' }} />
        {user ? (
          <>
            <span style={{ fontSize:12, padding:'4px 8px', background:'#f3f3f3', borderRadius:8 }}>
              {user.name} — {user.role}
            </span>
            <button onClick={logout} style={{ marginLeft:8, padding:'6px 10px', borderRadius:8, border:'1px solid #ddd' }}>
              Sair
            </button>
          </>
        ) : (
          <button
            onClick={() => { window.location.hash = '#login'; window.dispatchEvent(new Event('hashchange')) }}
            style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #ddd' }}
          >
            Entrar
          </button>
        )}
      </nav>

      <LoginPin open={needLogin || window.location.hash === '#login'} />

      <Routes>
        {/* BALANÇA cai na VendaBalanca */}
        <Route path="/" element={isBalanca ? <VendaBalanca /> : <VendaRapida />} />
        <Route path="/venda" element={isBalanca ? <VendaBalanca /> : <VendaRapida />} />

        {/* BALANÇA não acessa as telas abaixo */}
        <Route path="/finalizacao" element={hasRole('CAIXA') ? <Finalizacao /> : <Blocked min="CAIXA" />} />
        <Route path="/impressao"   element={hasRole('CAIXA') ? <Impressao />   : <Blocked min="CAIXA" />} />
        <Route path="/relatorios"  element={hasRole('CAIXA') ? <Relatorios />  : <Blocked min="CAIXA" />} />
        <Route path="/relatorio-xz" element={hasRole('GERENTE') ? <RelatorioXZ /> : <Blocked min="GERENTE" />} />
        <Route path="/turno" element={hasRole('CAIXA') ? <Turno /> : <Blocked min="CAIXA" />} />
        <Route path="/sync" element={hasRole('CAIXA') ? <Sync /> : <Blocked min="CAIXA" />} />

        <Route path="/config" element={hasRole('GERENTE') ? <Configuracoes /> : <Blocked min="GERENTE" />} />
        <Route path="/admin" element={hasRole('ADMIN') ? <Admin /> : <Blocked min="ADMIN" />} />
        <Route path="/admin-usuarios" element={hasRole('ADMIN') ? <AdminUsuarios /> : <Blocked min="ADMIN" />} />
        <Route path="/admin-auditoria" element={hasRole('ADMIN') ? <AdminAuditoria /> : <Blocked min="ADMIN" />} />
      </Routes>
    </div>
  )
}

function Blocked({ min }: { min: 'CAIXA' | 'GERENTE' | 'ADMIN' }) {
  return <div style={{ padding: 16 }}>
    <h3>Acesso restrito</h3>
    <p>Esta tela requer perfil <b>{min}</b>.</p>
  </div>
}
