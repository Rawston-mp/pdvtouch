let socket: WebSocket | null = null

// Garante conexão com o servidor WS mock
export function connectDevices() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return socket
  }

  socket = new WebSocket('ws://localhost:8787')

  socket.onopen = () => console.log('[WS] Conectado ao mock')
  socket.onclose = () => console.log('[WS] Conexão encerrada')
  socket.onerror = (err) => console.error('[WS] Erro', err)

  return socket
}

// Solicita peso da balança
export function requestWeight(): Promise<number> {
  return new Promise((resolve, reject) => {
    const ws = connectDevices()
    if (!ws) return reject('WebSocket não disponível')

    const onMsg = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.type === 'WEIGHT') {
          ws.removeEventListener('message', onMsg)
          resolve(Number(data.kg))
        }
      } catch (e) {
        reject(e)
      }
    }

    ws.addEventListener('message', onMsg)

    // envia requisição
    ws.send(JSON.stringify({ type: 'GET_WEIGHT' }))

    // timeout de 3s
    setTimeout(() => {
      ws.removeEventListener('message', onMsg)
      reject(new Error('timeout lendo balança'))
    }, 3000)
  })
}

// Envia texto para impressão mock
export function printText(id: string, text: string) {
  const ws = connectDevices()
  ws?.send(JSON.stringify({ type: 'PRINT', payload: { id, text } }))
}
