// src/lib/printClient.ts
// Sistema de impressão com WebSocket e fallback

export async function printRaw(data: Uint8Array, route: string): Promise<void> {
  try {
    // Tenta imprimir via WebSocket (servidor de impressão)
    const response = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route,
        data: Array.from(data), // Convert Uint8Array to regular array for JSON
        timestamp: Date.now()
      })
    })
    
    if (!response.ok) {
      throw new Error(`Erro na impressão: ${response.status}`)
    }
    
    console.log(`✅ [PRINT] Enviado para impressora: ${route}`)
  } catch (error) {
    // Fallback: salva no localStorage para impressão posterior
    console.warn(`⚠️ [PRINT] Falha na impressão, salvando para tentar depois:`, error)
    
    const printQueue = JSON.parse(localStorage.getItem('printQueue') || '[]')
    printQueue.push({
      id: Date.now(),
      route,
      data: Array.from(data),
      timestamp: Date.now(),
      attempts: 0
    })
    localStorage.setItem('printQueue', JSON.stringify(printQueue))
    
    // Agenda nova tentativa em 30 segundos
    setTimeout(() => retryPrintQueue(), 30000)
  }
}

// Tenta imprimir itens da fila offline
export async function retryPrintQueue(): Promise<void> {
  const printQueue = JSON.parse(localStorage.getItem('printQueue') || '[]')
  const successful: number[] = []
  
  for (const item of printQueue) {
    if (item.attempts >= 3) continue // Máximo 3 tentativas
    
    try {
      await printRaw(new Uint8Array(item.data), item.route)
      successful.push(item.id)
    } catch {
      item.attempts++
    }
  }
  
  // Remove itens impressos com sucesso
  const remaining = printQueue.filter((item: { id: number }) => !successful.includes(item.id))
  localStorage.setItem('printQueue', JSON.stringify(remaining))
  
  if (remaining.length > 0) {
    console.log(`📄 [PRINT] ${successful.length} impressos, ${remaining.length} restantes na fila`)
  }
}