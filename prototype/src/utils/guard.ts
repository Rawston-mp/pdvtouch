// src/utils/guard.ts
import type { Role } from '../db/models'
const order: Role[] = ['CAIXA', 'GERENTE', 'ADMIN']
export function roleGte(a: Role, b: Role) { return order.indexOf(a) >= order.indexOf(b) }
