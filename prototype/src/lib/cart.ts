import type { OrderItem, Product } from '../db/models'

const round2 = (n: number) => Math.round(n * 100) / 100

export function addUnit(items: OrderItem[], p: Product, qty = 1): OrderItem[] {
  const item: OrderItem = {
    id: crypto.randomUUID(),
    productId: p.id!,
    name: p.name,
    qty,
    unitPrice: p.price ?? 0,
    total: (p.price ?? 0) * qty,
    isWeight: false,
    route: p.route
  }
  return [...items, item]
}

export function addWeight(items: OrderItem[], p: Product, kg: number): OrderItem[] {
  const priceKg = p.pricePerKg ?? 0
  const item: OrderItem = {
    id: crypto.randomUUID(),
    productId: p.id!,
    name: p.name,
    qty: kg,
    unitPrice: priceKg,
    total: kg * priceKg,
    isWeight: true,
    route: p.route
  }
  if (item.qty <= 0 || item.total <= 0) {
    throw new Error('Peso inválido.')
  }
  return [...items, item]
}

export function increment(items: OrderItem[], id: string): OrderItem[] {
  return items.map(i => i.id === id ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.unitPrice } : i)
}

export function decrement(items: OrderItem[], id: string): OrderItem[] {
  return items.flatMap(i => {
    if (i.id !== id) return [i]
    const q = i.qty - 1
    return q <= 0 ? [] : [{ ...i, qty: q, total: q * i.unitPrice }]
  })
}

export function remove(items: OrderItem[], id: string): OrderItem[] {
  return items.filter(i => i.id !== id)
}

export function calculateTotal(items: OrderItem[]): number {
  const total = items.reduce((s, i) => s + i.total, 0)
  return round2(total)
}
