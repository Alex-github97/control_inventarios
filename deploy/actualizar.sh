#!/usr/bin/env bash
#
# Pone en el servidor la última versión de `main` y reconstruye lo que cambió.
#
# Lo llama GitHub Actions en cada push a main (.github/workflows/desplegar.yml),
# y se puede correr a mano igual:   /opt/tittanware/deploy/actualizar.sh
#
# Orden y por qué:
#   1. Solo avanza si `main` sigue de corrido (--ff-only). Si alguien editó un
#      archivo versionado en el servidor, se detiene en vez de pisarlo.
#   2. Compila las imágenes ANTES de tocar nada: si la compilación falla, lo que
#      está corriendo sigue corriendo.
#   3. Respalda la base antes de reemplazar el backend, porque al arrancar corre
#      las migraciones.
#   4. Espera a que la API conteste; si no contesta, el despliegue sale en rojo.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

# Dos despliegues seguidos no se cruzan: el segundo espera al primero.
exec 9>/tmp/tittanware-despliegue.lock
flock 9

echo "── Código"
git fetch --quiet origin main
ANTES="$(git rev-parse HEAD)"
git merge --ff-only origin/main
DESPUES="$(git rev-parse HEAD)"
git log --oneline "${ANTES}..${DESPUES}" || true

echo "── Compilación"
$COMPOSE build backend frontend

echo "── Respaldo previo"
mkdir -p backups
# Se leen solo las dos variables: cargar .env.prod con `.` falla, porque
# DOMINIOS lleva espacios (docker compose sí lo entiende, bash no).
PG_USUARIO="$(sed -n 's/^POSTGRES_USER=//p' .env.prod)"
PG_BASE="$(sed -n 's/^POSTGRES_DB=//p' .env.prod)"
$COMPOSE exec -T postgres pg_dump -U "$PG_USUARIO" -d "$PG_BASE" -Fc \
  > "backups/predespliegue-$(date +%Y%m%d-%H%M)-${DESPUES:0:7}.dump"
# Se guardan los diez últimos de este tipo; los diarios los maneja respaldo.sh.
ls -1t backups/predespliegue-*.dump | tail -n +11 | xargs -r rm -f

echo "── Arranque"
$COMPOSE up -d --remove-orphans
# El proxy resuelve los contenedores al arrancar: se recarga por si cambiaron.
$COMPOSE exec -T proxy nginx -s reload || $COMPOSE restart proxy

echo "── Verificación"
for i in $(seq 1 60); do
  if $COMPOSE exec -T backend python -c \
      "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5).status == 200 else 1)" \
      >/dev/null 2>&1; then
    echo "API en línea con ${DESPUES:0:7}."
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 5
done

echo "La API no contestó en 5 minutos. Últimas líneas del backend:"
$COMPOSE logs --tail 80 backend
exit 1
