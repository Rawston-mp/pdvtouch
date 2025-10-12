// src/lib/escpos.ts
// Sistema ESC/POS básico para impressoras térmicas

// Comandos ESC/POS básicos
const ESC = 0x1B
const GS = 0x1D
const LF = 0x0A

interface PrintParams {
  title?: string
  items?: Array<{ name: string; qty: number; price: number; total: number }>
  total?: number
  orderId?: number
  timestamp?: number
  footer?: string[]
}

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function addCommand(buffer: number[], ...bytes: number[]): void {
  buffer.push(...bytes)
}

function addText(buffer: number[], text: string): void {
  buffer.push(...textToBytes(text))
}

function addLine(buffer: number[], text: string = ''): void {
  addText(buffer, text)
  buffer.push(LF)
}

export function buildCustomerCoupon(params: PrintParams): Uint8Array {
  const buffer: number[] = []
  
  // Inicializa impressora
  addCommand(buffer, ESC, 0x40) // Reset
  addCommand(buffer, ESC, 0x61, 0x01) // Centralizar
  
  // Título
  addCommand(buffer, ESC, 0x21, 0x30) // Texto grande
  addLine(buffer, params.title || 'RESTAURANTE')
  addCommand(buffer, ESC, 0x21, 0x00) // Texto normal
  
  // Separador
  addLine(buffer, '================================')
  
  // Data/hora e comanda
  if (params.timestamp) {
    addLine(buffer, new Date(params.timestamp).toLocaleString('pt-BR'))
  }
  if (params.orderId) {
    addLine(buffer, `Comanda: ${params.orderId}`)
  }
  
  addLine(buffer, '================================')
  
  // Itens
  if (params.items) {
    for (const item of params.items) {
      addLine(buffer, item.name)
      addLine(buffer, `${item.qty.toFixed(3)} x R$ ${item.price.toFixed(2)} = R$ ${item.total.toFixed(2)}`)
    }
    
    addLine(buffer, '--------------------------------')
    addLine(buffer, `TOTAL: R$ ${(params.total || 0).toFixed(2)}`)
  }
  
  // Footer
  if (params.footer) {
    addLine(buffer, '================================')
    for (const line of params.footer) {
      addLine(buffer, line)
    }
  }
  
  // Corte parcial
  addLine(buffer)
  addLine(buffer)
  addCommand(buffer, GS, 0x56, 0x01) // Corte parcial
  
  return new Uint8Array(buffer)
}

export function ticketKitchen(params: PrintParams): Uint8Array {
  const buffer: number[] = []
  
  // Inicializa impressora
  addCommand(buffer, ESC, 0x40) // Reset
  addCommand(buffer, ESC, 0x61, 0x01) // Centralizar
  
  // Título cozinha
  addCommand(buffer, ESC, 0x21, 0x30) // Texto grande
  addLine(buffer, '*** COZINHA ***')
  addCommand(buffer, ESC, 0x21, 0x00) // Texto normal
  
  // Comanda e hora
  if (params.orderId) {
    addCommand(buffer, ESC, 0x21, 0x20) // Texto médio
    addLine(buffer, `COMANDA ${params.orderId}`)
    addCommand(buffer, ESC, 0x21, 0x00) // Texto normal
  }
  
  addLine(buffer, new Date().toLocaleTimeString('pt-BR'))
  addLine(buffer, '========================')
  
  // Itens apenas da cozinha (filtrar bebidas se necessário)
  if (params.items) {
    addCommand(buffer, ESC, 0x61, 0x00) // Alinhar à esquerda
    for (const item of params.items) {
      addCommand(buffer, ESC, 0x21, 0x10) // Negrito
      addLine(buffer, `${item.qty.toFixed(0)}x ${item.name}`)
      addCommand(buffer, ESC, 0x21, 0x00) // Normal
    }
  }
  
  addLine(buffer)
  addLine(buffer)
  addCommand(buffer, GS, 0x56, 0x01) // Corte parcial
  
  return new Uint8Array(buffer)
}

export function tefReceipt(params: PrintParams & { nsu?: string; brand?: string }): Uint8Array {
  const buffer: number[] = []
  
  // Inicializa impressora
  addCommand(buffer, ESC, 0x40) // Reset
  addCommand(buffer, ESC, 0x61, 0x01) // Centralizar
  
  // Título
  addLine(buffer, 'COMPROVANTE TEF')
  addLine(buffer, '==================')
  
  // Dados do TEF
  if (params.brand) {
    addLine(buffer, `Bandeira: ${params.brand}`)
  }
  if (params.nsu) {
    addLine(buffer, `NSU: ${params.nsu}`)
  }
  
  addLine(buffer, `Valor: R$ ${(params.total || 0).toFixed(2)}`)
  addLine(buffer, new Date().toLocaleString('pt-BR'))
  
  addLine(buffer)
  addLine(buffer, 'Via do Estabelecimento')
  addLine(buffer)
  addCommand(buffer, GS, 0x56, 0x01) // Corte parcial
  
  return new Uint8Array(buffer)
}