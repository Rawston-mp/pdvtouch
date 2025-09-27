// src/utils/resetDb.ts
// Utilitário para limpar dados e resetar o banco local durante desenvolvimento

import { db } from '../db'

export async function resetDatabase() {
  try {
    console.log('🗑️ [RESET] Limpando banco de dados...')

    // Fecha banco se estiver aberto
    if (db.isOpen()) {
      console.log('🔒 [RESET] Fechando banco...')
      db.close()
    }

    // Deleta completamente o banco
    console.log('💥 [RESET] Deletando banco IndexedDB...')
    await db.delete()

    // Limpa localStorage
    console.log('🧹 [RESET] Limpando localStorage...')
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith('pdv.')) {
        console.log(`   Removendo: ${key}`)
        localStorage.removeItem(key)
      }
    })

    console.log('✅ [RESET] Banco completamente resetado!')
    console.log('🔄 [RESET] Recarregue a página para recriar tudo do zero')

    return true
  } catch (error) {
    console.error('❌ [RESET] Erro ao resetar banco:', error)
    return false
  }
}

export async function fullReset() {
  console.log('🚀 [FULL-RESET] Iniciando reset completo...')

  try {
    // Reset do banco
    await resetDatabase()

    // Aguarda um pouco
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Recarrega a página
    console.log('🔄 [FULL-RESET] Recarregando página...')
    window.location.reload()
  } catch (error) {
    console.error('❌ [FULL-RESET] Erro:', error)
  }
}

// Funções globais para debug (use no console do navegador)
;(window as any).resetPDVDatabase = resetDatabase
;(window as any).fullReset = fullReset
