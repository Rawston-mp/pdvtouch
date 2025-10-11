// src/components/KeyboardHelp.tsx
import React from 'react'
import type { KeyboardShortcut } from '../hooks/useKeyboard'

interface KeyboardHelpProps {
  shortcuts: KeyboardShortcut[]
  isOpen: boolean
  onClose: () => void
}

export default function KeyboardHelp({ shortcuts, isOpen, onClose }: KeyboardHelpProps) {
  React.useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="keyboard-help-backdrop" onClick={onClose}>
      <div className="keyboard-help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="keyboard-help-header">
          <h3>Atalhos de Teclado</h3>
          <button className="keyboard-help-close" onClick={onClose}>×</button>
        </div>
        
        <div className="keyboard-help-content">
          <div className="shortcuts-grid">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="shortcut-item">
                <div className="shortcut-key">
                  {shortcut.ctrl && <span className="key-modifier">Ctrl</span>}
                  {shortcut.shift && <span className="key-modifier">Shift</span>}
                  {shortcut.alt && <span className="key-modifier">Alt</span>}
                  <span className="key-main">{shortcut.key}</span>
                </div>
                <div className="shortcut-description">
                  {shortcut.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="keyboard-help-footer">
          <p className="help-tip">
            💡 <strong>Dica:</strong> Pressione <kbd>ESC</kbd> para fechar esta janela
          </p>
        </div>
      </div>
    </div>
  )
}