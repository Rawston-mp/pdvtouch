// src/App.tsx
import React from 'react'
import { NavLink, Routes, Route } from 'react-router-dom'
import { SessionProvider, useSession } from './auth/session'
import { RequireRole } from './utils/guard'
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
import PixPage from './pages/Pix' // <<<<<< NOVO

import './App.css'

function Layout() {
  const { user, signOut } = useSession()

  function sair() {
    try {
      signOut()
    } catch (e) {
      /* erro ao sair */
    }
    window.location.href = '/'
  }

  // Redirecionamento automático para balanças
  React.useEffect(() => {
    if (user && (user.role === 'BALANÇA A' || user.role === 'BALANÇA B')) {
      const currentPath = window.location.pathname
      if (currentPath !== '/venda' && currentPath !== '/') {
        window.location.href = '/venda'
      }
    }
  }, [user])

  return (
    <div>
      <LoginPin />

      <div style={topbar}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <b>PDVTouch (Protótipo)</b>

          {/* Venda: disponível para todos */}
          <NavLink to="/venda" className={linkCls}>
            Venda
          </NavLink>

          {/* Menus restritos: ocultos para balanças */}
          {!user?.role.includes('BALANÇA') && (
            <>
              <NavLink to="/finalizacao" className={linkCls}>
                Finalização
              </NavLink>
              <NavLink to="/impressao" className={linkCls}>
                Impressão
              </NavLink>
              <NavLink to="/relatorios" className={linkCls}>
                Relatórios
              </NavLink>
              <NavLink to="/relatorioxz" className={linkCls}>
                Relatório X/Z
              </NavLink>
              <NavLink to="/turno" className={linkCls}>
                Turno
              </NavLink>
            </>
          )}

          {/* Sync: apenas Admin/Gerente */}
          {(user?.role === 'ADMIN' || user?.role === 'GERENTE') && (
            <NavLink to="/sync" className={linkCls}>
              Sync
            </NavLink>
          )}

          {/* Admin: apenas Admin/Gerente */}
          {(user?.role === 'ADMIN' || user?.role === 'GERENTE') && (
            <NavLink to="/admin" className={linkCls}>
              Admin
            </NavLink>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <small style={{ opacity: 0.7 }}>
            {user ? `${user.name} — ${user.role}` : 'Sem sessão'}
          </small>
          <button onClick={sair} style={{ padding: '4px 10px' }}>
            Sair
          </button>
        </div>
      </div>

      <div style={{ padding: '8px 12px' }}>
        <Routes>
          <Route path="/" element={<VendaRapida />} />
          <Route path="/venda" element={<VendaRapida />} />

          {/* Finalizacao: bloqueado para balanças */}
          <Route
            path="/finalizacao"
            element={
              <RequireRole
                roles={['ADMIN', 'GERENTE', 'CAIXA', 'ATENDENTE']}
                blockMessage="Balanças não têm acesso à finalização. Use apenas a tela de Vendas."
              >
                <Finalizacao />
              </RequireRole>
            }
          />

          {/* Impressao: bloqueado para balanças */}
          <Route
            path="/impressao"
            element={
              <RequireRole roles={['ADMIN', 'GERENTE', 'CAIXA', 'ATENDENTE']}>
                <Impressao />
              </RequireRole>
            }
          />

          {/* Relatorios: bloqueado para balanças */}
          <Route
            path="/relatorios"
            element={
              <RequireRole roles={['ADMIN', 'GERENTE', 'CAIXA']}>
                <Relatorios />
              </RequireRole>
            }
          />

          {/* Relatorio X/Z: bloqueado para balanças */}
          <Route
            path="/relatorioxz"
            element={
              <RequireRole roles={['ADMIN', 'GERENTE', 'CAIXA']}>
                <RelatorioXZ />
              </RequireRole>
            }
          />

          {/* Turno: bloqueado para balanças */}
          <Route
            path="/turno"
            element={
              <RequireRole roles={['ADMIN', 'GERENTE', 'CAIXA']}>
                <Turno />
              </RequireRole>
            }
          />

          {/* Sync: bloqueado para balanças */}
          <Route
            path="/sync"
            element={
              <RequireRole roles={['ADMIN', 'GERENTE']}>
                <Sync />
              </RequireRole>
            }
          />

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
