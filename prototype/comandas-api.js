const express = require('express')
const fs = require('fs')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 4000

app.use(express.json())

// Caminho do arquivo de registro
const REGISTRO_PATH = path.join(__dirname, 'comandas-log.json')

// Endpoint para registrar comanda
app.post('/api/comandas', (req, res) => {
  const { comanda, balanca, usuario, data } = req.body
  if (!comanda || !balanca || !usuario) {
    return res.status(400).json({ error: 'Dados obrigatórios ausentes.' })
  }
  let registros = []
  if (fs.existsSync(REGISTRO_PATH)) {
    registros = JSON.parse(fs.readFileSync(REGISTRO_PATH, 'utf8'))
  }
  registros.push({ comanda, balanca, usuario, data })
  fs.writeFileSync(REGISTRO_PATH, JSON.stringify(registros, null, 2))
  res.json({ ok: true })
})

// Endpoint para consultar registros
app.get('/api/comandas', (req, res) => {
  if (!fs.existsSync(REGISTRO_PATH)) return res.json([])
  const registros = JSON.parse(fs.readFileSync(REGISTRO_PATH, 'utf8'))
  res.json(registros)
})

app.listen(PORT, () => {
  console.log(`Servidor de registro rodando na porta ${PORT}`)
})
