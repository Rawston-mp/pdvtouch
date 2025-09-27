// src/lib/csv.ts
// Utilitário simples de CSV com cabeçalho na primeira linha

function escapeCSV(value: any): string {
  const s = value == null ? '' : String(value)
  if (/[",\n;]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export function toCSV(rows: Array<Record<string, any>>, columns?: string[]): string {
  if (!rows || rows.length === 0) return ''
  const cols = columns && columns.length ? columns : Object.keys(rows[0])
  const head = cols.join(',')
  const body = rows
    .map((r) => cols.map((c) => escapeCSV(r[c])).join(','))
    .join('\n')
  return head + '\n' + body
}

export function parseCSV(text: string): Array<Record<string, string>> {
  if (!text) return []
  // Quebra por linhas, respeitando aspas simples
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
  if (lines.length === 0) return []
  const delimiter = detectDelimiter(lines[0])
  const header = splitCSVLine(lines[0], delimiter)
  const rows: Array<Record<string, string>> = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], delimiter)
    const obj: Record<string, string> = {}
    header.forEach((h, idx) => {
      obj[h] = cols[idx] ?? ''
    })
    rows.push(obj)
  }
  return rows
}

function detectDelimiter(headerLine: string): ',' | ';' {
  // Conta delimitadores fora de aspas
  const count = (ch: ',' | ';') => {
    let c = 0
    let inQuotes = false
    for (let i = 0; i < headerLine.length; i++) {
      const h = headerLine[i]
      if (h === '"') {
        if (headerLine[i + 1] === '"') {
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (!inQuotes && h === ch) {
        c++
      }
    }
    return c
  }
  const commas = count(',')
  const semis = count(';')
  return semis > commas ? ';' : ','
}

function splitCSVLine(line: string, delimiter: ',' | ';'): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else {
      if (ch === delimiter) {
        out.push(cur)
        cur = ''
      } else if (ch === '"') {
        inQuotes = true
      } else {
        cur += ch
      }
    }
  }
  out.push(cur)
  return out
}
