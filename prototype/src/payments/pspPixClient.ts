// src/payments/pspPixClient.ts
const BASE = 'http://localhost:7070';

export type PixCharge = {
  txid: string;
  amount: number;
  status: 'ATIVA' | 'CONCLUIDA' | 'REMOVIDA';
  qrImage?: string;        // base64 opcional
  copiaECola?: string;     // payload BRCode
  expiresAt?: string;
};

export async function createPixCharge(amount: number, meta?: any): Promise<PixCharge> {
  const res = await fetch(`${BASE}/psp/pix/charges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, meta }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getPixCharge(txid: string): Promise<PixCharge> {
  const res = await fetch(`${BASE}/psp/pix/charges/${txid}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
