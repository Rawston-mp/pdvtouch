let socket: WebSocket | null = null

// Garante conexão com o servidor WS mock
export function connectDevices() {
  // Reusa conexão existente se estiver aberta ou conectando
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket
  }

  // Se existir uma conexão antiga encerrando/encerrada, fecha por segurança
  if (socket && (socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED)) {
    try { socket.close() } catch {}
  }

  socket = new WebSocket('ws://localhost:8787')

  socket.onopen = () => console.log('[WS] Conectado ao mock')
  socket.onclose = () => console.log('[WS] Conexão encerrada')
  socket.onerror = (err) => console.error('[WS] Erro', err)

  return socket
}

export function getCurrentSocket(): WebSocket | null {
  return socket
}

export function reconnectDevices(): WebSocket | null {
  try {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      try { socket.close() } catch {}
    }
  } catch {}
  socket = null
  return connectDevices()
}

async function waitForOpen(ws: WebSocket, timeoutMs = 1500): Promise<WebSocket> {
  if (ws.readyState === WebSocket.OPEN) return ws
  if (ws.readyState !== WebSocket.CONNECTING) {
    // tenta reconectar
    ws = connectDevices()!
    if (ws.readyState === WebSocket.OPEN) return ws
  }
  return new Promise((resolve, reject) => {
    const onOpen = () => {
      cleanup()
      resolve(ws)
    }
    const onError = (e: Event) => {
      cleanup()
      reject(e)
    }
    const onClose = () => {
      cleanup()
      reject(new Error('WS fechado durante conexão'))
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('WS timeout ao conectar'))
    }, timeoutMs)

    function cleanup() {
      clearTimeout(timer)
      ws.removeEventListener('open', onOpen)
      ws.removeEventListener('error', onError)
      ws.removeEventListener('close', onClose)
    }

    ws.addEventListener('open', onOpen, { once: true })
    ws.addEventListener('error', onError, { once: true })
    ws.addEventListener('close', onClose, { once: true })
  })
}

// Solicita peso da balança
export function requestWeight(): Promise<number> {
  return new Promise(async (resolve, reject) => {
    let ws = connectDevices()
    if (!ws) return reject('WebSocket não disponível')

    try {
      ws = await waitForOpen(ws)
    } catch (e) {
      return reject(e)
    }

    const onMsg = (ev: MessageEvent) => {
      try {
        const data = JSON.parse((ev as any).data)
        if (data.type === 'WEIGHT') {
          cleanup()
          resolve(Number(data.kg))
        }
      } catch (e) {
        cleanup()
        reject(e)
      }
    }

    const onClose = () => { cleanup(); reject(new Error('WS fechado durante leitura')) }
    const onError = (e: Event) => { cleanup(); reject(e) }

    ws.addEventListener('message', onMsg)
    ws.addEventListener('close', onClose, { once: true })
    ws.addEventListener('error', onError, { once: true })

    function cleanup() {
      clearTimeout(timer)
      ws.removeEventListener('message', onMsg)
      ws.removeEventListener('close', onClose)
      ws.removeEventListener('error', onError)
    }

    try {
      ws.send(JSON.stringify({ type: 'GET_WEIGHT' }))
    } catch (e) {
      cleanup()
      return reject(e)
    }

    // timeout de 3s
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('timeout lendo balança'))
    }, 3000)
  })
}

// Envia texto para impressão mock
export function printText(id: string, text: string) {
  const ws = connectDevices()
  if (!ws) return
  if (ws.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify({ type: 'PRINT', payload: { id, text } })) } catch {}
    return
  }
  // Se ainda conectando, envia após abrir
  waitForOpen(ws).then((sock) => {
    try { sock.send(JSON.stringify({ type: 'PRINT', payload: { id, text } })) } catch {}
  }).catch((e) => {
    console.warn('[WS] Não foi possível imprimir (sem conexão):', e)
  })
}