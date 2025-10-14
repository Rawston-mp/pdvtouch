import './utils/theme' // inicializa tema + atalho Alt+D
import './utils/extensionErrorSuppressor' // silencia erros de extensões

// Suprimir mensagem do React DevTools no console
if (!import.meta.env.DEV || !import.meta.env.VITE_SHOW_DEVTOOLS_MSG) {
  const originalLog = console.log
  console.log = (...args) => {
    const message = args.join(' ')
    if (message.includes('Download the React DevTools') || message.includes('react-devtools')) {
      return // silenciar
    }
    originalLog.apply(console, args)
  }
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import './App.css'
import './responsive-touch.css'

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
