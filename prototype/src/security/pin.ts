// src/security/pin.ts
const ITER = 120_000; // PBKDF2 rounds (ajuste conforme CPU)
const LEN = 32;

function toBuf(s: string) { return new TextEncoder().encode(s); }
function toB64(a: ArrayBuffer) { return btoa(String.fromCharCode(...new Uint8Array(a))); }
function fromB64(s: string) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }

export async function hashPin(pin: string, saltB64?: string) {
  const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', toBuf(pin), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    key,
    LEN * 8
  );
  return { hashB64: toB64(bits), saltB64: toB64(salt.buffer) };
}

export async function verifyPin(pin: string, hashB64: string, saltB64: string) {
  const { hashB64: test } = await hashPin(pin, saltB64);
  // Comparação aproximada em tempo constante para browser
  const enc = new TextEncoder()
  const aa = enc.encode(test)
  const bb = enc.encode(hashB64)
  if (aa.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i]
  return diff === 0;
}
