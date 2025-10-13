// src/components/ThemeToggle.tsx
import React from 'react'
import { setTheme } from '../utils/theme'

export default function ThemeToggle() {
  const [isDark, setIsDark] = React.useState(() => {
    return document.documentElement.getAttribute('data-theme') !== 'light'
  })

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark'
    setTheme(newTheme)
    setIsDark(!isDark)
  }

  return (
    <button
      onClick={toggleTheme}
      style={{
        padding: '4px 10px',
        background: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: 'var(--text)',
        fontSize: '14px',
      }}
      title={`Alternar para tema ${isDark ? 'claro' : 'escuro'} (Alt+D)`}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}