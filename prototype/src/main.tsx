import './utils/theme' // inicializa tema + atalho Alt+D
import './utils/extensionErrorSuppressor' // silencia erros de extensões

// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import './App.css'
import './utils/resetDb' // Adiciona função global de reset
import './utils/debug' // Adiciona funções de debug
// import './utils/testPermissions' // Adiciona teste de permissões
// import './utils/quickFix' // Adiciona correção rápida

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

// Supressão de erros de extensões já inicializada em extensionErrorSuppressor.ts
