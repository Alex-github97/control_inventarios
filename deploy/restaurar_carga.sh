#!/usr/bin/env bash
#
# Restaura la empresa de PRUEBA DE CARGA desde su respaldo.
#
# El respaldo es solo el esquema `cli_carga` (pg_dump -n), que es lo que permite
# subirlo a un servidor sin tocar a las demás empresas. Pero el esquema solo no
# basta: la empresa existe para la plataforma cuando está en
# `public.plataforma_cliente` con sus módulos, y eso vive fuera del esquema.
# Este guion hace las dos cosas.
#
# Uso:   ./deploy/restaurar_carga.sh backups/cli_carga-prueba-AAAAMMDD.dump
#        COMPOSE=docker-compose.yml ./deploy/restaurar_carga.sh …   (en local)
#
# Si la empresa ya existe, se borra su esquema y se vuelve a restaurar: el
# propósito es volver al punto de partida de la prueba. Nunca toca otro esquema.
set -euo pipefail

DUMP="${1:?Indique el archivo .dump}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

COMPOSE="${COMPOSE:-docker-compose.prod.yml}"
ESQUEMA="cli_carga"
CODIGO="carga"
if [ "$COMPOSE" = "docker-compose.prod.yml" ]; then
  POSTGRES_USER="$(sed -n 's/^POSTGRES_USER=//p' .env.prod)"
  POSTGRES_DB="$(sed -n 's/^POSTGRES_DB=//p' .env.prod)"
else
  POSTGRES_USER="${POSTGRES_USER:-ci_user}"
  POSTGRES_DB="${POSTGRES_DB:-control_inventarios}"
fi

psql() {
  docker compose -f "$COMPOSE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 "$@"
}

echo "[$(date +%H:%M:%S)] restaurando ${ESQUEMA} desde ${DUMP}…"
psql -c "DROP SCHEMA IF EXISTS \"${ESQUEMA}\" CASCADE"
# --no-owner: el usuario de la base en el servidor no es el de la máquina donde
# se generó el respaldo.
docker compose -f "$COMPOSE" exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges \
  < "$DUMP"

echo "[$(date +%H:%M:%S)] registrando la empresa «${CODIGO}» y sus módulos…"
psql <<SQL
INSERT INTO public.plataforma_cliente
  (codigo, nombre, esquema, nit, activo, es_operador, created_at, updated_at)
SELECT '${CODIGO}', 'Prueba de carga', '${ESQUEMA}', '900000000-1', true, false, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM public.plataforma_cliente WHERE codigo = '${CODIGO}');

INSERT INTO public.plataforma_modulo_cliente (cliente_id, modulo, activo, desde)
SELECT c.id, m.modulo, true, current_date
FROM public.plataforma_cliente c
CROSS JOIN (VALUES ('control'), ('tarifax'), ('grc'), ('qms'), ('dms'), ('tms'),
                   ('eam'), ('ags'), ('pos'), ('wms'), ('gh'), ('command'), ('lms'),
                   ('crm'), ('mes'), ('aps'), ('erp'), ('scm'), ('sst'), ('locativa'),
                   ('base')) AS m(modulo)
WHERE c.codigo = '${CODIGO}'
  AND NOT EXISTS (SELECT 1 FROM public.plataforma_modulo_cliente x
                  WHERE x.cliente_id = c.id AND x.modulo = m.modulo);

-- Las estadísticas no viajan en el respaldo: sin ellas el planificador trata
-- tablas de miles de filas como vacías y la primera medición sale falseada.
-- Solo las de este esquema: el resto del servidor no tiene por qué pagarlo.
DO \$\$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = '${ESQUEMA}' LOOP
    EXECUTE format('ANALYZE %I.%I', '${ESQUEMA}', t.tablename);
  END LOOP;
END \$\$;
SQL

echo "[$(date +%H:%M:%S)] listo. Empresa «${CODIGO}», usuario «admin» o usuario001…usuario200."
echo "Para quitarla: DROP SCHEMA ${ESQUEMA} CASCADE y su fila en public.plataforma_cliente."
