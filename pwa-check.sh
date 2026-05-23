#!/bin/bash

# ─────────────────────────────────────────────
# PWA Diagnostic — RJ Estética Automotiva
# Uso: bash pwa-check.sh
# ─────────────────────────────────────────────

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

FRONTEND="frontend"
PASS=0
FAIL=0
WARN=0

ok()   { echo -e "  ${GREEN}✓${RESET} $1"; PASS=$((PASS+1)); }
err()  { echo -e "  ${RED}✗${RESET} $1"; FAIL=$((FAIL+1)); }
warn() { echo -e "  ${YELLOW}⚠${RESET} $1"; WARN=$((WARN+1)); }
head() { echo -e "\n${BOLD}${BLUE}── $1${RESET}"; }

echo ""
echo -e "${BOLD}PWA Diagnostic — RJ Estética Automotiva${RESET}"
echo "────────────────────────────────────────"

# ── 1. Arquivos obrigatórios ──────────────────
head "Arquivos obrigatórios em frontend/"

for f in index.html manifest.json sw.js icon-192.png icon-512.png; do
  if [ -f "$FRONTEND/$f" ]; then
    ok "$f existe"
  else
    err "$f NÃO encontrado"
  fi
done

# ── 2. manifest.json ─────────────────────────
head "Conteúdo do manifest.json"

MANIFEST="$FRONTEND/manifest.json"
if [ -f "$MANIFEST" ]; then
  for field in name short_name start_url display background_color theme_color icons; do
    if grep -q "\"$field\"" "$MANIFEST"; then
      ok "Campo \"$field\" presente"
    else
      err "Campo \"$field\" AUSENTE"
    fi
  done

  if grep -q "192" "$MANIFEST"; then
    ok "Ícone 192x192 declarado"
  else
    err "Ícone 192x192 não declarado"
  fi

  if grep -q "512" "$MANIFEST"; then
    ok "Ícone 512x512 declarado"
  else
    err "Ícone 512x512 não declarado"
  fi

  if grep -q "maskable" "$MANIFEST"; then
    ok "Ícone maskable declarado"
  else
    warn "Ícone maskable não declarado (recomendado para Android)"
  fi

  if grep -q '"scope"' "$MANIFEST"; then
    ok "Campo \"scope\" presente"
  else
    warn "Campo \"scope\" ausente (recomendado)"
  fi

  if grep -q '"id"' "$MANIFEST"; then
    ok "Campo \"id\" presente"
  else
    warn "Campo \"id\" ausente (recomendado)"
  fi
else
  err "manifest.json não encontrado — pulando verificações"
fi

# ── 3. sw.js ─────────────────────────────────
head "Conteúdo do sw.js"

SW="$FRONTEND/sw.js"
if [ -f "$SW" ]; then
  if grep -q "install" "$SW"; then
    ok "Evento 'install' presente"
  else
    err "Evento 'install' ausente"
  fi

  if grep -q "activate" "$SW"; then
    ok "Evento 'activate' presente"
  else
    warn "Evento 'activate' ausente (recomendado para limpar cache antigo)"
  fi

  if grep -q "fetch" "$SW"; then
    ok "Evento 'fetch' presente"
  else
    warn "Evento 'fetch' ausente (sem suporte offline)"
  fi

  if grep -q "skipWaiting" "$SW"; then
    ok "skipWaiting() presente"
  else
    warn "skipWaiting() ausente (atualização pode demorar)"
  fi
else
  err "sw.js não encontrado — pulando verificações"
fi

# ── 4. index.html ─────────────────────────────
head "Tags no index.html"

