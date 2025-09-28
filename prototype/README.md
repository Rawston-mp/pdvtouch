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

