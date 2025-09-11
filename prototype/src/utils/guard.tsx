// src/utils/guard.tsx
import { useSession } from '../auth/session'
import type { UserRole } from '../db/models'

type Props = {
  /** Perfis permitidos. Se omitido, basta estar autenticado. */
  roles?: UserRole[]
  children: JSX.Element
}

/** Guard simples por perfil. */
export function RequireRole({ roles, children }: Props) {
  const { user, hasRole } = useSession()

  if (!user) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Acesso restrito</h2>
        <p>Você precisa estar autenticado para ver esta página.</p>
      </div>
    )
  }

  const allowed = !roles || roles.length === 0 || roles.some(r => hasRole(r))
  if (!allowed) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Acesso restrito</h2>
        <p>Você não possui permissão para acessar esta página.</p>
      </div>
    )
  }

  return children
}

export default RequireRole
