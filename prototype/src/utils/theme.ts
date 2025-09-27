// src/utils/theme.ts
const KEY = 'pdv.theme'
const root = document.documentElement

export function setTheme(mode: 'dark'|'light'){
  if (mode === 'light') root.setAttribute('data-theme','light')
  else root.removeAttribute('data-theme')
  localStorage.setItem(KEY, mode)
}

export function initTheme(){
  const saved = localStorage.getItem(KEY) as 'dark'|'light'|null
  if (saved) { setTheme(saved); return }
  const prefersLight = matchMedia('(prefers-color-scheme: light)').matches
  setTheme(prefersLight ? 'light' : 'dark')
}

// atalho Alt+D para alternar
window.addEventListener('keydown', (e) => {
  if (e.altKey && e.key.toLowerCase() === 'd') {
    const isLight = root.getAttribute('data-theme') === 'light'
    setTheme(isLight ? 'dark' : 'light')
  }
})

initTheme()