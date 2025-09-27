// src/utils/debug.ts
// Funções de debug para verificar o estado do banco de dados

import { db, hashPin } from '../db'

export async function debugUsers() {
  console.log('🔍 Debug: Verificando usuários no banco...')
  
  try {
    const users = await db.users.toArray()
    console.log('👥 Usuários encontrados:', users.length)
    
    users.forEach(user => {
      console.log(`🔸 ${user.name} (${user.role}) - Ativo: ${user.active} - ID: ${user.id}`)
      console.log(`   PIN Hash: ${user.pinHash}`)
    })
    
    return users
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error)
    return []
  }
}

export async function debugPinHash(pin: string) {
  console.log(`🔐 [HASH] Debug: Gerando hash para PIN "${pin}"`)
  
  try {
    // Testar diferentes formas de gerar hash
    const encoder = new TextEncoder()
    const data = encoder.encode(pin)
    console.log(`   [HASH] Dados codificados: ${Array.from(data)}`)
    
    const buffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(buffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
    
    console.log(`   [HASH] Buffer length: ${buffer.byteLength}`)
    console.log(`   [HASH] Hash array: ${hashArray.slice(0, 5)}... (${hashArray.length} bytes)`)
    console.log(`   [HASH] Hash final: ${hashHex}`)
    
    // Comparar com a função original
    const originalHash = await hashPin(pin)
    console.log(`   [HASH] Hash da função original: ${originalHash}`)
    console.log(`   [HASH] Hashes coincidem: ${hashHex === originalHash}`)
    
    return originalHash
  } catch (error) {
    console.error('❌ [HASH] Erro ao gerar hash:', error)
    return null
  }
}

export async function testLogin(pin: string) {
  console.log(`🔑 Debug: Testando login com PIN "${pin}"`)
  
  try {
    const hash = await hashPin(pin)
    const users = await db.users.toArray()
    
    console.log(`   Hash do PIN: ${hash}`)
    console.log('   Comparando com usuários...')
    
    const matchingUser = users.find(u => {
      const matches = u.active && u.pinHash === hash
      console.log(`   ${u.name}: ${u.pinHash} === ${hash} && ${u.active} = ${matches}`)
      return matches
    })
    
    console.log(`   Resultado: ${matchingUser ? `✅ ${matchingUser.name}` : '❌ Nenhum usuário encontrado'}`)
    return matchingUser
  } catch (error) {
    console.error('❌ Erro no teste de login:', error)
    return null
  }
}

export async function recreateUsers() {
  console.log('🔄 [RECREATE] Recriando usuários...')
  
  try {
    // Limpar usuários existentes
    await db.users.clear()
    console.log('🗑️ [RECREATE] Usuários antigos removidos')
    
    // Recriar usuários
    const users: Array<{name:string, role:any, pin:string}> = [
      { name: "Admin",     role: "ADMIN",      pin: "1111" },
      { name: "Balança A", role: "BALANÇA A",  pin: "2222" },
      { name: "Balança B", role: "BALANÇA B",  pin: "2233" },
      { name: "Gerente",   role: "GERENTE",    pin: "3333" },
      { name: "Caixa",     role: "CAIXA",      pin: "4444" },
      { name: "Atendente", role: "ATENDENTE",  pin: "5555" },
    ]
    
    console.log('📝 [RECREATE] Criando novos usuários...')
    
    for (let i = 0; i < users.length; i++) {
      const u = users[i]
      console.log(`   Processando: ${u.name} com PIN "${u.pin}"`)
      
      const pinHash = await hashPin(u.pin)
      console.log(`   Hash gerado: ${pinHash}`)
      
      const newUser = {
        id: `u${i+1}`,
        name: u.name,
        role: u.role,
        active: true,
        pinHash: pinHash,
      }
      
      await db.users.put(newUser)
      console.log(`✅ [RECREATE] Criado: ${u.name} (PIN: ${u.pin}, Hash: ${pinHash})`)
    }
    
    const allUsers = await db.users.toArray()
    console.log(`🎉 [RECREATE] ${allUsers.length} usuários recriados com sucesso!`)
    
    // Verificar se foram criados corretamente
    console.log('🔍 [RECREATE] Verificação final:')
    allUsers.forEach(user => {
      console.log(`   - ${user.name}: ID=${user.id}, Role=${user.role}, Ativo=${user.active}`)
    })
    
    return allUsers
  } catch (error) {
    console.error('❌ [RECREATE] Erro ao recriar usuários:', error)
    return []
  }
}

// Expor globalmente para debug
;(window as any).debugUsers = debugUsers
;(window as any).debugPinHash = debugPinHash
;(window as any).testLogin = testLogin
;(window as any).recreateUsers = recreateUsers