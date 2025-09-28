// src/domain/schemas.ts
import * as z from 'zod'

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.number().int().positive(),
  name: z.string().min(1),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
  isWeight: z.boolean()
})

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  method: z.enum(['CASH', 'TEF', 'PIX', 'VOUCHER']),
  amount: z.number().nonnegative(),
  authCode: z.string().optional(),
  meta: z.record(z.any()).optional()
})

export const OrderSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.number().int(),
  status: z.enum(['OPEN', 'PAID', 'CANCELED']),
  items: z.array(OrderItemSchema).min(1),
  payments: z.array(PaymentSchema).default([]),
  total: z.number().nonnegative(),
  notes: z.string().optional()
})

export type OrderItemDTO = z.infer<typeof OrderItemSchema>
export type PaymentDTO   = z.infer<typeof PaymentSchema>
export type OrderDTO     = z.infer<typeof OrderSchema>
