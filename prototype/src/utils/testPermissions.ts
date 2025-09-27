// src/utils/testPermissions.ts
// Teste de permissões para diferentes roles

import { useSession } from '../auth/session'

export function testRolePermissions() {
  console.log('🧪 Testando permissões por role...')
  
  const roles = ['ADMIN', 'GERENTE', 'CAIXA', 'BALANÇA A', 'BALANÇA B', 'ATENDENTE']
  
  const permissions = {
    '/venda': ['ADMIN', 'GERENTE', 'CAIXA', 'BALANÇA A', 'BALANÇA B', 'ATENDENTE'],
    '/finalizacao': ['ADMIN', 'GERENTE', 'CAIXA', 'ATENDENTE'],
    '/impressao': ['ADMIN', 'GERENTE', 'CAIXA', 'ATENDENTE'], 
    '/relatorios': ['ADMIN', 'GERENTE', 'CAIXA'],
    '/relatorioxz': ['ADMIN', 'GERENTE', 'CAIXA'],
    '/turno': ['ADMIN', 'GERENTE', 'CAIXA'],
    '/sync': ['ADMIN', 'GERENTE'],
    '/admin': ['ADMIN', 'GERENTE'],
    '/pix': ['ADMIN', 'GERENTE', 'CAIXA']
  }
  
  console.table(
    Object.entries(permissions).map(([route, allowedRoles]) => {
      const result: any = { rota: route }
      roles.forEach(role => {
        result[role] = allowedRoles.includes(role) ? '✅' : '❌'
      })
      return result
    })
  )
  
  console.log('\n📋 Resumo das restrições:')
  console.log('• BALANÇA A e BALANÇA B: Acesso APENAS à tela de Vendas')
  console.log('• ATENDENTE: Sem acesso a relatórios, turno, sync e admin')
  console.log('• CAIXA: Sem acesso a sync e admin')
  console.log('• GERENTE: Acesso total exceto algumas funções admin')
  console.log('• ADMIN: Acesso total')
}

// Expor globalmente
;(window as any).testRolePermissions = testRolePermissions