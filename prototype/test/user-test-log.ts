import fs from 'fs'
import path from 'path'

// Função para registrar resultado de teste de usuário
export interface RegistroTesteUsuario {
  data: string
  testador: string
  versao: string
  cenario: string
  passos: string[]
  resultados: string[]
  checklist: string[]
  feedback: string
}

export function registrarTesteUsuario({
  data,
  testador,
  versao,
  cenario,
  passos,
  resultados,
  checklist,
  feedback,
}: RegistroTesteUsuario) {
  const registro = {
    data,
    testador,
    versao,
    cenario,
    passos,
    resultados,
    checklist,
    feedback,
  }
  const filePath = path.join(__dirname, 'user-test-log.json')
  let logs = []
  if (fs.existsSync(filePath)) {
    logs = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  }
  logs.push(registro)
  fs.writeFileSync(filePath, JSON.stringify(logs, null, 2))
}

// Exemplo de uso:
// registrarTesteUsuario({
//   data: '2025-09-21',
//   testador: 'Fulano',
//   versao: '1.0.0',
//   cenario: 'Login com PIN',
//   passos: ['Abrir tela', 'Digitar PIN', 'Clicar Entrar'],
//   resultados: ['Acesso permitido'],
//   checklist: ['Autenticação'],
//   feedback: 'Fluxo simples e rápido.'
// })
