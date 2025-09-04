import type { OrderItem } from '../db/models'
const KEY = 'pdv_cart_v1'

export type CartSnapshot = {
  items: OrderItem[]
  total: number
}

export function saveCart(snap: CartSnapshot) {
  localStorage.setItem(KEY, JSON.stringify(snap))
}

export function loadCart(): CartSnapshot | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function clearCartStorage() {
  localStorage.removeItem(KEY)
}
