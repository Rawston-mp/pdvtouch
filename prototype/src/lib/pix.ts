// src/lib/pix.ts
/**
 * Geração simples de payload PIX (mock) no padrão BR Code / EMVCo.
 * NÃO USE EM PRODUÇÃO sem validar os campos e calcular CRC16 final.
 * Aqui focamos no protótipo para exibir o QR e simular recebimento.
 */

export type PixPayload = {
  txid: string
  amount: number
  merchant: string
  city: string
  key: string
  description?: string
  brcode: string   // string EMV-like (mock)
  copiaCola: string
}

/** Gera um TXID simples. Em produção: gere pelo PSP e/ou RFC4122. */
export function makeTxid(prefix = 'PDV'): string {
  const n = Math.floor(Math.random() * 1e8).toString().padStart(8, '0')
  return `${prefix}${n}`
}

/**
 * Gera um payload “mock” do PIX.
 * Em produção:
 *  - monte os campos EMV com IDs corretos,
 *  - calcule CRC16,
 *  - use o endpoint do PSP p/ gerar QR dinâmico.
 */
export function generatePixPayload(params: {
  amount: number
  key: string
  merchant?: string
  city?: string
  description?: string
  txid?: string
}): PixPayload {
  const {
    amount,
    key,
    merchant = 'PDVTouch Restaurante',
    city = 'CIDADE',
    description = 'Pagamento PDVTouch',
  } = params
  const txid = params.txid ?? makeTxid('PDV')

  // BR Code “mock” legível (para demo):
  const lines = [
    `BR.GUID=BR.GOV.BCB.PIX`,
    `TXID=${txid}`,
    `KEY=${key}`,
    `AMT=${amount.toFixed(2)}`,
    `MERCHANT=${merchant}`,
    `CITY=${city}`,
    `DESC=${description}`,
    // (CRC omitido no mock)
  ]

  const brcode = lines.join('|')
  const copiaCola = brcode

  return {
    txid,
    amount,
    merchant,
    city,
    key,
    description,
    brcode,
    copiaCola,
  }
}
