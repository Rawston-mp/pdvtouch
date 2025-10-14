// src/components/ConnectivityTest.tsx
import React, { useState } from 'react'

interface ConnectionStatus {
  name: string
  status: 'testing' | 'success' | 'error' | 'warning'
  message: string
  responseTime?: number
  details?: string
}

export default function ConnectivityTest() {
  const [isVisible, setIsVisible] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<ConnectionStatus[]>([])

  const showToast = (type: 'success' | 'warning', title: string, message: string) => {
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`)
  }

  const tests = [
    {
      name: 'Internet (DNS)',
      test: async () => {
        const start = Date.now()
        try {
          const testUrl = import.meta.env.VITE_CONNECTIVITY_INTERNET_URL || 'https://dns.google/resolve?name=google.com&type=A'
          const response = await fetch(testUrl, {
            method: 'GET',
            mode: 'cors'
          })
          const responseTime = Date.now() - start
          if (response.ok) {
            return { 
              status: 'success' as const, 
              message: 'Conexão com internet OK',
              responseTime,
              details: `DNS resolvido em ${responseTime}ms`
            }
          } else {
            return { 
              status: 'error' as const, 
              message: 'Falha na resolução DNS',
              responseTime,
              details: `Status: ${response.status}`
            }
          }
        } catch (error) {
          return { 
            status: 'error' as const, 
            message: 'Sem conexão com internet',
            responseTime: Date.now() - start,
            details: error instanceof Error ? error.message : 'Erro desconhecido'
          }
        }
      }
    },
    {
      name: 'WebSocket (Dispositivos)',
      test: async () => {
        const start = Date.now()
        return new Promise<Omit<ConnectionStatus, 'name'>>((resolve) => {
          const wsUrl = `ws://${import.meta.env.VITE_WS_HOST || 'localhost'}:${import.meta.env.VITE_WS_PORT || '8787'}`
          const ws = new WebSocket(wsUrl)
          
          const timeoutMs = parseInt(import.meta.env.VITE_CONNECTIVITY_TEST_TIMEOUT || '5000')
          const timeout = setTimeout(() => {
            ws.close()
            resolve({
              status: 'error',
              message: 'Timeout na conexão WebSocket',
              responseTime: Date.now() - start,
              details: `Não foi possível conectar em ${wsUrl} (timeout ${timeoutMs/1000}s)`
            })
          }, timeoutMs)

          ws.onopen = () => {
            clearTimeout(timeout)
            const responseTime = Date.now() - start
            ws.close()
            resolve({
              status: 'success',
              message: 'WebSocket conectado',
              responseTime,
              details: `Conectado ao mock de dispositivos em ${responseTime}ms`
            })
          }

          ws.onerror = () => {
            clearTimeout(timeout)
            resolve({
              status: 'error',
              message: 'Erro na conexão WebSocket',
              responseTime: Date.now() - start,
              details: `Falha ao conectar com ${wsUrl}`
            })
          }
        })
      }
    },
    {
      name: 'IndexedDB (Banco Local)',
      test: async () => {
        const start = Date.now()
        try {
          // Testa abertura do IndexedDB
          const request = indexedDB.open('test-connectivity', 1)
          
          return new Promise<Omit<ConnectionStatus, 'name'>>((resolve) => {
            request.onsuccess = () => {
              const db = request.result
              db.close()
              // Limpa o DB de teste
              indexedDB.deleteDatabase('test-connectivity')
              
              resolve({
                status: 'success',
                message: 'IndexedDB funcionando',
                responseTime: Date.now() - start,
                details: 'Banco de dados local acessível'
              })
            }

            request.onerror = () => {
              resolve({
                status: 'error',
                message: 'Erro no IndexedDB',
                responseTime: Date.now() - start,
                details: request.error?.message || 'Falha ao acessar banco local'
              })
            }
          })
        } catch (error) {
          return {
            status: 'error',
            message: 'IndexedDB não disponível',
            responseTime: Date.now() - start,
            details: error instanceof Error ? error.message : 'IndexedDB não suportado'
          }
        }
      }
    },
    {
      name: 'LocalStorage',
      test: async () => {
        const start = Date.now()
        try {
          const testKey = 'connectivity-test'
          const testValue = `test-${Date.now()}`
          
          // Testa escrita
          localStorage.setItem(testKey, testValue)
          
          // Testa leitura
          const retrieved = localStorage.getItem(testKey)
          
          // Limpa teste
          localStorage.removeItem(testKey)
          
          if (retrieved === testValue) {
            return {
              status: 'success',
              message: 'LocalStorage funcionando',
              responseTime: Date.now() - start,
              details: 'Armazenamento local acessível'
            }
          } else {
            return {
              status: 'error',
              message: 'Erro no LocalStorage',
              responseTime: Date.now() - start,
              details: 'Falha na leitura/escrita'
            }
          }
        } catch (error) {
          return {
            status: 'error',
            message: 'LocalStorage não disponível',
            responseTime: Date.now() - start,
            details: error instanceof Error ? error.message : 'LocalStorage não suportado'
          }
        }
      }
    },
    {
      name: 'Servidor de Desenvolvimento',
      test: async () => {
        const start = Date.now()
        try {
          const response = await fetch('/', {
            method: 'HEAD',
            cache: 'no-cache'
          })
          const responseTime = Date.now() - start
          
          if (response.ok) {
            return {
              status: 'success',
              message: 'Servidor local OK',
              responseTime,
              details: `Vite dev server respondendo em ${responseTime}ms`
            }
          } else {
            return {
              status: 'warning',
              message: 'Servidor com problemas',
              responseTime,
              details: `Status: ${response.status} - ${response.statusText}`
            }
          }
        } catch (error) {
          return {
            status: 'error',
            message: 'Servidor inacessível',
            responseTime: Date.now() - start,
            details: error instanceof Error ? error.message : 'Falha na conexão'
          }
        }
      }
    },
    {
      name: 'Performance (Rendering)',
      test: async () => {
        const start = Date.now()
        
        // Simula operação de rendering pesada
        return new Promise<Omit<ConnectionStatus, 'name'>>((resolve) => {
          requestAnimationFrame(() => {
            const elements = document.querySelectorAll('*')
            const responseTime = Date.now() - start
            
            if (responseTime < 16) { // 60fps = ~16ms por frame
              resolve({
                status: 'success',
                message: 'Performance excelente',
                responseTime,
                details: `${elements.length} elementos DOM em ${responseTime}ms`
              })
            } else if (responseTime < 33) { // 30fps = ~33ms
              resolve({
                status: 'warning',
                message: 'Performance moderada',
                responseTime,
                details: `${elements.length} elementos DOM em ${responseTime}ms`
              })
            } else {
              resolve({
                status: 'error',
                message: 'Performance baixa',
                responseTime,
                details: `${elements.length} elementos DOM em ${responseTime}ms (>33ms)`
              })
            }
          })
        })
      }
    }
  ]

  const runTests = async () => {
    setIsRunning(true)
    setResults([])
    
    for (const test of tests) {
      // Marca teste como iniciando
      setResults(prev => [...prev, {
        name: test.name,
        status: 'testing',
        message: 'Testando...'
      }])

      try {
        const result = await test.test()
        
        // Atualiza com resultado
        setResults(prev => prev.map(item => 
          item.name === test.name 
            ? { name: test.name, ...result } as ConnectionStatus
            : item
        ))
      } catch (error) {
        setResults(prev => prev.map(item => 
          item.name === test.name 
            ? {
                name: test.name,
                status: 'error',
                message: 'Erro no teste',
                details: error instanceof Error ? error.message : 'Erro desconhecido'
              }
            : item
        ))
      }

      // Pequena pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    setIsRunning(false)
    
    // Mostra resumo
    const summary = results.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const successCount = summary.success || 0
    const totalCount = results.length
    
    if (successCount === totalCount) {
      showToast('success', 'Conectividade OK', `Todos os ${totalCount} testes passaram`)
    } else {
      showToast('warning', 'Problemas detectados', `${successCount}/${totalCount} testes passaram`)
    }
  }

  const getStatusIcon = (status: ConnectionStatus['status']) => {
    switch (status) {
      case 'testing': return '🔄'
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      default: return '❓'
    }
  }

  const getStatusColor = (status: ConnectionStatus['status']) => {
    switch (status) {
      case 'testing': return 'var(--primary)'
      case 'success': return 'var(--success)'
      case 'warning': return 'var(--warning)'
      case 'error': return 'var(--danger)'
      default: return 'var(--muted)'
    }
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          padding: '8px 12px',
          background: 'var(--surface-2)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          color: 'var(--text)',
          cursor: 'pointer',
          fontSize: '12px',
          zIndex: 1000
        }}
        title="Teste de conectividade"
      >
        🔗 Conectividade
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 20,
      width: 400,
      maxHeight: 500,
      background: 'var(--surface)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: 1001,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--surface-2)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔗</span>
          <strong>Teste de Conectividade</strong>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '16px', maxHeight: 400, overflowY: 'auto' }}>
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={runTests}
            disabled={isRunning}
            style={{
              width: '100%',
              padding: '12px',
              background: isRunning ? 'var(--surface-2)' : 'var(--primary)',
              color: isRunning ? 'var(--muted)' : 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontWeight: 600
            }}
          >
            {isRunning ? '🔄 Testando...' : '▶️ Executar Testes'}
          </button>
        </div>

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((result, index) => (
              <div
                key={index}
                style={{
                  padding: '12px',
                  background: 'var(--surface-2)',
                  borderRadius: '8px',
                  border: `1px solid ${getStatusColor(result.status)}20`
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{getStatusIcon(result.status)}</span>
                    <strong style={{ fontSize: '14px' }}>{result.name}</strong>
                  </div>
                  {result.responseTime && (
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--muted)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {result.responseTime}ms
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: getStatusColor(result.status),
                  fontWeight: 500
                }}>
                  {result.message}
                </div>
                {result.details && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--muted)',
                    marginTop: 4,
                    opacity: 0.8
                  }}>
                    {result.details}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && !isRunning && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: 'var(--muted)',
            fontSize: '14px'
          }}>
            Clique em "Executar Testes" para verificar a conectividade
          </div>
        )}
      </div>
    </div>
  )
}