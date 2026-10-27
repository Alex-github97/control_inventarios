#!/usr/bin/env bash
# Huella de Daily Logistics: el commit y el estado de su árbol de trabajo.
# El porte de DL a esta plataforma solo LEE ese repositorio; esta huella lo
# comprueba. Sin argumentos imprime la huella; con un archivo, la compara.
#
#   backend/tools/huella_dl.sh > huella.txt
#   backend/tools/huella_dl.sh openspec/changes/portar-wms-daily-logistics/huella_dl.txt
set -euo pipefail
DL="${DL:-$(cd "$(dirname "$0")/../../.." && pwd)/daily_logistics/daily_logistics}"
huella() {
  echo "HEAD $(git -C "$DL" rev-parse HEAD)"
  git -C "$DL" status --porcelain --untracked-files=all
}
if [ $# -eq 0 ]; then huella; exit 0; fi
if diff <(huella) "$1" >/dev/null; then
  echo "Daily Logistics sin cambios"
else
  echo "Daily Logistics CAMBIÓ respecto a $1:"; diff <(huella) "$1" || true; exit 1
fi
