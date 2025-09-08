// src/App.tsx
import { NavLink, Routes, Route } from 'react-router-dom'
import { SessionProvider, useSession } from './auth/session'
import VendaRapida from './pages/VendaRapida'
import Finalizacao from './pages/Finalizacao'
import Impressao from './pages/Impressao'
import Relatorios from './pages/Relatorios'
import RelatorioXZ from './pages/RelatorioXZ'
import Admin from './pages/Admin'
import Configuracoes from './pages/Configuracoes'
import Sync from './pages/Sync'
import Turno from './pages/Turno'
import LoginPin from './components/LoginPin'

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

  return (
    <div>
      <nav style={{ display: 'flex', gap: 16, padding: 12, borderBottom: '1px solid #eee', alignItems:'center' }}>
        <b>PDVTouch (Protótipo)</b>
        <NavLink to="/config">Configurações</NavLink>
        <NavLink to="/venda">Venda</NavLink>
        <NavLink to="/finalizacao">Finalização</NavLink>
        <NavLink to="/impressao">Impressão</NavLink>
        <NavLink to="/relatorios">Relatórios</NavLink>
        <NavLink to="/relatorio-xz">Relatório X/Z</NavLink>
        <NavLink to="/turno">Turno</NavLink>
        <NavLink to="/admin">Admin</NavLink>
        <NavLink to="/sync">Sync</NavLink>

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

      {/* Modal PIN: abre se não logado OU se clicar “Entrar” */}
      <LoginPin open={needLogin || window.location.hash === '#login'} />

      <Routes>
        <Route path="/" element={<VendaRapida />} />
        <Route path="/venda" element={<VendaRapida />} />
        <Route path="/finalizacao" element={<Finalizacao />} />
        <Route path="/impressao" element={<Impressao />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/relatorio-xz" element={hasRole('GERENTE') ? <RelatorioXZ /> : <Blocked min="GERENTE" />} />
        <Route path="/turno" element={<Turno />} />
        <Route path="/admin" element={hasRole('ADMIN') ? <Admin /> : <Blocked min="ADMIN" />} />
        <Route path="/config" element={hasRole('GERENTE') ? <Configuracoes /> : <Blocked min="GERENTE" />} />
        <Route path="/sync" element={<Sync />} />
      </Routes>
    </div>
  )
}

function Blocked({ min }: { min: 'GERENTE' | 'ADMIN' }) {
  return (
    <div style={{ padding: 16 }}>
      <h3>Acesso restrito</h3>
      <p>Esta tela requer perfil <b>{min}</b>.</p>
    </div>
  )
}
