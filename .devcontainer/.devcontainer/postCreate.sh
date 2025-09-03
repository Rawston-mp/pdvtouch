#!/usr/bin/env bash
set -e

echo "[postCreate] Ajustando ambiente PDVTouch..."

# Atualiza pacotes
sudo apt-get update -y

# Instala utilitários úteis
sudo apt-get install -y zip unzip jq

# Instala deps do protótipo (se existir package.json)
if [ -f "prototype/package.json" ]; then
  cd prototype
  npm install
fi

echo "[postCreate] OK."
