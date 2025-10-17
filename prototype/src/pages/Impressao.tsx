// src/pages/Impressao.tsx
import React, { useState } from 'react'
import { buildCustomerCoupon, ticketKitchen, tefReceipt } from '../lib/escpos'
import { printRaw } from '../lib/printClient'

export default function Impressao() {
  const [status, setStatus] = useState<string>('')

  async function imprimirCupomCliente() {
    try {
      setStatus('Gerando cupom do cliente...')
      const bytes = buildCustomerCoupon({
        title: 'PDVTouch Restaurante',
        items: [
          { name: 'Buffet', qty: 0.701, price: 69.90, total: 49.00 },
          { name: 'Suco Natural 300ml', qty: 1, price: 8.00, total: 8.00 },
        ],
        total: 57.00,
        orderId: 123,
        timestamp: Date.now(),
        footer: ['Volte sempre!'],
      })
      setStatus('Enviando para impressora (CAIXA)...')
      await printRaw(bytes, 'CAIXA')
      setStatus('Cupom do cliente impresso com sucesso (mock).')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setStatus(`Erro: ${msg}`)
    }
  }

  async function imprimirCozinha() {
    try {
      setStatus('Gerando ticket de cozinha...')
      const bytes = ticketKitchen({
        title: 'PDVTouch Restaurante — COZINHA',
        orderId: 123,
        items: [
          { name: 'Picanha', qty: 2, price: 0, total: 0 },
          { name: 'Batata frita', qty: 1, price: 0, total: 0 },
        ],
      })
      setStatus('Enviando para impressora (COZINHA)...')
      await printRaw(bytes, 'COZINHA')
      setStatus('Ticket de cozinha impresso com sucesso (mock).')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setStatus(`Erro: ${msg}`)
    }
  }

  async function imprimirTef() {
    try {
      setStatus('Gerando comprovante TEF...')
      const bytes = tefReceipt({ total: 49.90, nsu: '123456', brand: 'VISA' })
      setStatus('Enviando para impressora (CAIXA)...')
      await printRaw(bytes, 'CAIXA')
      setStatus('Comprovante TEF impresso com sucesso (mock).')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setStatus(`Erro: ${msg}`)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Impressão — Testes ESC/POS</h2>
      <p>Use os botões para validar a comunicação com o Bridge.</p>

      <div style={row}>
        <button onClick={imprimirCupomCliente} style={btn}>Imprimir Cupom do Cliente</button>
        <button onClick={imprimirCozinha} style={btn}>Imprimir Cozinha</button>
        <button onClick={imprimirTef} style={btn}>Imprimir Comprovante TEF</button>
      </div>

      <pre style={pre}>{status || 'Pronto.'}</pre>
    </div>
  )
}

const row: React.CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }
const btn: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: '1px solid #ddd', cursor: 'pointer', background: '#fff' }
const pre: React.CSSProperties = { background: '#f8f8f8', padding: 12, borderRadius: 8, border: '1px solid #eee', marginTop: 16 }