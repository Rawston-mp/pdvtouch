import './utils/theme' // inicializa tema + atalho Alt+D

// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import './App.css'
import './utils/resetDb' // Adiciona função global de reset
import './utils/debug' // Adiciona funções de debug
import './utils/testPermissions' // Adiciona teste de permissões
import './utils/quickFix' // Adiciona correção rápida

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

// PWA: registra service worker quando suportado
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('SW register failed', err))
  })
}
