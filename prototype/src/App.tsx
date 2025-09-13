// src/App.tsx
import { NavLink, Routes, Route } from 'react-router-dom'
import { SessionProvider, useSession } from './auth/session'
import { RequireRole } from './utils/guard.tsx'
import LoginPin from './components/LoginPin'

import VendaRapida from './pages/VendaRapida'
import Finalizacao from './pages/Finalizacao'
import Impressao from './pages/Impressao'
import Relatorios from './pages/Relatorios'
import RelatorioXZ from './pages/RelatorioXZ'
import Turno from './pages/Turno'
import Sync from './pages/Sync'
import Admin from './pages/Admin'
import AdminUsuarios from './pages/AdminUsuarios'
import Configuracoes from './pages/Configuracoes'
import AdminProdutos from './pages/AdminProdutos'
import PixPage from './pages/Pix'          // <<<<<< NOVO

import './App.css'

function Layout() {
  const { user, signOut } = useSession()

  function sair() {
    try { signOut() } catch {}
    window.location.href = '/'
  }

  return (
    <div>
      <LoginPin />

      <div style={topbar}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <b>PDVTouch (Protótipo)</b>
          <NavLink to="/venda" className={linkCls}>Venda</NavLink>
          <NavLink to="/finalizacao" className={linkCls}>Finalização</NavLink>
          <NavLink to="/impressao" className={linkCls}>Impressão</NavLink>
          <NavLink to="/relatorios" className={linkCls}>Relatórios</NavLink>
          <NavLink to="/relatorioxz" className={linkCls}>Relatório X/Z</NavLink>
          <NavLink to="/turno" className={linkCls}>Turno</NavLink>
          <NavLink to="/sync" className={linkCls}>Sync</NavLink>
          <NavLink to="/admin" className={linkCls}>Admin</NavLink>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <small style={{ opacity: .7 }}>
            {user ? `${user.name} — ${user.role}` : 'Sem sessão'}
          </small>
          <button onClick={sair} style={{ padding: '4px 10px' }}>Sair</button>
        </div>
      </div>

      <div style={{ padding: '8px 12px' }}>
        <Routes>
          <Route path="/" element={<VendaRapida />} />
          <Route path="/venda" element={<VendaRapida />} />
          <Route path="/finalizacao" element={<Finalizacao />} />
          <Route path="/impressao" element={<Impressao />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/relatorioxz" element={<RelatorioXZ />} />
          <Route path="/turno" element={<Turno />} />
          <Route path="/sync" element={<Sync />} />

          {/* PIX: permitido CAIXA, GERENTE, ADMIN */}
          <Route
            path="/pix"
            element={
              <RequireRole roles={['CAIXA', 'GERENTE', 'ADMIN']}>
                <PixPage />
              </RequireRole>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireRole roles={['ADMIN', 'GERENTE']}>
                <Admin />
              </RequireRole>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <RequireRole roles={['ADMIN', 'GERENTE']}>
                <AdminUsuarios />
              </RequireRole>
            }
          />
          <Route
            path="/admin/produtos"
            element={
              <RequireRole roles={['ADMIN', 'GERENTE']}>
                <AdminProdutos />
              </RequireRole>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <RequireRole roles={['ADMIN', 'GERENTE']}>
                <Configuracoes />
              </RequireRole>
            }
          />

          <Route path="*" element={<VendaRapida />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <Layout />
    </SessionProvider>
  )
}

/* estilos */
const topbar: React.CSSProperties = {
  height: 48,
  borderBottom: '1px solid #eee',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 10px',
  position: 'sticky',
  top: 0,
  background: '#fff',
  zIndex: 10,
}
function linkCls({ isActive }: { isActive: boolean }) {
  return isActive ? 'navlink active' : 'navlink'
}
