// src/lib/pix.ts
// Mock básico para PIX

export function generatePixPayload(params: {
  amount: number
  key: string
  txid: string
  merchant: string
  city: string
  description: string
}): { copiaCola: string; amount: number; txid: string; key: string } {
  return {
    copiaCola: `00020126580014BR.GOV.BCB.PIX0136${params.key}52040000530398654${params.amount.toFixed(2)}5802BR5913${params.merchant}6009${params.city}`,
    amount: params.amount,
    txid: params.txid,
    key: params.key,
  }
}

export function makeTxid(prefix: string): string {
  return `${prefix}${Date.now()}`
}