// src/db/categories.ts
import { db } from "./index"

export interface Category {
  id: string
  name: string
  active: boolean
}

export async function listCategories(): Promise<Category[]> {
  return await db.categories.toArray()
}

export async function addCategory(name: string): Promise<Category> {
  const cat: Omit<Category, "id"> = { name, active: true }
  const id = await db.categories.add({ ...cat, id: crypto.randomUUID() })
  return { ...cat, id: String(id) }
}

export async function updateCategory(cat: Category): Promise<void> {
  if (!cat.id) return
  await db.categories.update(cat.id, cat)
}

export async function removeCategory(id: string): Promise<void> {
  await db.categories.delete(id)
}
