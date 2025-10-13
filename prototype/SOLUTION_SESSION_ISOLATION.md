# Soluções para Isolamento de Sessões

## Problema Atual
- Todas as abas compartilham a mesma sessão via localStorage
- Usuários diferentes do Google não isolam as sessões do PDVTouch

## Opção 1: Session Storage (Isolamento por Aba)
```tsx
// Trocar localStorage por sessionStorage
const LS_KEY = 'pdv.session.v2'

// ❌ Atual (compartilhado):
localStorage.setItem(LS_KEY, JSON.stringify(sessionData))

// ✅ Novo (isolado por aba):
sessionStorage.setItem(LS_KEY, JSON.stringify(sessionData))
```

**Prós:**
- ✅ Cada aba tem sessão independente
- ✅ Mudança mínima no código
- ✅ Logout automático ao fechar aba

**Contras:**
- ❌ Perde sessão ao recarregar página
- ❌ Não persiste entre reinicializações do navegador

## Opção 2: Namespace por Perfil do Google
```tsx
// Detectar usuário do Google e usar como namespace
const googleUser = await getGoogleUserProfile()
const LS_KEY = `pdv.session.v2.${googleUser.email}`

localStorage.setItem(LS_KEY, JSON.stringify(sessionData))
```

**Prós:**
- ✅ Persistência entre recargas
- ✅ Isolamento por usuário Google
- ✅ Múltiplas sessões simultâneas

**Contras:**
- ❌ Requer integração com Google API
- ❌ Mais complexo de implementar
- ❌ Dependência externa

## Opção 3: Tab ID Único
```tsx
// Gerar ID único por aba
const tabId = crypto.randomUUID() || `tab_${Date.now()}_${Math.random()}`
const LS_KEY = `pdv.session.v2.${tabId}`

// Armazenar tabId no sessionStorage
sessionStorage.setItem('pdv.tabId', tabId)
```

**Prós:**
- ✅ Isolamento completo por aba
- ✅ Não depende de APIs externas
- ✅ Flexibilidade máxima

**Contras:**
- ❌ Sessões órfãs no localStorage
- ❌ Necessário limpeza periódica
- ❌ Mais complexo de gerenciar

## Recomendação: Opção 1 (Session Storage)
Para o caso de uso do PDVTouch, o sessionStorage é a solução mais simples e efetiva.