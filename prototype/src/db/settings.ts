// src/db/settings.ts
import { db } from './index'
import type { Settings, Printer, Destination, PrinterProfile } from './models'

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
export async function upsertPrinter(p: Printer): Promise<number> {
  if (p.id) {
    await db.printers.put(p)
    return p.id
  }
  return db.printers.add(p)
}

export async function deletePrinter(id: number) {
  await db.printers.delete(id)
}

/**
 * Atualiza TODAS as impressoras para usar o mesmo profileId.
 * Útil para “aplicar perfil em todas”.
 */
export async function setAllPrintersProfile(profileId: number | null) {
  const all = await db.printers.toArray()
  await db.transaction('rw', db.printers, async () => {
    for (const p of all) {
      await db.printers.update(p.id!, { profileId: profileId ?? undefined })
    }
  })
}

/** Busca impressora mapeada para um destino/rota (ex.: "COZINHA", "BAR") */
export async function findPrinterByDestination(destCode: string): Promise<Printer | null> {
  const code = (destCode || '').trim()
  if (!code) return null
  const p = await db.printers.where('destination').equals(code).first()
  return p ?? null
}

/* ===================== Perfis de impressão ===================== */

export async function listProfiles(): Promise<PrinterProfile[]> {
  return db.profiles.toArray()
}

export async function saveProfile(profile: PrinterProfile) {
  if (profile.id) {
    await db.profiles.put(profile)
    return profile.id
  }
  return db.profiles.add(profile)
}

export async function removeProfile(id: number) {
  await db.profiles.delete(id)
}

/* ===================== Destinos/Rotas ===================== */

export async function listDestinations(): Promise<Destination[]> {
  return db.destinations.toArray()
}

export async function saveDestination(dest: Destination) {
  if (dest.id) {
    await db.destinations.put(dest)
    return dest.id
  }
  return db.destinations.add(dest)
}

export async function removeDestination(id: number) {
  await db.destinations.delete(id)
}
