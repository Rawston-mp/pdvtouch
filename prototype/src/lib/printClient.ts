// src/lib/printClient.ts
// Mock básico para impressão

export async function printRaw(data: Uint8Array, route: string): Promise<void> {
  console.log(`[PRINT] Mock: enviando dados para rota ${route}`, data)
  // Mock: não faz nada realmente
}