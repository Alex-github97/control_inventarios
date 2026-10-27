# Design

## Context

- **Origen:** Daily Logistics (DL) está en `desarrollos/produccion/daily_logistics/daily_logistics`, con su propio git (20 commits desde `11ab682`, del 2026-10-08) y sus contenedores `dl_*`. Nació de esta plataforma (CI). Desde esa fecha, los archivos WMS de CI solo cambiaron en `core/wms_migracion.py`, por las columnas de TarifaX.
- **Commits de DL** que traen lo que se va a portar:
  - `623d63d`: tareas dirigidas, frentes, consolidación, mapa y rendimiento;
  - `8560895`: productos, compras, constructor, frentes y picking;
  - `f040a08`: seguridad;
  - `610ac03`: solo su parte de estrategia de picking;
  - `5d092ee`: trazabilidad y flujo de estados del TMS;
  - los archivos del TMS que DL ya traía al nacer (`tms_conductores`, `capacidad_carga`, `core/tms_capacidad.py`) y que CI no tiene.

  Esos commits mezclan también WFM, analítica, entrenamiento, página pública y ajustes del cliente, que quedan fuera (ver proposal.md).
- **Cambio en paralelo:** el cambio `organizar-plataforma-modular` reorganizará carpetas y migraciones, pero todavía no se aplica. Este cambio trabaja sobre la estructura actual.
- **Infraestructura:**
  - producción ya tiene Redis (`prod_redis`, con `allkeys-lru` y 256 MB);
  - `fpdf2` ya está en los dos proyectos;
  - DL no tiene pruebas automáticas en su repositorio.

## Goals / Non-Goals

**Goals:**
- Traer a CI las funciones de las especificaciones de este cambio con el comportamiento probado en DL, sin perder nada de lo que CI tiene y DL no.
- Dejar DL exactamente como está.

**Non-Goals:**
- Sincronización continua entre los dos proyectos: esto es un porte puntual.
- Traer WFM, analítica, entrenamiento o el asistente de IA.
- Unificar las dos bases de datos o las dos marcas.

## Decisions

### D1. DL es solo lectura, y se garantiza por procedimiento
Todo lo que se toma de DL se lee con comandos de solo lectura (`git -C <DL> log | show | diff | format-patch`), y su salida se escribe en el scratchpad o en CI, nunca dentro de la carpeta de DL.

- **Prohibido en DL:** checkout, commit, stash, reset, `docker compose` (de DL o con su `docker-compose.yml`), acceso a `dl_postgres` y escrituras en sus volúmenes.
- **Verificación:** antes y después de cada fase se toma una huella de DL (`git -C <DL> status --porcelain` y `git -C <DL> rev-parse HEAD`). Ambas deben coincidir.

**Alternativa descartada:** clonar DL dentro de CI como submódulo. Mezcla los repositorios y abre la puerta a escribir en DL por accidente.

### D2. Portar diferencias por rango de commits y por ruta, no copiar archivos
Por cada área se genera un parche con `git -C <DL> diff 11ab682 <commit> -- <rutas>`, que contiene solo lo que DL cambió después de nacer, y se aplica en CI con `git apply --3way`.

- **Archivos solo de DL** (los ~30 nuevos): entran completos.
- **Archivos compartidos** (`wms.py`, `models/wms.py`, `wms_inventario.py`, las páginas WMS): se revisan trozo por trozo. Se descarta lo que pertenece a lo excluido (WFM, cambios de marca, ocultar menús, quitar precios).

**Corrección al aplicar (grupo 1):** el commit base de DL (`11ab682`) no es igual a CI. Ya traía trabajo que CI nunca tuvo (por ejemplo `wms_codigos.py` y el componente `Desplegables`), y en 78 archivos compartidos la base de DL difiere de CI. Por eso el parche por rango deja cosas por fuera. El parche que se usa es **CI → versión final de DL** (`610ac03`), archivo por archivo. Lo genera `gen_parches.py` en el scratchpad, en siete áreas, y lo que hay que revisar con lupa son las **líneas que DL quita**: ahí están los módulos retirados (`App.tsx` −660, `main.tsx` −425, `router.py`), el login de CI que DL reemplazó (`Login.tsx` −679) y los ocultamientos del cliente.

**Por qué no copiar el archivo de DL encima del de CI:** el `wms.py` de DL tiene 97 líneas menos que el de CI. Hay funciones de CI que DL quitó o cambió para su cliente, y copiarlo encima las borraría.

### D3. Commits excluidos de forma explícita
- **No se aplican nunca:**
  - `c510e89`, `5806321` y `831e933`, que retiran módulos de la plataforma;
  - `50ed340`, que oculta pantallas y renombra la orden de compra;
  - el asistente de IA: `f7f827b`, `ef290bd`, `166d0eb`, `9f482f3`, `06ebe49` y `3a47b27`;
  - analítica: `2d51545` y `4818968`;
  - página pública: `2f0ad6e`;
  - y `584fa28`.
- **De `610ac03`** solo se toma la estrategia de picking (modelo, endpoint, selector y migración). Se descartan el ocultamiento del POS y la orden sin precios.

