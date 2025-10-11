// src/components/ToastProvider.tsx
import React from 'react'
import { ToastContext, useToastState } from '../hooks/useToast'
import { ToastContainer } from './Toast'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toastHandlers = useToastState()

  return (
    <ToastContext.Provider value={toastHandlers}>
      {children}
      <ToastContainer 
        toasts={toastHandlers.toasts}
        onRemove={toastHandlers.removeToast}
      />
    </ToastContext.Provider>
  )
}