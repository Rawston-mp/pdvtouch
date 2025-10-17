## PDVTouch (Protótipo)

App React + Vite com suporte a PWA, operação offline e mock de dispositivos (balança/impressora via WebSocket).

### Requisitos
- Node 18+

### Scripts
- `npm run dev`: inicia o app (http://localhost:5173)
- `npm run mock:ws`: inicia o servidor WebSocket mock (ws://localhost:8787)
- `npm run dev:all`: inicia app + WS (requer concurrently)
- `npm run build` / `npm run preview`: build de produção e pré-visualização

#### Notas de desenvolvimento (Service Worker e portas)

Este protótipo não utiliza PWA em desenvolvimento. Caso exista um Service Worker legado ativo, podem surgir erros como:

```
dev-sw.js:111 API_PREFIX is not defined
```

Para evitar isso, o `App.tsx` desregistra automaticamente quaisquer Service Workers da origem e limpa todos os caches (incluindo Workbox) ao iniciar. Se houver um controlador SW, a página recarrega uma única vez ao trocar o controlador.

Sinais de SW legado:
- Erros em `dev-sw.js` ou `workbox-*.js`
- Recursos sendo servidos do cache após alterações

Solução manual (se necessário):
1. DevTools > Application > Service Workers > Unregister
2. Application > Clear storage > marque todas opções > Clear site data
3. Hard Reload (Ctrl+F5)

Portas:
- Padrão do Vite: `5173`. Se ocupada, o Vite usa outra (ex.: `5174`).
- Os scripts não fixam porta para facilitar o desenvolvimento.

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

