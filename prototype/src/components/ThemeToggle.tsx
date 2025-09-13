import React from 'react'
import { setTheme } from '../utils/theme'

export default function ThemeToggle(){
  function toggle(){
    const isLight = document.documentElement.getAttribute('data-theme') === 'light'
    setTheme(isLight ? 'dark' : 'light')
  }
  return (
    <button className="theme-toggle" onClick={toggle} title="Alternar tema (Alt+D)">
      🌓
    </button>
  )
}
