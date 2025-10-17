// src/db/settings.ts
import { db } from './index'
import type { Settings, Printer, Destination, PrinterProfile } from './index'

/* ===================== Settings ===================== */

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('cfg')
  if (!s) {
    const def: Settings = {
      id: 'cfg',
      companyName: 'PDVTouch Restaurante',
      cnpj: '00.000.000/0000-00',
      addressLine1: 'Rua Exemplo, 123 - Centro',
      addressLine2: 'Cidade/UF',
    }
    await db.settings.put(def)
    return def
  }
  return s
}

export async function saveSettings(cfg: Settings) {
  await db.settings.put({ ...cfg, id: 'cfg' })
}

/* ===================== Impressoras ===================== */

export async function listPrinters(): Promise<Printer[]> {
  return db.printers.toArray()
}

/** Compatível com o que o Configuracoes.tsx espera */
export async function upsertPrinter(p: Printer): Promise<string> {
  if (p.id) {
    await db.printers.put(p)
    return p.id
  }
  return db.printers.add(p)
}

export async function deletePrinter(id: string) {
  await db.printers.delete(id)
}

/**
 * Atualiza TODAS as impressoras para usar o mesmo profileId.
 * Útil para “aplicar perfil em todas”.
 */
export async function setAllPrintersProfile(profileId: string | null) {
  const all = await db.printers.toArray()
  await db.transaction('rw', db.printers, async () => {
    for (const p of all) {
      await db.printers.update(p.id!, { profile: (profileId ?? undefined) as unknown as Printer['profile'] })
    }
  })
}

/** Busca impressora mapeada para um destino/rota (ex.: "COZINHA", "BAR") */
export async function findPrinterByDestination(destCode: string): Promise<Printer | null> {
  const code = (destCode || '').trim()
  if (!code) return null
  const p = await db.printers.where('destination').equals(code as unknown as Printer['destination']).first()
  return p ?? null
}

/* ===================== Perfis de impressão ===================== */

// Perfis/destinos não existem no schema atual; stubs para evitar quebras
export async function listProfiles(): Promise<PrinterProfile[]> { return [] }
export async function saveProfile() { return '' as unknown as string }
export async function removeProfile() { return }

/* ===================== Destinos/Rotas ===================== */

export async function listDestinations(): Promise<Destination[]> { return [] }
export async function saveDestination() { return '' as unknown as string }
export async function removeDestination() { return }
