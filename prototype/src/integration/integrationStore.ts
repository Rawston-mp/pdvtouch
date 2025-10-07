// Helpers e persistência de configurações de integração (Backoffice / Dev Path)

export const LS_BACKOFFICE = 'pdv.backofficeBaseUrl'
export const LS_DEVPATH = 'pdv.devPath'
export const defaultDevPath = '\\wsl.localhost\\Ubuntu-20.04\\home\\rawston\\pdvtouch'

export type IntegrationSettings = {
  backofficeUrl: string
  devPath: string
}

export function loadIntegrationSettings(): IntegrationSettings {
  if (typeof window === 'undefined') {
    return { backofficeUrl: '', devPath: defaultDevPath }
  }
  let backofficeUrl = ''
  let devPath = ''
  try { backofficeUrl = localStorage.getItem(LS_BACKOFFICE) || '' } catch { /* noop */ }
  try { devPath = localStorage.getItem(LS_DEVPATH) || '' } catch { /* noop */ }
  if (!devPath) devPath = defaultDevPath
  return { backofficeUrl, devPath }
}

export function saveIntegrationSettings(s: Partial<IntegrationSettings>) {
  if (typeof window === 'undefined') return
  try {
    if (s.backofficeUrl !== undefined) {
      const v = (s.backofficeUrl || '').trim()
      if (v) localStorage.setItem(LS_BACKOFFICE, v)
      else localStorage.removeItem(LS_BACKOFFICE)
    }
  } catch { /* noop */ }
  try {
    if (s.devPath !== undefined) {
      const v = (s.devPath || '').trim()
      if (v) localStorage.setItem(LS_DEVPATH, v)
      else localStorage.removeItem(LS_DEVPATH)
    }
  } catch { /* noop */ }
}

// Funções utilitárias para testes podem ser adicionadas aqui mais tarde.
