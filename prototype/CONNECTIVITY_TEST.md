# Teste de Conectividade - PDVTouch

## Componente Implementado

O componente `ConnectivityTest` foi criado e integrado na página de **Configurações** do sistema PDVTouch. Ele realiza verificações abrangentes da conectividade do sistema.

## Localização

- **Componente**: `src/components/ConnectivityTest.tsx`
- **Integração**: Página de Configurações (`/configuracoes`)
- **Acesso**: Disponível para usuários com perfil ADMIN ou GERENTE

## Funcionalidades do Teste

### 1. Internet (DNS)
- **Teste**: Resolução DNS via Google Public DNS
- **URL**: Configurável via `VITE_CONNECTIVITY_INTERNET_URL`
- **Status**: ✅ Sucesso / ❌ Erro / ⚠️ Aviso
- **Métricas**: Tempo de resposta em ms

### 2. WebSocket (Dispositivos)
- **Teste**: Conexão com servidor mock de dispositivos
- **Host/Porta**: Configurável via `VITE_WS_HOST` e `VITE_WS_PORT`
- **Default**: `localhost:8787`
- **Timeout**: Configurável via `VITE_CONNECTIVITY_TEST_TIMEOUT`
- **Status**: Verifica conexão com balança e impressora mock

### 3. IndexedDB (Banco Local)
- **Teste**: Criação, escrita e leitura de banco local
- **Operação**: Cria DB temporário para teste
- **Cleanup**: Remove DB de teste automaticamente
- **Status**: Verifica disponibilidade do armazenamento local

### 4. LocalStorage
- **Teste**: Escrita e leitura de dados locais
- **Operação**: Cria chave temporária para teste
- **Cleanup**: Remove dados de teste
- **Status**: Verifica disponibilidade do LocalStorage

### 5. Servidor de Desenvolvimento
- **Teste**: Conectividade com Vite dev server
- **Método**: HTTP HEAD request
- **Status**: Verifica se o servidor está respondendo
- **Métricas**: Tempo de resposta

### 6. Performance (Rendering)
- **Teste**: Velocidade de renderização DOM
- **Método**: `requestAnimationFrame` timing
- **Métricas**: Contagem de elementos DOM e tempo de frame
- **Benchmarks**:
  - ✅ Excelente: < 16ms (60fps)
  - ⚠️ Moderada: < 33ms (30fps)  
  - ❌ Baixa: > 33ms

## Interface do Usuário

### Botão Flutuante
- **Localização**: Canto inferior esquerdo
- **Estado Inicial**: Minimizado como botão "🔗 Conectividade"
- **Expansão**: Clique para abrir painel completo

### Painel de Testes
- **Dimensões**: 400px largura, max 500px altura
- **Posição**: Fixed, sobrepõe o conteúdo
- **Design**: Dark theme compatível
- **Scroll**: Área de resultados com scroll vertical

### Execução de Testes
- **Botão**: "▶️ Executar Testes"
- **Estado**: Mostra "🔄 Testando..." durante execução
- **Progresso**: Testes executados sequencialmente
- **Pausa**: 200ms entre cada teste

### Resultados
Para cada teste são exibidos:
- **Ícone de Status**: 🔄 ✅ ⚠️ ❌
- **Nome**: Identificação do teste
- **Tempo**: Response time em ms
- **Mensagem**: Status principal
- **Detalhes**: Informações técnicas adicionais

## Configuração (.env.local)

```bash
# Teste de conectividade
VITE_CONNECTIVITY_TEST_TIMEOUT=5000
VITE_CONNECTIVITY_INTERNET_URL=https://dns.google/resolve?name=google.com&type=A

# WebSocket (já existentes)
VITE_WS_HOST=localhost
VITE_WS_PORT=8787
```

## Casos de Uso

### 1. Diagnóstico de Problemas
- Identificar falhas de conectividade
- Verificar status dos serviços essenciais
- Debugging de problemas de performance

### 2. Validação de Ambiente
- Confirmar que todas as dependências estão funcionando
- Verificar configuração antes de usar o sistema
- Monitoramento de saúde do sistema

### 3. Troubleshooting
- Isolamento de problemas de rede
- Verificação de configuração de dispositivos
- Análise de performance do browser

## Integração com Sistema

### Acesso Restrito
- **Perfis**: ADMIN, GERENTE
- **Localização**: Menu Configurações
- **Segurança**: Mesmo controle de acesso da página

### Logs e Feedback
- **Console**: Logs detalhados via `showToast`
- **Visual**: Cores e ícones indicam status
- **Resumo**: Contagem de sucessos/falhas ao final

### Responsividade
- **Mobile**: Adapta ao tamanho da tela
- **Touch**: Botões otimizados para toque
- **Scrolling**: Área de resultados com scroll

## Uso Prático

1. **Acesse**: Menu > Configurações
2. **Localize**: Seção "Teste de Conectividade"
3. **Execute**: Clique em "▶️ Executar Testes"
4. **Analise**: Revise os resultados de cada teste
5. **Ação**: Corrija problemas identificados

## Status de Implementação

- ✅ Componente criado e funcional
- ✅ Integrado na página de Configurações
- ✅ Testes de conectividade implementados
- ✅ Interface responsiva e acessível
- ✅ Configuração via variáveis de ambiente
- ✅ Compatível com dark theme
- ✅ Sem dependências externas (além do React)

O sistema está pronto para realizar testes abrangentes de conectividade e auxiliar no diagnóstico de problemas de infraestrutura do PDVTouch.