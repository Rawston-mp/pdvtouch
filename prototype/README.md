## PDVTouch (Protótipo)

App React + Vite com suporte a PWA, operação offline e mock de dispositivos (balança/impressora via WebSocket).

### Requisitos
- Node 18+

### Scripts
- `npm run dev`: inicia o app (http://localhost:5173)
- `npm run mock:ws`: inicia o servidor WebSocket mock (ws://localhost:8787)
- `npm run dev:all`: inicia app + WS (requer concurrently)
- `npm run build` / `npm run preview`: build de produção e pré-visualização

### Variáveis de ambiente
Crie `.env.local` (ou use `.env.example` como base):

```
VITE_API_PREFIX=/api/
# ou backend externo:
# VITE_API_ORIGIN=https://api.suaempresa.com
# VITE_API_PREFIX=/v1/

VITE_WS_HOST=localhost
VITE_WS_PORT=8787

VITE_LOCK_TTL_MS=15000
VITE_LOCK_HEARTBEAT_MS=10000
```

As variáveis acima ajustam:
- Cache de API no Service Worker (NetworkFirst)
- Host/porta do WS mock de dispositivos
- Timings dos locks de comanda (TTL e heartbeat)

### PWA
- Ícones maskable (placeholders): `public/icons/icon-192.png`, `public/icons/icon-512.png` — substitua por ícones oficiais.
- Manifest+Workbox já configurados (autoUpdate). Fallback offline: `public/offline.html`.
- iOS: apple-touch-icon e metatags de status bar já incluídas.

Gerar ícones a partir da logomarca (SVG recomendado):

1) Salve seu arquivo em `src/assets/logo.svg` (ou `.png`).
2) Rode o utilitário:

```
npm run icons
```

Isso criará:
- `public/icons/icon-{16,32,48,72,96,144,192,256,384,512}.png`
- `public/apple-touch-icon.png` (180x180)

Dica:
- Se você já personalizou `icon-16.png` e `icon-32.png`, o gerador NÃO vai sobrescrever esses dois arquivos (preservação automática).
- Para gerar ícones a partir de um arquivo específico (ex.: uma imagem enviada):

```
npm run icons:from caminho/para/sua-imagem.png
```

Para substituir também os favicons pequenos (16/32) pela nova arte, use a flag:

```
npm run icons:from -- --overwrite-small caminho/para/sua-imagem.png
```

Depois de gerar, faça um hard refresh no navegador (ou aguarde o Service Worker atualizar) para ver o novo ícone no PWA instalado.

Instalação do app (PWA):
- Apenas ADMIN verá o botão “Instalar app” na topbar quando o navegador permitir.
- Ao publicar nova versão, aparecerá um toast “Nova versão disponível” com botão “Atualizar”.

### Operação offline
- Telas principais funcionam offline (IndexedDB via Dexie).
- Recursos dependentes da rede (ex.: NFC-e, confirmação de PIX) são indicados e desativados offline.
- Fallback de navegação: `offline.html`.

### Locks de comanda
- Locks locais com TTL/heartbeat; indicador minimalista de lock nas telas de Venda/Finalização.
- Ajuste de tempos em Configurações.

### Mock de dispositivos
- WS configurável via env (VITE_WS_HOST/VITE_WS_PORT).
- `src/mock/devices.ts` lida com conexão, impressão e leitura de peso.

### Integração com Backoffice (SSO mock)
- PDV → Backoffice: o PDV gera um token simples (client-side) e abre o Backoffice em `/sso/consume` com `token` e `redirect`.
- Backoffice → PDV: o PDV também aceita SSO; rota no PDV: `/sso/consume`.

Configuração rápida (DEV):
- No PDV, defina a URL do Backoffice em localStorage: `pdv.backofficeBaseUrl` (ex.: `http://localhost:5174`).
- No Backoffice, defina a URL do PDV (sugestão): `pdv.baseUrl` (ex.: `http://localhost:5173`).

Contrato do token (mock DEV):
- Base64 de um JSON com `{ sub: string, role: string, exp: number }`.
- Em produção, substituir por JWT emitido e validado no backend.

Rotas de SSO:
- Backoffice: `/sso/consume` (já implementada no AtendeTouch).
- PDV: `/sso/consume` (consome token do Backoffice, abre sessão local e redireciona).

Atalhos PDV para SSO (Admin):
- Na página Admin, há botões para abrir módulos do Backoffice via SSO (Cadastros/Relatórios/etc.).
- Um “pill” indica “Conectado ao Backoffice” quando a URL está configurada.

### Sincronização de produtos do Backoffice (mock)
- Na tela Sync do PDV existe o botão “Sync produtos do Backoffice”.
- Requisitos: `pdv.backofficeBaseUrl` configurada; o Backoffice expõe `GET /public/api/produtos.json` (mock).
- O PDV baixa, mapeia e faz `bulkPut` em `products` no IndexedDB.
- Próximos passos sugeridos: delta via `updatedAt` (parâmetro `since`) e tratamento de inativos.

### Fluxo de Vendas e atalhos
- Finalização: atalhos F6 (dinheiro), F7 (PIX), F8 (TEF), Ctrl/⌘+Enter para confirmar, ESC para voltar.
- PIX: tela dedicada com QR e “Confirmar recebimento (mock)”.
- Comandas: modal de “Comandas abertas” com seções (em uso, aguardando pagamento/devolução, rascunhos).

