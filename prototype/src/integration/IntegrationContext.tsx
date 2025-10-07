import React from 'react'
import { loadIntegrationSettings, saveIntegrationSettings, type IntegrationSettings } from './integrationStore'

// Contexto interno reexportado para hook separado
export const IntegrationContextInternal = React.createContext<IntegrationCtxType | null>(null)

type IntegrationCtxType = IntegrationSettings & {
  setBackofficeUrl: (url: string) => void
  setDevPath: (p: string) => void
}

export function IntegrationProvider({ children }: { children: React.ReactNode }) {
  const initial = React.useMemo(() => loadIntegrationSettings(), [])
  const [backofficeUrl, setBackoffice] = React.useState(initial.backofficeUrl)
  const [devPath, setDev] = React.useState(initial.devPath)

  // Persist assíncrono e debounced leve
  React.useEffect(() => {
    const id = setTimeout(() => saveIntegrationSettings({ backofficeUrl }), 50)
    return () => clearTimeout(id)
  }, [backofficeUrl])
  React.useEffect(() => {
    const id = setTimeout(() => saveIntegrationSettings({ devPath }), 50)
    return () => clearTimeout(id)
  }, [devPath])

  const value = React.useMemo<IntegrationCtxType>(() => ({
    backofficeUrl,
    devPath,
    setBackofficeUrl: setBackoffice,
    setDevPath: setDev,
  }), [backofficeUrl, devPath])

  return <IntegrationContextInternal.Provider value={value}>{children}</IntegrationContextInternal.Provider>
}
