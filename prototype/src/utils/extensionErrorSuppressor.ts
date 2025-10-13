// src/utils/extensionErrorSuppressor.ts
// Utilitário para silenciar completamente erros de extensões do navegador

let isInitialized = false

export function initExtensionErrorSuppression() {
  if (isInitialized) return
  isInitialized = true

  console.log('🔇 Inicializando supressão de erros de extensões...')

  // Padrões de erros conhecidos de extensões
  const extensionErrorPatterns = [
    'message channel closed',
    'listener indicated an asynchronous response',
    'Extension context invalidated',
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://',
    'safari-web-extension://',
    'non-object-property-load',
    'Script error.',
    'ResizeObserver loop limit exceeded',
    'Network request failed',
    'Failed to fetch',
    'The message channel closed',
    'A listener indicated an asynchronous response'
  ]

  // Função para verificar se é erro de extensão
  const isExtensionError = (message: string) => {
    return extensionErrorPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    )
  }

  // Interceptar window.addEventListener
  const originalAddEventListener = window.addEventListener
  window.addEventListener = function(type: string, listener: any, options?: any) {
    if (type === 'error' || type === 'unhandledrejection') {
      const wrappedListener = (event: any) => {
        const message = event.message || event.reason?.message || event.reason?.toString() || ''
        
        if (isExtensionError(message)) {
          console.debug('🔇 Erro de extensão interceptado:', message)
          event.preventDefault?.()
          event.stopPropagation?.()
          return false
        }
        
        return listener(event)
      }
      
      return originalAddEventListener.call(this, type, wrappedListener, options)
    }
    
    return originalAddEventListener.call(this, type, listener, options)
  }

  // Handler global de erros
  window.addEventListener('error', (event) => {
    const message = event.message || ''
    
    if (isExtensionError(message)) {
      console.debug('🔇 Global error handler - extensão silenciada:', message)
      event.preventDefault()
      event.stopPropagation()
      return false
    }
  }, true) // useCapture = true para interceptar antes

  // Handler global de promises rejeitadas
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason?.toString() || ''
    
    if (isExtensionError(message)) {
      console.debug('🔇 Unhandled rejection - extensão silenciada:', message)
      event.preventDefault()
      return false
    }
  }, true)

  // Interceptar console.error
  const originalConsoleError = console.error
  console.error = (...args) => {
    const message = args.join(' ')
    
    if (isExtensionError(message)) {
      console.debug('🔇 Console.error de extensão silenciado:', message)
      return
    }
    
    originalConsoleError.apply(console, args)
  }

  // Interceptar console.warn para alguns casos
  const originalConsoleWarn = console.warn
  console.warn = (...args) => {
    const message = args.join(' ')
    
    if (isExtensionError(message)) {
      console.debug('🔇 Console.warn de extensão silenciado:', message)
      return
    }
    
    originalConsoleWarn.apply(console, args)
  }

  console.log('✅ Supressão de erros de extensões ativada')
}

// Auto-inicializar
initExtensionErrorSuppression()