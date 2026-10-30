#!/usr/bin/env bash
#
# Vuelve a generar la empresa de PRUEBA DE CARGA con menos volumen.
#
# No borra filas al azar: eso dejaría inventarios que no cuadran con sus
# movimientos, nóminas sin novedades y asientos sin factura. Se respalda el
# esquema actual, se elimina y se siembra de nuevo con el mismo generador, pero
# con un periodo más corto y menos filas en las tablas de relleno.
#
# La proporción la dan tres números. Los de la siembra original eran 665 días
# (2025-01-01 → 2026-10-27), 5000 filas y 500 maestros; los de abajo son el 30 %.
#
# El CMMS (activos, órdenes, combustible, lubricación y LLANTAS) tiene su propio
# generador, tools/sembrar_cmms.py, con datos mucho más fieles que el relleno:
# odómetros que solo suben, llantas que se gastan surco a surco, reencauches y
# vidas para el CPK. Si se indica ACTIVOS, se corre después de la siembra y
# reemplaza todo lo `eam_*` con una flota de ese tamaño y MESES de historia.
#
# Uso:   ./deploy/reducir_carga.sh
#        DIAS=330 FILAS=2500 MAESTROS=250 ./deploy/reducir_carga.sh   (50 %)
#        ACTIVOS=300 MESES=24 ./deploy/reducir_carga.sh                (+ CMMS)
#        COMPOSE=docker-compose.yml ./deploy/reducir_carga.sh          (en local)
#
# Solo toca el esquema `cli_carga`. El registro de la empresa en
# `public.plataforma_cliente` se conserva: el generador lo reutiliza.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

DIAS="${DIAS:-200}"
FILAS="${FILAS:-1500}"
MAESTROS="${MAESTROS:-150}"
ACTIVOS="${ACTIVOS:-0}"
MESES="${MESES:-24}"
ESQUEMA="cli_carga"
CODIGO="carga"
COMPOSE="${COMPOSE:-docker-compose.prod.yml}"
if [ "$COMPOSE" = "docker-compose.prod.yml" ]; then
  DC="docker compose -f $COMPOSE --env-file .env.prod"
  POSTGRES_USER="$(sed -n 's/^POSTGRES_USER=//p' .env.prod)"
  POSTGRES_DB="$(sed -n 's/^POSTGRES_DB=//p' .env.prod)"
else
  DC="docker compose -f $COMPOSE"
  POSTGRES_USER="${POSTGRES_USER:-ci_user}"
  POSTGRES_DB="${POSTGRES_DB:-control_inventarios}"
fi

psql() {
  $DC exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 "$@"
}

# Conteo exacto: las estadísticas del planificador pueden estar desfasadas
# justo después de una siembra.
filas_del_esquema() {
  psql -tAc "SELECT coalesce(sum((xpath('/row/c/text()',
      query_to_xml(format('SELECT count(*) AS c FROM %I.%I', schemaname, tablename),
                   false, true, '')))[1]::text::bigint), 0)
    FROM pg_tables WHERE schemaname = '${ESQUEMA}'"
}

DESDE="$(date -d "-${DIAS} days" +%Y-%m-%d)"
echo "[$(date +%H:%M:%S)] reducción de «${CODIGO}»: desde ${DESDE} (${DIAS} días), ${FILAS} filas, ${MAESTROS} maestros"

ANTES=0
if [ "$(psql -tAc "SELECT count(*) FROM pg_namespace WHERE nspname = '${ESQUEMA}'")" = "1" ]; then
  ANTES="$(filas_del_esquema)"
  echo "[$(date +%H:%M:%S)] filas actuales: ${ANTES}"
  mkdir -p backups
  RESPALDO="backups/${ESQUEMA}-antes-de-reducir-$(date +%Y%m%d-%H%M).dump"
  echo "[$(date +%H:%M:%S)] respaldo del esquema actual en ${RESPALDO}…"
  $DC exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -n "$ESQUEMA" -Fc -Z 6 > "$RESPALDO"
  echo "[$(date +%H:%M:%S)] eliminando ${ESQUEMA}…"
  psql -c "DROP SCHEMA \"${ESQUEMA}\" CASCADE"
else
  echo "[$(date +%H:%M:%S)] ${ESQUEMA} no existe; se siembra desde cero"
fi

echo "[$(date +%H:%M:%S)] sembrando…"
# Sin el SQL de cada inserción en pantalla: son cientos de miles de líneas.
$DC exec -T -e DEBUG=false backend python tools/sembrar_carga.py \
  --codigo "$CODIGO" --desde "$DESDE" --filas "$FILAS" --maestros "$MAESTROS"

if [ "$ACTIVOS" -gt 0 ]; then
  ANIOS="$(awk "BEGIN { printf \"%.2f\", ${MESES} / 12 }")"
  echo "[$(date +%H:%M:%S)] CMMS coherente: ${ACTIVOS} activos, ${MESES} meses…"
  $DC exec -T -e DEBUG=false backend python tools/sembrar_cmms.py \
    --esquema "$ESQUEMA" --activos "$ACTIVOS" --anios "$ANIOS"
fi

psql <<SQL
DO \$\$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = '${ESQUEMA}' LOOP
    EXECUTE format('ANALYZE %I.%I', '${ESQUEMA}', t.tablename);
  END LOOP;
END \$\$;
SQL

DESPUES="$(filas_del_esquema)"
psql -c "SELECT 'llantas' AS tabla, count(*) FROM \"${ESQUEMA}\".eam_neumatico
  UNION ALL SELECT 'vidas de llanta', count(*) FROM \"${ESQUEMA}\".eam_vida_neumatico
  UNION ALL SELECT 'inspecciones de llanta', count(*) FROM \"${ESQUEMA}\".eam_inspeccion_neumatico
  UNION ALL SELECT 'movimientos de llanta', count(*) FROM \"${ESQUEMA}\".eam_movimiento_neumatico
  UNION ALL SELECT 'activos', count(*) FROM \"${ESQUEMA}\".eam_activo"
if [ "$ANTES" -gt 0 ]; then
  echo "[$(date +%H:%M:%S)] listo: ${ANTES} → ${DESPUES} filas ($(( DESPUES * 100 / ANTES )) %)"
else
  echo "[$(date +%H:%M:%S)] listo: ${DESPUES} filas"
fi
