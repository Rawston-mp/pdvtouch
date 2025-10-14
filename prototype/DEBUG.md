# 🐛 Debug e Logs

## Logs de Debug Removidos

Para manter o console limpo em produção, as seguintes mensagens foram condicionadas:

### ❌ Mensagens Removidas (por padrão):
- `🔇 Inicializando supressão de erros de extensões...`
- `✅ Supressão de erros de extensões ativada`  
- `🔄 Iniciando inicialização da sessão...`
- `✅ Banco inicializado com sucesso`
- `✅ Sessão restaurada: [nome]`
- `⚠️ Sessão inválida removida`
- `ℹ️ Nenhuma sessão salva encontrada`
- `🎉 Inicialização da sessão concluída`
- `Download the React DevTools for a better development experience`

## 🔧 Como Ativar Logs de Debug

Crie um arquivo `.env.local` no diretório `/prototype` com:

```bash
# Debug da sessão (login/logout/inicialização)
VITE_DEBUG_SESSION=true

# Debug de supressão de extensões
VITE_DEBUG_EXTENSIONS=true

# Mostrar mensagem do React DevTools
VITE_SHOW_DEVTOOLS_MSG=true
```

Depois reinicie o servidor (`npm run dev`).

## 📋 Logs que Permanecem

Mantidos apenas logs importantes:
- ✅ Erros reais de inicialização de sessão
- ✅ Erros de autenticação
- ✅ Logs de toast (sucesso/erro de login)
- ✅ Erros críticos da aplicação

## 🎯 Resultado

Console limpo em desenvolvimento sem logs desnecessários, mas com capacidade de debug quando necessário.