// prototype/mock/ws-server.mjs
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 8787 })
console.log('[WS] Mock server listening on ws://localhost:8787')

wss.on('connection', (ws) => {
  console.log('[WS] client connected')

  ws.on('message', (raw) => {
    const msg = raw.toString()
    try {
      const data = JSON.parse(msg)

      if (data.type === 'GET_WEIGHT') {
        // simula leitura estabilizada da balança
        const weight = (Math.random() * 0.8 + 0.2).toFixed(3) // 0.200 ~ 1.000 kg
        ws.send(JSON.stringify({ type: 'WEIGHT', kg: weight }))
      }

      if (data.type === 'PRINT') {
        // simula impressão: apenas loga
        console.log('[PRINT]', data.payload?.text?.slice(0, 80))
        ws.send(JSON.stringify({ type: 'PRINT_OK', id: data.payload?.id }))
      }
    } catch (e) {
      console.error('WS parse error', e)
    }
  })
})
