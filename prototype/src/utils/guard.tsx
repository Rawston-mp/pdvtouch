// src/utils/guard.tsx
import { useSession } from '../auth/session'
import type { UserRole } from '../db/models'

type Props = {
  /** Perfis permitidos. Se omitido, basta estar autenticado. */
  roles?: UserRole[]
  /** Mensagem customizada para usuários bloqueados */
  blockMessage?: string
  children: JSX.Element
}

/** Guard simples por perfil. */
export function RequireRole({ roles, blockMessage, children }: Props) {
  const { user, hasRole } = useSession()

  if (!user) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Acesso restrito</h2>
        <p>Você precisa estar autenticado para ver esta página.</p>
      </div>
    )
  }

  const allowed = !roles || roles.length === 0 || roles.some((r) => hasRole(r))
  if (!allowed) {
    const isBalanca = user.role === 'BALANÇA A' || user.role === 'BALANÇA B'

    return (
      <div style={{ padding: 16 }}>
        <h2>Acesso restrito</h2>
        <p>{blockMessage || 'Você não possui permissão para acessar esta página.'}</p>
        {isBalanca && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: 4,
            }}
          >
            <strong>📋 Instruções para Balança:</strong>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>
                Use apenas a tela de <strong>Vendas</strong>
              </li>
              <li>Informe o número da comanda (1-200)</li>
              <li>Adicione produtos por peso</li>
              <li>A finalização será feita pelo caixa</li>
            </ul>
          </div>
        )}
      </div>
    )
  }

  return children
}

export default RequireRole
