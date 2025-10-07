// src/pages/AdminProdutos.tsx (placeholder desativado)
import React from 'react'
import { mintSSO } from '../services/ssoClient'

export default function AdminProdutos() {
  return (
    <div className="container">
      <h2>Admin → Produtos (Desativado)</h2>
      <div className="pill" style={{ margin: '8px 0', background: '#fff8e1', border: '1px solid #ffe69c' }}>
        A gestão de produtos agora é exclusivamente realizada no Backoffice (AtendeTouch). Nenhuma alteração local é salva aqui.
      </div>
      <button className="btn btn-primary" onClick={() => mintSSO('/cadastro/produtos')}>
        Abrir Cadastros no Backoffice
      </button>
      <div style={{ marginTop: 24 }} className="muted small">
        (Placeholder de compatibilidade. Atualize favoritos para apontar ao Backoffice.)
      </div>
    </div>
  )
}