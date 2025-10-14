// src/App.tsx
import React from 'react'
import { NavLink, Routes, Route } from 'react-router-dom'
import { SessionProvider, useSession } from './auth/session'
import { ToastProvider } from './components/ToastProvider'
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
import AdminFiscal from './pages/AdminFiscal'
import PixPage from './pages/Pix'
import Sobre from './pages/Sobre'
import ThemeToggle from './components/ThemeToggle'

import './App.css'
import { connectDevices, reconnectDevices } from './mock/devices'

function Layout() {
  const { user, signOut } = useSession()
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = React.useState<boolean>(false)

  function sair() {
    try {
      signOut()
    } catch {
      /* noop */
    }
    // Não força reload - o LoginPin aparecerá automaticamente
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

  // Captura o beforeinstallprompt para exibir o botão de instalar (apenas Admin/Gerente)
  React.useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as unknown as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  // Detecta se o app já está em standalone (instalado)
  React.useEffect(() => {
    const check = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
      setIsStandalone(!!standalone)
    }
    check()
    const onChange = () => check()
    window.matchMedia('(display-mode: standalone)').addEventListener?.('change', onChange)
    window.addEventListener('appinstalled', check)
    return () => {
      window.matchMedia('(display-mode: standalone)').removeEventListener?.('change', onChange)
      window.removeEventListener('appinstalled', check)
    }
  }, [])

  // Service Worker removido - PWA desabilitado

  function onInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.finally(() => setDeferredPrompt(null))
      return
    }
    // Fallback DEV: instruções manuais por plataforma
    if (import.meta.env.DEV) {
      const ua = navigator.userAgent || ''
      const isIOS = /iPad|iPhone|iPod/.test(ua)
      const isAndroid = /Android/.test(ua)
      const isChrome = /Chrome\//.test(ua)
      const isEdge = /Edg\//.test(ua)
      const isSafari = /Safari\//.test(ua) && !isChrome && !isEdge
      let msg = 'Para instalar:\n\n'
      if (isIOS) {
        msg += '- Abra no Safari > botão Compartilhar > Adicionar à Tela de Início.'
      } else if (isAndroid && isChrome) {
        msg += '- Toque no menu ⋮ do Chrome > Instalar aplicativo (ou Adicionar à tela inicial).'
      } else if (isChrome || isEdge) {
        msg += '- Clique no ícone de instalar na barra de endereço ou em Mais > Instalar PDVTouch.'
      } else if (isSafari) {
        msg += '- Safari no macOS: Arquivo > Adicionar ao Dock.'
      } else {
        msg += '- Procure pela opção de instalar/instalar aplicativo no menu do navegador.'
      }
      alert(msg)
    }
  }

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

          {/* Sobre/Suporte: disponível para todos */}
          <NavLink to="/sobre" className={linkCls}>
            Sobre
          </NavLink>
        </div>
        <WsStatus />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <small style={{ opacity: 0.7 }}>
            {user ? `${user.name} — ${user.role}` : 'Sem sessão'}
          </small>
          <ThemeToggle />
          {(user && (user.role === 'ADMIN' || user.role === 'GERENTE')) && !isStandalone && (deferredPrompt || import.meta.env.DEV) && (
            <button onClick={onInstallClick} style={{ padding: '4px 10px' }}>Instalar app</button>
          )}
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

          {/* Sobre/Suporte: disponível para todos */}
          <Route path="/sobre" element={<Sobre />} />

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
            path="/admin/fiscal"
            element={
              <RequireRole roles={['ADMIN']}>
                <AdminFiscal />
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
          <Route path="/sobre" element={<Sobre />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <SessionProvider>
        <Layout />
      </SessionProvider>
    </ToastProvider>
  )
}

// Tipagem local mínima para o evento beforeinstallprompt
type BeforeInstallPromptEvent = Event & {
  prompt: () => void
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function WsStatus() {
  const [status, setStatus] = React.useState<'open' | 'connecting' | 'closed'>('connecting')

  React.useEffect(() => {
    const ws = connectDevices()

    function update() {
      const s = ws?.readyState
      if (s === WebSocket.OPEN) setStatus('open')
      else if (s === WebSocket.CONNECTING) setStatus('connecting')
      else setStatus('closed')
    }
    update()
    const id = setInterval(update, 1000)

    const onOpen = () => setStatus('open')
    const onClose = () => setStatus('closed')
    const onError = () => setStatus('closed')
    ws?.addEventListener('open', onOpen)
    ws?.addEventListener('close', onClose)
    ws?.addEventListener('error', onError)

    return () => {
      clearInterval(id)
      ws?.removeEventListener('open', onOpen)
      ws?.removeEventListener('close', onClose)
      ws?.removeEventListener('error', onError)
    }
  }, [])

  const color = status === 'open' ? '#16a34a' : status === 'connecting' ? '#f59e0b' : '#dc2626'
  const label = status === 'open' ? 'WS conectado' : status === 'connecting' ? 'WS conectando' : 'WS offline'
  const showReconnect = status !== 'open'

  return (
    <div title={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 8, background: color, display: 'inline-block' }} />
      <small style={{ opacity: 0.7 }}>{label}</small>
      {showReconnect && (
        <button onClick={() => reconnectDevices()} style={{ marginLeft: 6, padding: '2px 8px' }}>
          Reconectar
        </button>
      )}
    </div>
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

// Toast style removido - PWA desabilitado
