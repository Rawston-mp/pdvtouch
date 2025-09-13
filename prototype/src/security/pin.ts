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
  return crypto.timingSafeEqual
    ? // Node 20+; no browser não existe: compare manualmente constante:
      // @ts-ignore
      crypto.timingSafeEqual(fromB64(test), fromB64(hashB64))
    : test === hashB64;
}
