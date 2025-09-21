## Como acessar o sistema

Após iniciar o ambiente de desenvolvimento, acesse o sistema pelo navegador em:

  http://localhost:5173

Essa é a porta padrão do Vite configurada no projeto. Se acessar outra porta, o sistema pode não funcionar corretamente.
# Dev Container (PDVTouch)

Este repositório suporta **Dev Containers** para um ambiente padronizado com **Node 20** e **.NET 8**.

## Pré-requisitos
- Docker Desktop (Windows) com WSL2 habilitado
- VS Code + extensões:
  - Dev Containers
  - Remote - WSL

## Como abrir no container
1. Abra o projeto no VS Code.
2. `Ctrl+Shift+P` → **Dev Containers: Reopen in Container**.
3. Aguarde a criação do container (primeira vez é mais demorado).

## Comandos úteis (dentro do container)
- Protótipo web:  
  ```bash
  cd prototype
  npm run dev -- --host
