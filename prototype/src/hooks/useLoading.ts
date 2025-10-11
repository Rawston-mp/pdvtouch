// src/hooks/useLoading.ts
import React from 'react'

export function useLoading(initialState = false) {
  const [loading, setLoading] = React.useState(initialState)

  const withLoading = React.useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    options?: { minTime?: number }
  ): Promise<T> => {
    setLoading(true)
    const start = Date.now()
    
    try {
      const result = await asyncFn()
      
      // Minimum loading time para evitar flash
      const elapsed = Date.now() - start
      const minTime = options?.minTime || 300
      if (elapsed < minTime) {
        await new Promise(resolve => setTimeout(resolve, minTime - elapsed))
      }
      
      return result
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, setLoading, withLoading }
}