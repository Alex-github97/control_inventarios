#!/usr/bin/env bash
#
# Respaldo de la base, completo y además por cliente.
#
# El respaldo por cliente es posible porque cada uno vive en su propio esquema:
# `pg_dump -n` saca uno solo. Sirve para restaurar a una empresa sin tocar a las
# demás, y para mudarla a otro servidor cuando una máquina se quede corta.
#
# Uso:   ./deploy/respaldo.sh
# Cron:  0 2 * * *  /ruta/deploy/respaldo.sh >> /var/log/respaldo.log 2>&1
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

# shellcheck disable=SC1091
[ -f .env.prod ] && set -a && . ./.env.prod && set +a

DESTINO="${DIR}/backups"
FECHA="$(date +%Y%m%d-%H%M)"
DIAS_A_CONSERVAR="${DIAS_A_CONSERVAR:-14}"
mkdir -p "$DESTINO"

echo "[$(date +%H:%M:%S)] respaldo completo…"
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "${DESTINO}/completo-${FECHA}.dump"

# Un archivo por empresa, leyendo el registro para saber cuáles hay.
esquemas=$(docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "SELECT esquema FROM public.plataforma_cliente WHERE activo = true")

for esquema in $esquemas; do
  echo "[$(date +%H:%M:%S)] respaldo de ${esquema}…"
  docker compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -n "$esquema" -Fc \
    > "${DESTINO}/${esquema}-${FECHA}.dump"
done

# Se borran los viejos DESPUÉS de que los nuevos quedaron escritos: al revés,
# un fallo dejaría el servidor sin respaldo ninguno.
find "$DESTINO" -name "*.dump" -type f -mtime "+${DIAS_A_CONSERVAR}" -delete

echo "[$(date +%H:%M:%S)] listo. $(ls -1 "$DESTINO"/*.dump 2>/dev/null | wc -l) archivos en ${DESTINO}"
echo
echo "AVISO: esto queda en el mismo servidor. Si la máquina se pierde, se"
echo "pierden también los respaldos. Copie ${DESTINO} a un destino externo."
