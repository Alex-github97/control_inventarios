# Datos de prueba de carga

Para medir cómo se comportan la aplicación y el servidor con volumen, existe una empresa de prueba llamada **«carga»**. Vive en su propio esquema, `cli_carga`, y no toca a ninguna otra empresa.

- **Volumen:** unos 1,75 millones de filas, con las 572 tablas de los 21 módulos llenas.
- **Generadores coherentes:** GH, TMS, DMS, QMS, CRM, SCM, WMS y ERP usan los generadores que ya tiene el proyecto, y sus datos cuadran entre sí: inventario contra movimientos, nómina, costos y contabilidad.
- **Relleno sintético:** el resto se llenó con datos generados a partir del esquema. Sirven para medir volumen, no para mostrarle la aplicación a un cliente.

## Acceso

| Empresa | Usuario | Clave | Rol |
|---|---|---|---|
| `carga` | `admin` | `Carga2026*` | Administrador |
| `carga` | `usuario001` … `usuario200` | `Carga2026*` | Supervisor logístico, operador de bodega, auditor o consulta, repartidos |
| `carga` | `portal001` … `portal020` | `Carga2026*` | Solo portal 3PL (WMS); en lo demás reciben 403 |

La clave está escrita en este repositorio. Por eso la empresa **no debe quedarse en producción** cuando termine la prueba; ver [Quitar la empresa](#quitar-la-empresa).

## El archivo de respaldo

El respaldo es **solo el esquema `cli_carga`**, sacado con `pg_dump -n cli_carga -Fc`. Por eso se puede cargar en cualquier servidor sin tocar a las demás empresas.

- **Archivo:** `backups/cli_carga-prueba-20261027.dump`, de 72 MB.
- **SHA256:** `13059e195eef8bd5db6f5dc3a083981725130a48e86dadbb3fd8f262e0a0e6f1`

La carpeta `backups/` no se versiona, así que el archivo **no está en GitHub**. Se pasa de máquina a máquina con `scp`. Si alguien no lo tiene, puede generarlo de nuevo: ver [Generar los datos desde cero](#generar-los-datos-desde-cero).

## Subir los datos al servidor

1. **Copiar el respaldo** desde la máquina que lo tiene:

   ```
   scp backups/cli_carga-prueba-20261027.dump deploy@<servidor>:/opt/tittanware/backups/
   ```

2. **Comprobar que llegó completo.** En el servidor, el resultado debe coincidir con el SHA256 de arriba:

   ```
   sha256sum /opt/tittanware/backups/cli_carga-prueba-20261027.dump
   ```

3. **Restaurar:**

   ```
   cd /opt/tittanware
   ./deploy/restaurar_carga.sh backups/cli_carga-prueba-20261027.dump
   ```

   El guion hace tres cosas:
   - Borra `cli_carga` si ya existe y lo restaura. Así cada prueba arranca del mismo punto.
   - Registra la empresa y sus 21 módulos en `public.plataforma_cliente`. Esa parte no viaja en el respaldo.
   - Actualiza las estadísticas de esas tablas.

   Nunca toca otro esquema. Tarda menos de un minuto.

4. **Probar el acceso:** entrar a la aplicación con la empresa `carga`, el usuario `admin` y la clave `Carga2026*`.

Para hacer lo mismo en local, contra los contenedores de desarrollo:

```
COMPOSE=docker-compose.yml ./deploy/restaurar_carga.sh backups/cli_carga-prueba-20261027.dump
```

## Bajar los datos del servidor

Al terminar una prueba se puede querer guardar cómo quedó la empresa, por ejemplo para revisar lo que crearon las pruebas.

1. **Sacar el respaldo en el servidor:**

   ```
   cd /opt/tittanware
   docker compose -f docker-compose.prod.yml exec -T postgres \
     sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -n cli_carga -Fc -Z 6' \
     > backups/cli_carga-$(date +%Y%m%d-%H%M).dump
   ```

2. **Traerlo a la máquina local:**

   ```
   scp deploy@<servidor>:/opt/tittanware/backups/cli_carga-AAAAMMDD-HHMM.dump backups/
   ```

Ese archivo se restaura igual que el original, con `restaurar_carga.sh`.

## Quitar la empresa

Cuando la prueba termina, la empresa se borra del servidor:

```
cd /opt/tittanware
docker compose -f docker-compose.prod.yml exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' <<'SQL'
DROP SCHEMA IF EXISTS cli_carga CASCADE;
DELETE FROM public.plataforma_modulo_cliente
 WHERE cliente_id IN (SELECT id FROM public.plataforma_cliente WHERE codigo = 'carga');
DELETE FROM public.plataforma_cliente WHERE codigo = 'carga';
SQL
```

Las sesiones abiertas de esa empresa dejan de funcionar en la siguiente petición.

## Generar los datos desde cero

Sin un respaldo a mano, los datos se pueden generar con `backend/tools/sembrar_carga.py`. **No conviene correrlo en producción**: tarda unos 40 minutos y carga al servidor mientras tanto. Lo recomendado es generarlo en local, sacar un respaldo y subirlo.

```
docker compose exec backend python tools/sembrar_carga.py --codigo carga --clave 'Carga2026*'
docker compose exec -T postgres \
  pg_dump -U ci_user -d control_inventarios -n cli_carga -Fc -Z 6 \
  > backups/cli_carga-prueba-$(date +%Y%m%d).dump
```

Cada paso es idempotente: si se interrumpe, se vuelve a correr y solo llena lo que falta.

- `--filas` cambia el tamaño de las tablas de movimiento, que por defecto llevan 5000 filas.
- `--maestros` cambia el tamaño de los maestros, que por defecto llevan 500.

En local, el backend corre con recarga automática. Si se edita algo dentro de `backend/` mientras el generador corre, el backend se reinicia y migra los esquemas, y eso puede bloquear al generador. Durante la siembra no se edita el código.

## Al escribir pruebas de carga

- **Cabecera `X-Inactividad`:** el servidor solo alarga una sesión cuando la petición trae esa cabecera. Sin ella, la sesión vence a los 10 minutos y las respuestas pasan a 401, cosa que no tiene que ver con la carga. Ver [SEGURIDAD_SESIONES.md](SEGURIDAD_SESIONES.md).
- **Iniciar sesión** con `POST /api/v1/auth/login`, enviando la cabecera `X-Cliente: carga`.
- **Usuarios distintos:** para simular muchas personas, usar `usuario001` … `usuario200`, uno por hilo. Los usuarios del portal 3PL no sirven para recorrer los demás módulos.
