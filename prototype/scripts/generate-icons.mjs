// Gera ícones PWA a partir de um logo (SVG/PNG)
// Uso:
//   node scripts/generate-icons.mjs assets/logo.svg
// Saídas em public/icons e public/apple-touch-icon.png

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(process.cwd())
const outDir = path.join(root, 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

const argv = process.argv.slice(2)
const overwriteSmall = argv.includes('--overwrite-small')
const provided = argv.find((a) => !a.startsWith('-'))
const defaultInput = path.join('src', 'assets', 'logo.svg')
const inputPath = path.resolve(root, provided || defaultInput)
if (!fs.existsSync(inputPath)) {
  console.error('Arquivo não encontrado:', inputPath)
  console.error('Uso:')
  console.error('  node scripts/generate-icons.mjs <caminho-do-logo.svg|png>')
  console.error('Exemplo:')
  console.error('  npm run icons -- src/assets/logo.png')
  process.exit(1)
}
if (!fs.existsSync(inputPath)) {
  console.error('Arquivo não encontrado:', inputPath)
  process.exit(1)
}

const sizes = [16, 32, 48, 72, 96, 144, 180, 192, 256, 384, 512]
const PRESERVE_SMALL = !overwriteSmall // por padrão preserva 16/32, a não ser que passe --overwrite-small
const GENERATE_ICO = true // gerar public/favicon.ico a partir de 16/32/48

const padColor = { r: 0, g: 0, b: 0, alpha: 0 } // padding transparente para maskable

async function generate() {
  console.log('Gerando ícones a partir de', inputPath)
  if (!PRESERVE_SMALL) console.log('Sobrescrevendo 16/32 (flag --overwrite-small)')
  for (const s of sizes) {
    const out = s === 180
      ? path.join(root, 'public', 'apple-touch-icon.png')
      : path.join(outDir, `icon-${s}.png`)
    // preserva 16x16 e 32x32 se já existirem
    if (PRESERVE_SMALL && (s === 16 || s === 32) && fs.existsSync(out)) {
      console.log('↷ preservado (já existe):', path.relative(root, out))
      continue
    }
    await sharp(inputPath)
      .resize(s, s, { fit: 'contain', background: padColor })
      .png()
      .toFile(out)
    console.log('✔', path.relative(root, out))
  }
  if (GENERATE_ICO) {
    await generateFaviconIco()
  }
}

generate().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function generateFaviconIco() {
  // to-ico converte buffers PNG em um .ico multi-tamanho
  const icoPath = path.join(root, 'public', 'favicon.ico')
  const pngPaths = [16, 32, 48].map((s) => path.join(outDir, `icon-${s}.png`))
  // Garante que os arquivos existam (devem existir após generate())
  for (const p of pngPaths) {
    if (!fs.existsSync(p)) {
      console.warn('Aviso: PNG não encontrado para ICO:', path.relative(root, p))
    }
  }
  const { default: pngToIco } = await import('png-to-ico')
  const bufs = pngPaths
    .filter((p) => fs.existsSync(p))
    .map((p) => fs.readFileSync(p))
  if (bufs.length === 0) {
    console.warn('Nenhum PNG disponível para gerar favicon.ico')
    return
  }
  const icoBuf = await pngToIco(bufs)
  fs.writeFileSync(icoPath, icoBuf)
  console.log('✔', path.relative(root, icoPath))
}
