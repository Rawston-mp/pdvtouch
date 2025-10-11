// src/components/Loading.tsx
import React from 'react'

interface LoadingProps {
  /** Tipo de loading: spinner, skeleton, overlay */
  type?: 'spinner' | 'skeleton' | 'overlay'
  /** Texto opcional para exibir */
  text?: string
  /** Tamanho do loading */
  size?: 'sm' | 'md' | 'lg'
  /** Se deve ocupar toda a tela */
  fullscreen?: boolean
  /** Cor personalizada */
  color?: string
}

export default function Loading({ 
  type = 'spinner', 
  text, 
  size = 'md', 
  fullscreen = false,
  color = 'var(--primary)'
}: LoadingProps) {
  
  if (type === 'spinner') {
    return (
      <div className={`loading-spinner ${fullscreen ? 'loading-fullscreen' : ''} loading-${size}`}>
        <div className="spinner" style={{ borderTopColor: color }}>
          <div className="spinner-inner"></div>
        </div>
        {text && <div className="loading-text">{text}</div>}
      </div>
    )
  }

  if (type === 'skeleton') {
    return (
      <div className={`loading-skeleton loading-${size}`}>
        <div className="skeleton-line"></div>
        <div className="skeleton-line skeleton-short"></div>
        <div className="skeleton-line skeleton-medium"></div>
      </div>
    )
  }

  if (type === 'overlay') {
    return (
      <div className="loading-overlay">
        <div className="loading-overlay-content">
          <div className={`loading-spinner loading-${size}`}>
            <div className="spinner" style={{ borderTopColor: color }}>
              <div className="spinner-inner"></div>
            </div>
            {text && <div className="loading-text">{text}</div>}
          </div>
        </div>
      </div>
    )
  }

  return null
}

// Hook movido para src/hooks/useLoading.ts

// Componente de loading para botões
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  children: React.ReactNode
}

export function LoadingButton({ 
  loading = false, 
  loadingText = 'Carregando...', 
  children, 
  disabled,
  ...props 
}: LoadingButtonProps) {
  return (
    <button 
      {...props} 
      disabled={disabled || loading}
      className={`${props.className || ''} ${loading ? 'loading' : ''}`}
    >
      {loading ? (
        <span className="loading-button-content">
          <div className="spinner-sm"></div>
          {loadingText}
        </span>
      ) : children}
    </button>
  )
}