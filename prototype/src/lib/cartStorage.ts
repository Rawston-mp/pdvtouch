// src/lib/cartStorage.ts
// Rascunho de carrinho por COMANDA (orderId)
// Chaves no localStorage: pdv.cart.v1.<orderId>

export type CartItem = {
  id: string
  name: string
  unit: "unit" | "kg"
  price: number
  qty: number
  code?: string
}

const PREFIX = "pdv.cart.v1."
const CURRENT_KEY = "pdv.currentOrderId.v1"

/** Salva o rascunho de uma comanda específica. */
export function saveCartDraft(orderId: number, items: CartItem[]): void {
  if (!Number.isFinite(orderId)) return
  const key = PREFIX + String(orderId)
  localStorage.setItem(key, JSON.stringify(items ?? []))
}

/** Carrega o rascunho de uma comanda específica. */
export function loadCartDraft(orderId: number): CartItem[] | null {
  if (!Number.isFinite(orderId)) return null
  const key = PREFIX + String(orderId)
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    const arr = JSON.parse(raw) as CartItem[]
    return Array.isArray(arr) ? arr : null
  } catch {
    return null
  }
}

/** Exclui definitivamente o rascunho da comanda. */
export function removeCartDraft(orderId: number): void {
  if (!Number.isFinite(orderId)) return
  const key = PREFIX + String(orderId)
  localStorage.removeItem(key)
}

/** Lista de comandas com rascunho (simples, por varredura de chaves). */
export function listDraftOrders(): number[] {
  const out: number[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) || ""
    if (k.startsWith(PREFIX)) {
      const id = Number(k.slice(PREFIX.length))
      if (Number.isFinite(id)) out.push(id)
    }
  }
  return out.sort((a, b) => a - b)
}

/** Guarda a comanda "ativa" nesta estação. */
export function setCurrentOrderId(orderId: number): void {
  if (!Number.isFinite(orderId)) return
  localStorage.setItem(CURRENT_KEY, String(orderId))
}

export function getCurrentOrderId(): number | null {
  const raw = localStorage.getItem(CURRENT_KEY)
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function clearCurrentOrderId(): void {
  localStorage.removeItem(CURRENT_KEY)
}