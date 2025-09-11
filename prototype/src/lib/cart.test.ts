import { describe, it, expect } from 'vitest'
import type { Product } from '../db/models'
import { addUnit, addWeight, increment, decrement, remove, calculateTotal } from './cart'

const productA: Product = { id: '1', name: 'Product A', price: 10.50, category: 'Pratos' }
const productB: Product = { id: '2', name: 'Product B', price: 0.1, category: 'Bebidas' }
const productC: Product = { id: '3', name: 'Product C', price: 0.2, category: 'Bebidas' }
const productByWeight: Product = { id: '4', name: 'Product D', pricePerKg: 25.00, category: 'Por Peso' }

describe('cart logic', () => {
  it('should add a unit product to the cart', () => {
    const items = addUnit([], productA)
    expect(items).toHaveLength(1)
    expect(items[0].total).toBe(10.50)
  })

  it('should add a weighted product to the cart', () => {
    const items = addWeight([], productByWeight, 1.5)
    expect(items).toHaveLength(1)
    expect(items[0].total).toBe(37.50)
  })

  it('should throw an error for invalid weight', () => {
    expect(() => addWeight([], productByWeight, 0)).toThrow('Peso inválido.')
    expect(() => addWeight([], productByWeight, -1)).toThrow('Peso inválido.')
  })

  it('should increment a product quantity', () => {
    let items = addUnit([], productA)
    items = increment(items, items[0].id)
    expect(items[0].qty).toBe(2)
    expect(items[0].total).toBe(21.00)
  })

  it('should decrement a product quantity', () => {
    let items = addUnit([], productA, 2)
    items = decrement(items, items[0].id)
    expect(items[0].qty).toBe(1)
    expect(items[0].total).toBe(10.50)
  })

  it('should remove a product if quantity is zero after decrement', () => {
    let items = addUnit([], productA)
    items = decrement(items, items[0].id)
    expect(items).toHaveLength(0)
  })

  it('should remove a product from the cart', () => {
    let items = addUnit([], productA)
    items = remove(items, items[0].id)
    expect(items).toHaveLength(0)
  })

  it('should calculate the total correctly', () => {
    let items = addUnit([], productA)
    items = addUnit(items, productB)
    items = addUnit(items, productC)
    expect(calculateTotal(items)).toBe(10.8)
  })

  it('should handle floating point issues correctly', () => {
    let items = addUnit([], productB) // 0.1
    items = addUnit(items, productC) // 0.2
    expect(calculateTotal(items)).toBe(0.3)
  })

  it('should handle repeated additions that lead to floating point issues', () => {
    let items = [];
    for (let i = 0; i < 10; i++) {
      items = addUnit(items, productB); // 0.1
    }
    expect(calculateTotal(items)).toBe(1.0);
  });

  it('should not lose precision due to double rounding', () => {
    const productE = { id: '5', name: 'Product E', price: 1.235, category: 'Pratos' };
    let items = addUnit([], productE);
    items = addUnit(items, productE);
    // Each item's total is rounded to 1.24. The sum is 2.48.
    // The correct total is round2(1.235 * 2) = round2(2.47) = 2.47.
    expect(calculateTotal(items)).toBe(2.47);
  });
})
