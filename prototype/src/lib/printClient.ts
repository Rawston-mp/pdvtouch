// src/lib/printClient.ts
// Cliente HTTP simples para enviar bytes ao Bridge local (ou WS se preferir)

const BASE = 'http://localhost:7070';

export async function printRaw(bytes: Uint8Array, destination?: string) {
  const b64 = toBase64(bytes);

  const res = await fetch(`${BASE}/print/raw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64: b64, destination }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => `${res.status}`);
    throw new Error(`Falha ao imprimir: ${res.status} ${msg}`);
  }
  return res.json().catch(() => ({}));
}

export function toBase64(u8: Uint8Array) {
  let binary = '';
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary);
}
