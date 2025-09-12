// src/fiscal/client.ts
import { NfceSale, NfceAuthResponse } from './types';

const BASE = 'http://localhost:7070';

export async function emitNfce(sale: NfceSale): Promise<NfceAuthResponse> {
  const res = await fetch(`${BASE}/fiscal/nfce/emit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sale),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Bridge error: ${res.status} ${msg}`);
  }
  return res.json();
}

export async function cancelNfce(chNFe: string, reason: string) {
  const res = await fetch(`${BASE}/fiscal/nfce/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chNFe, reason }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