HTML="$FRONTEND/index.html"
if [ -f "$HTML" ]; then

  if grep -q 'rel="manifest"' "$HTML"; then
    ok "<link rel=\"manifest\"> presente"
  else
    err "<link rel=\"manifest\"> AUSENTE"
  fi

  if grep -q 'name="theme-color"' "$HTML"; then
    ok "<meta name=\"theme-color\"> presente"
  else
    err "<meta name=\"theme-color\"> AUSENTE"
  fi

  if grep -q 'apple-mobile-web-app-capable' "$HTML"; then
    ok "Meta apple-mobile-web-app-capable presente (iOS)"
  else
    warn "Meta apple-mobile-web-app-capable ausente (iOS não vai instalar sem isso)"
  fi

  if grep -q 'apple-touch-icon' "$HTML"; then
    ok "<link rel=\"apple-touch-icon\"> presente (iOS)"
  else
    warn "<link rel=\"apple-touch-icon\"> ausente (iOS)"
  fi

  if grep -q "serviceWorker.register" "$HTML"; then
    ok "serviceWorker.register() presente"
  else
    err "serviceWorker.register() AUSENTE — SW nunca será registrado"
  fi

  # Verifica se o registro está dentro do <body> (não solto entre </head> e <body>)
  # Pega linha do serviceWorker.register e verifica se está após <body>
  SW_LINE=$(grep -n "serviceWorker.register" "$HTML" | head -1 | cut -d: -f1)
  BODY_LINE=$(grep -n "<body" "$HTML" | head -1 | cut -d: -f1)
  if [ -n "$SW_LINE" ] && [ -n "$BODY_LINE" ]; then
    if [ "$SW_LINE" -gt "$BODY_LINE" ]; then
      ok "serviceWorker.register() está dentro do <body>"
    else
      err "serviceWorker.register() está FORA do <body> (linha $SW_LINE, <body> na linha $BODY_LINE) — mova para antes de </body>"
    fi
  fi

  if grep -q '/sw.js' "$HTML"; then
    ok "Caminho /sw.js encontrado no registro"
  else
    warn "Verifique se o caminho no register() é '/sw.js'"
  fi

else
  err "index.html não encontrado"
fi

# ── 5. netlify.toml ───────────────────────────
head "netlify.toml"

if [ -f "netlify.toml" ]; then
  ok "netlify.toml encontrado"

  if grep -q 'publish' "netlify.toml"; then
    PUB=$(grep 'publish' netlify.toml | head -1)
    ok "publish configurado: $PUB"

    if echo "$PUB" | grep -q "frontend"; then
      ok "publish aponta para frontend/"
    else
      warn "publish não aponta para frontend/ — verifique"
    fi
  else
    warn "Campo publish não encontrado no netlify.toml"
  fi
else
  warn "netlify.toml não encontrado na raiz"
fi

# ── 6. Tamanho dos ícones ─────────────────────
head "Verificação dos ícones PNG"

if command -v file &>/dev/null; then
  for icon in icon-192.png icon-512.png; do
    if [ -f "$FRONTEND/$icon" ]; then
      INFO=$(file "$FRONTEND/$icon")
      if echo "$INFO" | grep -q "PNG"; then
        ok "$icon é um PNG válido — $INFO"
      else
        err "$icon não parece um PNG válido: $INFO"
      fi
    fi
  done
else
  warn "Comando 'file' não disponível — verifique manualmente se os .png são válidos"
fi

# ── Resumo ────────────────────────────────────
echo ""
echo "────────────────────────────────────────"
echo -e "${BOLD}Resumo:${RESET}"
echo -e "  ${GREEN}✓ Passou: $PASS${RESET}"
echo -e "  ${YELLOW}⚠ Avisos: $WARN${RESET}"
echo -e "  ${RED}✗ Erros:  $FAIL${RESET}"
echo ""

if [ "$FAIL" -eq 0 ] && [ "$WARN" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}Tudo certo! O site está pronto para ser instalável como PWA.${RESET}"
elif [ "$FAIL" -eq 0 ]; then
  echo -e "${YELLOW}${BOLD}Sem erros críticos, mas revise os avisos acima.${RESET}"
else
  echo -e "${RED}${BOLD}Corrija os erros acima para que o PWA funcione corretamente.${RESET}"
fi
echo ""
