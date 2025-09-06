// src/db/settings.ts
import { db, initDb } from './index'
import type { Settings, Printer, Destination, PrinterProfile } from './models'

export async function getSettings(): Promise<Settings> {
  await initDb()
  const s = await db.settings.get('cfg')
  if (!s) {
    const def: Settings = {
      id: 'cfg',
      companyName: 'PDVTouch Restaurante',
      cnpj: '00.000.000/0000-00',
      addressLine1: 'Rua Exemplo, 123 - Centro',
      addressLine2: 'Cidade/UF'
    }
    await db.settings.put(def)
    return def
  }
  return s
}

export async function saveSettings(p: Partial<Settings>) {
  const cur = await getSettings()
  await db.settings.put({ ...cur, ...p })
}

export async function listPrinters(): Promise<Printer[]> {
  await initDb()
  return db.printers.toArray()
}

export async function upsertPrinter(p: Partial<Printer> & { name: string; destination: Destination; profile: PrinterProfile; id?: number }) {
  await initDb()
  if (p.id) {
    await db.printers.put(p as Printer)
  } else {
    await db.printers.add(p as Printer)
  }
}

export async function deletePrinter(id: number) {
  await initDb()
  await db.printers.delete(id)
}

export async function findPrinterByDestination(dest: Destination): Promise<Printer | undefined> {
  await initDb()
  return db.printers.where('destination').equals(dest).first()
}

/** Define o mesmo perfil para TODAS as impressoras (ex.: 'ELGIN', 'GENERIC', 'BEMATECH') */
export async function setAllPrintersProfile(profile: PrinterProfile) {
  await initDb()
  const all = await db.printers.toArray()
  if (!all.length) return
  const updated = all.map(p => ({ ...p, profile }))
  await db.printers.bulkPut(updated)
}
