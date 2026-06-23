#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[security-scan] Escaneando secretos potenciales..."

# Archivos a ignorar (dependencias, binarios, caches)
EXCLUDES=(
  "--glob" "!**/venv/**"
  "--glob" "!**/node_modules/**"
  "--glob" "!**/dist/**"
  "--glob" "!**/.git/**"
  "--glob" "!**/*.lock"
  "--glob" "!**/*.png"
  "--glob" "!**/*.jpg"
  "--glob" "!**/*.jpeg"
  "--glob" "!**/*.pdf"
  "--glob" "!**/*.zip"
)

# Patrones de alto riesgo (evitar falsos positivos comunes)
PATTERN='(OPENAI_API_KEY\s*=\s*sk-[A-Za-z0-9_-]+|ODOO_PASS\s*=\s*["'\''][^"'\'']+["'\'']|SECRET_TOKEN\s*=\s*["'\''][^"'\'']{12,}["'\'']|VALID_USERS\s*=\s*[^#\n]*:[^#\n]*(123|admin|password)|api[_-]?key\s*[:=]\s*["'\''][A-Za-z0-9_\-]{16,}["'\'']|token\s*[:=]\s*["'\''][A-Za-z0-9_\-]{16,}["'\'']|password\s*[:=]\s*["'\''][^"'\'']{6,}["'\''])'

set +e
RESULTS="$(rg -n -i --pcre2 "$PATTERN" . "${EXCLUDES[@]}")"
STATUS=$?
set -e

if [[ $STATUS -eq 0 ]]; then
  echo "[security-scan] ERROR: Se detectaron posibles secretos:"
  echo "$RESULTS"
  echo
  echo "[security-scan] Bloqueado. Mueve esos valores a .env y usa placeholders en archivos trackeados."
  exit 1
fi

echo "[security-scan] OK: no se detectaron secretos de alto riesgo."
