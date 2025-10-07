import React from 'react'
import { loadIntegrationSettings, saveIntegrationSettings, type IntegrationSettings } from './integrationStore'

export type IntegrationCtxType = IntegrationSettings & {
  setBackofficeUrl: (url: string) => void
  setDevPath: (p: string) => void
}

// Contexto separado; hot reload não crítico aqui.
// eslint-disable-next-line react-refresh/only-export-components
export const IntegrationContext = React.createContext<IntegrationCtxType | null>(null)

export function IntegrationProvider({ children }: { children: React.ReactNode }) {
  const initial = React.useMemo(() => loadIntegrationSettings(), [])
  const [backofficeUrl, setBackoffice] = React.useState(initial.backofficeUrl)
  const [devPath, setDev] = React.useState(initial.devPath)

  React.useEffect(() => {
    const id = setTimeout(() => saveIntegrationSettings({ backofficeUrl }), 60)
    return () => clearTimeout(id)
  }, [backofficeUrl])
  React.useEffect(() => {
    const id = setTimeout(() => saveIntegrationSettings({ devPath }), 60)
    return () => clearTimeout(id)
  }, [devPath])

  const value = React.useMemo<IntegrationCtxType>(() => ({
    backofficeUrl,
    devPath,
    setBackofficeUrl: setBackoffice,
    setDevPath: setDev,
  }), [backofficeUrl, devPath])

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>
}
