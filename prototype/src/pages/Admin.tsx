// src/pages/Admin.tsx
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { resetAllData } from '../db/sales'

import { useSession } from '../auth/session'
import { mintSSO } from '../services/ssoClient'

export default function Admin() {
  const { user, hasRole } = useSession()
  const [backofficeUrl, setBackofficeUrl] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('pdv.backofficeBaseUrl') || ''
    setBackofficeUrl(saved)
  }, [])

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
          <li>
            <div className="card" style={{ padding: 12, margin: '8px 0' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontWeight: 600 }}>Integração Backoffice (SSO)</div>
                {backofficeUrl ? (
                  <span className="pill small success" title={backofficeUrl}>
                    Conectado ao Backoffice
                  </span>
                ) : (
                  <span className="pill small" title="Defina a URL e salve">
                    Não configurado
                  </span>
                )}
              </div>
              <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  style={{ minWidth: 280 }}
                  placeholder="http://localhost:5174"
                  value={backofficeUrl}
                  onChange={(e) => setBackofficeUrl(e.target.value)}
                />
                <button
                  className="btn"
                  onClick={() => {
                    const v = (backofficeUrl || '').trim()
                    if (!v) {
                      localStorage.removeItem('pdv.backofficeBaseUrl')
                      alert('URL removida.')
                    } else {
                      localStorage.setItem('pdv.backofficeBaseUrl', v)
                      alert('URL do Backoffice salva.')
                    }
                  }}
                >Salvar</button>
                <button
                  className="btn"
                  onClick={() => {
                    const v = (backofficeUrl || '').trim()
                    if (!v) return alert('Defina a URL primeiro.')
                    window.open(v, '_blank', 'noopener,noreferrer')
                  }}
                >Testar</button>
              </div>
              <div className="small muted" style={{ marginTop: 6 }}>
                Use a URL base do Backoffice (ex.: http://localhost:5174). Os atalhos abaixo exigem esta configuração.
              </div>
            </div>
          </li>
          <li>
            <button onClick={() => mintSSO('/estoque')}>Backoffice: Estoque</button>
          </li>
          <li>
            <button onClick={() => mintSSO('/financeiro/receitas')}>Backoffice: Financeiro</button>
          </li>
          <li>
            <button onClick={() => mintSSO('/relatorios/fechamentos')}>Backoffice: Relatórios</button>
          </li>
          <li>
            <button onClick={() => mintSSO('/cadastro/produtos')}>Backoffice: Cadastros</button>
          </li>
          <li>
            <button
              onClick={async () => {
                const ok = window.confirm('Limpar TUDO (comandas rascunho, vendas e turnos)?')
                if (!ok) return
                try {
                  const res = await resetAllData()
                  alert(`Limpeza concluída. Rascunhos removidos: ${res.removedDrafts}.`)
                } catch {
                  alert('Erro ao limpar dados.')
                }
              }}
            >
              🗑️ Limpar TUDO (Reset)
            </button>
          </li>
        </ul>
      </div>
    </div>
  )
}