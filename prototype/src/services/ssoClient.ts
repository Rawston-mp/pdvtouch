// src/services/ssoClient.ts
// Cliente SSO (mock): cria um token curto e abre o Backoffice com redirect

type MintOptions = {
  backofficeBaseUrl?: string // ex.: http://localhost:5174/backoffice
}

/**
 * Gera um token SSO simples (mock) com expiração curta e abre o Backoffice
 * em nova aba. Em produção, este token deve vir do backend do PDVTouch.
 */
export async function mintSSO(modulePath: string, opts: MintOptions = {}) {
  const base = (opts.backofficeBaseUrl || localStorage.getItem('pdv.backofficeBaseUrl') || '').trim()
  if (!base) {
    alert('Backoffice não configurado. Defina a URL em localStorage: pdv.backofficeBaseUrl')
    return
  }
  // MOCK: token simples com expiração em 2 minutos
  const payload = {
    sub: 'user',
    role: localStorage.getItem('pdv.role') || 'ADMIN',
    exp: Date.now() + 2 * 60 * 1000,
  }
  const token = btoa(JSON.stringify(payload))
  const redirect = encodeURIComponent(modulePath)
  const url = `${base.replace(/\/$/, '')}/sso/consume?token=${encodeURIComponent(token)}&redirect=${redirect}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