### D3b. TMS: porte contra la versión final, no por rango
Los archivos del TMS que DL ya tenía al nacer y CI no (`tms_conductores.py`, `capacidad_carga.py`, `core/tms_capacidad.py`, `ConductorForm.tsx`, `SugerenciaVehiculo.tsx`) no aparecen en el rango `11ab682..610ac03`. Se comparan contra CI con la versión final de DL (`git -C <DL> show 610ac03:<ruta>`):
- los que solo existen en DL entran completos;
- los compartidos (`endpoints/tms.py`, `models/tms.py`, `schemas/tms.py`, `ViajeDetalle.tsx` y las páginas TMS) se revisan trozo por trozo contra CI, descartando los textos de marca y lo que dependa de módulos que DL retiró.

`tms_conductores` guarda en `hcm_colaborador` y `hcm_conductor`, que CI ya tiene; en CI convive con el alta desde Gestión humana, no la reemplaza.

### D4. Tareas dirigidas sin WFM
En DL, las tareas usan el módulo de personal solo para exigir una «jornada abierta» (`personal.jornada_abierta`) y para la hora (`personal.ahora`). En CI no hay WFM, así que esa verificación se reemplaza por «usuario activo con permiso del WMS», detrás de una función `operario_disponible()` que el WFM podrá implementar después.

**Alternativa descartada:** traer el WFM completo, que se cruza con Gestión humana y queda fuera del alcance.

### D5. Seguridad primero y sola
La seguridad se porta y despliega antes que cualquier función del WMS, como entrega independiente.

- **Sesiones en Redis** en una base lógica propia (`REDIS_DB_SESIONES`).
- **Política de memoria:** se cambia a `volatile-lru`, para que solo puedan expulsarse claves con vencimiento de caché y nunca una sesión viva, o se eleva el límite de memoria (ver riesgos).
- **Contraseñas:** las de bcrypt se convierten a Argon2id al ingresar.
- **Arranque en producción:** se valida que `SECRET_KEY` sea fuerte.

### D6. Migraciones con el mecanismo actual
- Las 12 tablas nuevas, `compras`, `marketplace` y las tablas nuevas del TMS llegan por `create_all`.
- El POD pasa de uno por viaje a uno por parada: se quita la unicidad de `tms_pod.viaje_id` y se crea el índice único (viaje, parada) dentro del advisory lock del arranque, revisando antes que no haya duplicados.
- Las columnas e índices nuevos (113 líneas de `wms_migracion.py` en DL) se agregan a `COLUMNAS` e `INDICES` de CI, conservando las columnas de TarifaX que CI ya tiene ahí.

Cuando se aplique `organizar-plataforma-modular`, todo esto quedará dentro de la línea base de Alembic.

### D7. Marca y textos
Los textos de DL que nombran «Daily» o «Daily Logistics» se pasan a textos neutros o a la marca TittanWare. Las claves de i18n nuevas se agregan en los 10 idiomas de CI.

### D8. Integraciones externas configurables
- **Correo:** el SMTP para las cotizaciones se configura por variables de entorno. Sin configuración, el envío queda deshabilitado y se ofrece descargar el PDF (escenario en la spec).
- **Canales de venta:** los conectores (por ejemplo, MercadoLibre) guardan sus credenciales por empresa. El endpoint que recibe pedidos sin sesión identifica a la empresa por el token del conector.

## Risks / Trade-offs

- **Un trozo de DL pisa un comportamiento de CI en un archivo compartido** → Aplicación de tres vías con revisión trozo por trozo, más pruebas de humo del WMS antes y después de cada fase.
- **Redis con `allkeys-lru` expulsa sesiones y saca a usuarios en plena operación** → Base lógica separada y `volatile-lru` (o más memoria), y alerta si Redis supera el 80 % de su límite.
- **Las sesiones abiertas se invalidan al desplegar la seguridad** → Desplegar fuera de horario y avisar a los clientes.
- **Las contraseñas actuales no cumplen la nueva política** → La política solo aplica a contraseñas nuevas o cambiadas; las existentes siguen sirviendo hasta que se cambien.
- **Sin pruebas en DL** → Se escriben pruebas en CI a partir de los escenarios de las especificaciones, en cada fase.
- **Escribir en DL por error** → D1: solo comandos de lectura y verificación de huella antes y después.

## Migration Plan

1. **Seguridad:**
   - ajustar Redis (base lógica y política de memoria) y desplegar;
   - sesiones existentes invalidadas, contraseñas bcrypt migradas al ingresar.
   - **Reversa:** la imagen anterior sigue validando las contraseñas Argon2id solo si se conserva la dependencia `argon2-cffi`. Por eso la imagen de reversa se construye con ella.
2. **WMS en cuatro entregas,** cada una con sus migraciones de columnas:
   - tareas y picking;
   - productos y recepción;
   - compras y bodega física;
   - canales y consolidación;
   - TMS (cargue, plan de carga y trazabilidad), después de canales porque el cargue parte de los consolidados.

   Cada entrega es reversible a la imagen anterior: las columnas y tablas nuevas no afectan a la versión vieja.
3. **DL** no se toca en ningún paso.
