// src/utils/quickFix.ts
// Fix rápido para o problema de PIN

import { db, hashPin } from '../db'

export async function quickLoginFix() {
  console.log('🔧 [QUICK-FIX] Aplicando correção rápida para login...')

  try {
    // Primeiro, vamos ver o que temos no banco
    const users = await db.users.toArray()
    console.log(`👥 [QUICK-FIX] Usuários encontrados: ${users.length}`)

    if (users.length === 0) {
      console.log('📝 [QUICK-FIX] Nenhum usuário encontrado. Criando usuários...')

      // Criar usuários diretamente
      const testUsers = [
        { name: 'Admin', role: 'ADMIN', pin: '1111' },
        { name: 'Balança A', role: 'BALANÇA A', pin: '2222' },
        { name: 'Balança B', role: 'BALANÇA B', pin: '2233' },
        { name: 'Gerente', role: 'GERENTE', pin: '3333' },
        { name: 'Caixa', role: 'CAIXA', pin: '4444' },
        { name: 'Atendente', role: 'ATENDENTE', pin: '5555' },
      ]

      for (let i = 0; i < testUsers.length; i++) {
        const u = testUsers[i]
        const hash = await hashPin(u.pin)

        await db.users.put({
          id: `quick_${i + 1}`,
          name: u.name,
          role: u.role as any,
          active: true,
          pinHash: hash,
        })

        console.log(`✅ [QUICK-FIX] Criado: ${u.name} (${u.pin})`)
      }
    }

    // Testar login com cada PIN
    console.log('🧪 [QUICK-FIX] Testando todos os PINs...')
    const pins = ['1111', '2222', '2233', '3333', '4444', '5555']

    for (const pin of pins) {
      const hash = await hashPin(pin)
      const user = await db.users
        .where('pinHash')
        .equals(hash)
        .and((u) => u.active)
        .first()
      console.log(`   PIN ${pin}: ${user ? `✅ ${user.name}` : '❌ Falhou'}`)
    }

    return true
  } catch (error) {
    console.error('❌ [QUICK-FIX] Erro:', error)
    return false
  }
}

// Função de teste simples sem hash
export async function testSimpleLogin(pin: string) {
  console.log(`🔑 [SIMPLE-TEST] Testando PIN ${pin} de forma simples...`)

  // Buscar usuário por PIN diretamente (sem hash)
  const users = await db.users.toArray()

  // Para teste, vamos criar um mapeamento simples
  const pinMap: { [key: string]: string } = {
    '1111': 'Admin',
    '2222': 'Balança A',
    '2233': 'Balança B',
    '3333': 'Gerente',
    '4444': 'Caixa',
    '5555': 'Atendente',
  }

  const expectedName = pinMap[pin]
  if (!expectedName) {
    console.log(`❌ [SIMPLE-TEST] PIN ${pin} não é válido`)
    return null
  }

  const user = users.find((u) => u.name === expectedName && u.active)
  console.log(`🎯 [SIMPLE-TEST] Resultado: ${user ? `✅ ${user.name}` : '❌ Não encontrado'}`)

  return user
}

// Expor globalmente
;(window as any).quickLoginFix = quickLoginFix
;(window as any).testSimpleLogin = testSimpleLogin
