import { useContext } from 'react'
import { IntegrationContext } from './IntegrationProvider'

export function useIntegration() {
  const ctx = useContext(IntegrationContext)
  if (!ctx) throw new Error('useIntegration deve ser usado dentro de <IntegrationProvider>')
  return ctx
}
