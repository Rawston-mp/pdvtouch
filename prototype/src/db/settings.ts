// src/db/settings.ts
import { db, type Destination, type Printer, type PrinterProfile, type Settings } from "./index"

// ---- SETTINGS ----
export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get("cfg")
  if (s) return s
  const def: Settings = {
    id: "cfg",
    companyName: "PDVTouch Restaurante",
    cnpj: "00.000.000/0000-00",
    addressLine1: "Rua Exemplo, 123 - Centro",
    addressLine2: "Cidade/UF",
  }
  await db.settings.put(def)
  return def
}

export async function saveSettings(data: Partial<Settings>) {
  const current = await getSettings()
  await db.settings.put({ ...current, ...data })
}

// ---- PRINTERS ----
export async function listPrinters(): Promise<Printer[]> {
  return db.printers.toArray()
}

export async function upsertPrinter(p: Printer) {
  await db.printers.put(p)
}

export async function deletePrinter(id: string) {
  await db.printers.delete(id)
}

export async function setAllPrintersProfile(profile: PrinterProfile) {
  const all = await db.printers.toArray()
  await db.printers.bulkPut(all.map(p => ({ ...p, profile })))
}

export async function findPrinterByDestination(dest: Destination): Promise<Printer | undefined> {
  const all = await db.printers.toArray()
  return all.find(p => p.destination === dest)
}
