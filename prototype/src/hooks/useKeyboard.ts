// src/hooks/useKeyboard.ts
import React from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
  preventDefault?: boolean
}

export function useKeyboard(shortcuts: KeyboardShortcut[], enabled = true) {
  React.useEffect(() => {
    if (!enabled) return

    function handleKeyDown(event: KeyboardEvent) {
      for (const shortcut of shortcuts) {
        const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase() ||
                        shortcut.key === event.code

        // Só executa se TODAS as condições coincidirem exatamente
        const exactCtrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey
        const exactShiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
        const exactAltMatch = shortcut.alt ? event.altKey : !event.altKey

        if (keyMatch && exactCtrlMatch && exactShiftMatch && exactAltMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          shortcut.action()
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled])
}

// Hook específico para PDV com atalhos padrão
export function usePDVKeyboard(actions: {
  onNewSale?: () => void
  onSearch?: () => void
  onWeight?: () => void
  onFinalize?: () => void
  onCancel?: () => void
  onHelp?: () => void
  onRefresh?: () => void
  // Quick Actions F2-F7
  onQuick1?: () => void
  onQuick2?: () => void  
  onQuick3?: () => void
  onQuick4?: () => void
  onQuick5?: () => void
  onQuick6?: () => void
}) {
  const shortcuts: KeyboardShortcut[] = React.useMemo(() => [
    {
      key: 'F1',
      action: actions.onHelp || (() => console.log('Ajuda')),
      description: 'F1 - Ajuda'
    },
    {
      key: 'F2', 
      action: actions.onQuick1 || (() => {}),
      description: 'F2 - Prato Executivo'
    },
    {
      key: 'F3',
      action: actions.onQuick2 || (() => {}),
      description: 'F3 - Refrigerante'
    },
    {
      key: 'F4',
      action: actions.onQuick3 || (() => {}),
      description: 'F4 - Água 500ml'
    },
    {
      key: 'F5',
      action: actions.onQuick4 || (() => {}),
      description: 'F5 - Self-service kg'
    },
    {
      key: 'F6',
      action: actions.onQuick5 || (() => {}),
      description: 'F6 - Mousse'
    },
    {
      key: 'F7',
      action: actions.onQuick6 || (() => {}),
      description: 'F7 - Guarnição'
    },
    {
      key: 'F8',
      action: actions.onSearch || (() => {}),
      description: 'F8 - Buscar Produto'
    },
    {
      key: 'F9',
      action: actions.onFinalize || (() => {}),
      description: 'F9 - Finalizar Venda'
    },
    {
      key: 'F10',
      action: actions.onWeight || (() => {}),
      description: 'F10 - Peso/Balança'
    },
    {
      key: 'F11',
      action: actions.onNewSale || (() => {}),
      description: 'F11 - Nova Venda'
    },
    {
      key: 'F12',
      action: actions.onRefresh || (() => window.location.reload()),
      description: 'F12 - Atualizar'
    },
    {
      key: 'Escape',
      action: actions.onCancel || (() => {}),
      description: 'ESC - Cancelar'
    }
  ], [actions])

  useKeyboard(shortcuts)

  return shortcuts
}