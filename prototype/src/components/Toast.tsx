// src/components/Toast.tsx
import React from 'react'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  React.useEffect(() => {
    const duration = toast.duration || 4000
    const timer = setTimeout(() => onRemove(toast.id), duration)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const icons = {
    success: '✅',
    error: '❌', 
    warning: '⚠️',
    info: 'ℹ️'
  }

  return (
    <div className={`toast toast-${toast.type}`}>
      <div className="toast-content">
        <div className="toast-icon">{icons[toast.type]}</div>
        <div className="toast-body">
          <div className="toast-title">{toast.title}</div>
          {toast.message && <div className="toast-message">{toast.message}</div>}
        </div>
        <div className="toast-actions">
          {toast.action && (
            <button 
              className="toast-action-btn"
              onClick={toast.action.onClick}
            >
              {toast.action.label}
            </button>
          )}
          <button 
            className="toast-close-btn"
            onClick={() => onRemove(toast.id)}
          >
            ×
          </button>
        </div>
      </div>
      <div className="toast-progress">
        <div 
          className="toast-progress-bar" 
          style={{ 
            animationDuration: `${toast.duration || 4000}ms` 
          }}
        />
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}