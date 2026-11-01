# Design

## Context

Ver `proposal.md` y `specs/eam/`. Lo que hay hoy:

- **`eam_neumatico`** tiene `marca`, `referencia` y `medida` en texto (alimentados por los catálogos `eam_marca_neumatico`, `eam_referencia_neumatico` y `eam_dimension_neumatico`), además de:
  - `reencauches` (entero, 0 si es nueva);
  - `dot` (texto libre de hasta 20 caracteres);
  - `estado` (`BAJA` para la pila de descarte);
  - `dano_id`, que apunta a `eam_dano_neumatico_catalogo`, el catálogo de daños configurable en *Configuración*;
  - `motivo_fin_vida_id`, que apunta a `eam_motivo_fin_vida`;
  - `motivo_baja` (texto) y `fecha_baja`.
- **Movimientos** (`eam_movimiento_neumatico.tipo_movimiento`): `INSTALACION`, `ROTACION`, `VOLTEO`, `DESMONTAJE`, `BAJA`, `CAMBIO_ZONA` y `RECUPERACION_BANDA`.
- **Inspecciones** (`eam_inspeccion_neumatico`): tres profundidades, presión, posición, estado visual, observaciones y técnico. No registran daños del catálogo.
- **Tablero de rendimiento** (`core/rendimiento_llantas.py`, `GET /eam/neumaticos/reportes/rendimiento`, `TableroRendimiento`): ya agrupa por marca, referencia, medida y otras nueve categorías, pero **una a la vez**, eligiendo la dimensión con un selector. El cálculo es por vida y se hace en un hilo.
- **Estado de la flota**:
  - `GET /eam/neumaticos/reportes/estado-flota` ya devuelve el esquema de cada vehículo con la última inspección; se optimizó con LATERAL en `consultas-con-volumen`.
  - El PDF lo arma el navegador con jsPDF (`utils/reporteFlotaPDF.ts`, `dibujarEsquema`).
  - El backend ya tiene `fpdf2==2.8.4`.
- **Alertas** (`/eam/neumaticos/alertas`): calculan `PROFUNDIDAD`, `PRESION` y `DESALINEACION` con `eam_neumatico_config` (profundidad mínima, presión mínima y máxima, umbral de desalineación).
- **Restricciones de producción**:
  - 4 procesos de uvicorn, y el supervisor mata al que no responde en 5 s;
  - listas por trozos y agregados en SQL;
  - migraciones dentro del advisory lock;
  - la empresa `carga` tiene 96 mil llantas, 63 mil bajas y 976 mil inspecciones.

## Goals / Non-Goals

**Goals:**
- Todos los tableros agregados en SQL, con los mismos filtros resueltos por una sola función.
- Una definición única del I.R. y de las novedades, usada por los tableros, el informe y la vista del vehículo.
- El PDF de flota, hecho en el servidor y en segundo plano cuando es grande.

**Non-Goals:**
- Capturar daños del catálogo en cada inspección (decisión pendiente en la propuesta).
- Normalizar `marca`/`referencia`/`medida` a llaves foráneas: se agrupa por el texto, que ya sale del catálogo.
- Cargar las reglas definitivas de sugerencia: llegan con los documentos del usuario y se cargan como configuración, no como código.

## Decisions

### 1. Un filtro común en el servidor
Una función `filtro_llantas(q, filtros)` en `core/neumaticos_filtros.py` aplica marca, referencia, dimensión, año y semana de fabricación (listas) y periodo, y la usan:
- el tablero de descarte;
- el tablero general (rendimiento, parque montado e I.R.);
- el informe de flota;
- la lista de descarte cuando se llega desde el tablero.

Así el total del tablero y el de la lista filtrada cuadran por construcción. Las opciones de cada filtro salen de `SELECT DISTINCT` sobre la empresa, con la referencia acotada a las marcas elegidas.

### 2. DOT interpretado en columnas propias
Se agregan `dot_semana` (smallint) y `dot_anio` (smallint) a `eam_neumatico`, con índice compuesto `(estado, dot_anio)`:
- se calculan con `interpretar_dot(dot, fecha_registro)` al crear o editar la llanta;
- se rellenan una vez para las existentes con una sentencia SQL dentro del candado, sin cargar filas en Python;
- un DOT inválido deja ambas en NULL, y eso se muestra como «Sin DOT válido».

*Alternativa descartada:* interpretar el DOT en cada consulta con expresiones regulares en SQL. No se puede indexar, y con 96 mil llantas el filtro sería lento.

### 3. I.R. con el contador de reencauches
I.R. = `AVG(reencauches)` sobre el grupo:
- **a piso**: llantas con `estado` montado y `activo_id` no nulo;
- **descarte**: llantas en `BAJA`; el contador no cambia después de la baja, así que mide las vidas alcanzadas.

La distribución por número de reencauches sale del mismo `GROUP BY`. Se comprueba contra `/neumaticos/{nid}/vidas`, que el contador coincide con las vidas de reencauche registradas. Si en algún dato difieren, la tarea de verificación lo reporta antes de decidir cuál manda.

### 4. Tablero general: tres agrupaciones en una respuesta
`GET /eam/neumaticos/reportes/rendimiento` acepta `dimensiones=marca,referencia,medida` y devuelve las tres en una sola llamada, porque el cálculo por vida ya está hecho y agrupar tres veces es barato. Además:
- la referencia se rotula «Marca · Referencia»;
- el parque montado y el I.R. a piso van en `GET /eam/neumaticos/reportes/parque`, que es un agregado SQL aparte, porque no dependen de las vidas.

En el frontend, `TableroRendimiento` pasa del selector a **tres paneles visibles**, y el selector sigue para las demás categorías.

### 5. Tablero de descarte: un endpoint de agregados
`GET /eam/neumaticos/reportes/descarte` devuelve, en una sola llamada:
- el reparto por daño (con «Sin motivo registrado» para `dano_id` NULL) y por motivo de fin de vida;
- el cruce marca × daño y referencia × daño, con las primeras N filas más «Otras»;
- el I.R. con su distribución;
- la serie mensual por `fecha_baja`.

Cada parte es un `GROUP BY` sobre bajas filtradas con un índice parcial por `fecha_baja` sobre `estado = 'BAJA'`, que ya existe. La lista de descarte recibe los mismos filtros y `dano_id`/`motivo_fin_vida_id` para el salto desde el tablero.

### 6. Histórico: conteos en una consulta
El histórico pide `GET /eam/neumaticos/{nid}/resumen-historial`, que devuelve:
- los conteos de inspecciones y de `ROTACION` y `VOLTEO`, totales y desde el inicio de la vida actual (la fecha de inicio de la última vida, en `eam_vida_neumatico`);
- la fecha de la última de cada una.

Se resuelve con un solo `SELECT` de agregados con `FILTER`. El detalle filtrado usa las rutas que ya existen (`/movimientos` e inspecciones).

### 7. Novedades y sugerencias en un solo motor
`core/neumaticos_novedades.py` evalúa, sobre la última inspección de cada llanta (la misma consulta LATERAL de estado-flota), dos cosas:
- las **novedades fijas** de la especificación, con los umbrales de `eam_neumatico_config` (más un margen de alerta y un umbral de desgaste irregular que se agregan a esa configuración);
- las **reglas de sugerencia**.

Las reglas viven en `eam_regla_sugerencia_neumatico` (nombre, tipo, prioridad, texto con marcadores, activa) y `eam_regla_sugerencia_condicion` (campo, operador, valor). Los campos admitidos son una lista cerrada en el código, que mapea cada nombre a un valor calculado de la inspección. Por eso una condición nunca es SQL ni código, y una regla nueva solo puede usar variables conocidas.

*Alternativa descartada:* expresiones libres evaluadas. Son más flexibles, pero inseguras e imposibles de validar al guardar.

### 8. PDF en el servidor, con cola para flotas grandes
`core/informe_flota_pdf.py` arma el PDF con `fpdf2`:
- portada con el resumen ejecutivo y sus tablas de reparto (barras dibujadas con rectángulos);
- una página por vehículo, con el esquema a la izquierda (portado de `dibujarEsquema`) y la tabla por posición a la derecha;
- sugerencias al pie.

La generación corre en `asyncio.to_thread`, y los datos se cargan por trozos de vehículos:
- **hasta 200 vehículos**: la respuesta es directa;
- **más de 200**: se encola en una tabla de trabajos con `SKIP LOCKED`, siguiendo el patrón de la cola de reuniones, para que lo tome un solo proceso de los cuatro. El archivo queda en el almacenamiento de adjuntos y la pantalla consulta el estado hasta poder descargarlo.

`reporteFlotaPDF.ts` se retira cuando el nuevo informe esté verificado.

### 9. Configuración
En *Configuración* de llantas se agregan dos cosas:
- la sección «Reglas de sugerencia», con un editor de condiciones (campo, operador y valor de listas cerradas) y una vista previa que dice cuántas llantas cumplen hoy la regla;
- los dos umbrales nuevos de novedad: el margen de alerta de profundidad y la diferencia entre hombros para desgaste irregular.

## Risks / Trade-offs

- **[`reencauches` desalineado con las vidas registradas en algunos datos importados]** → la tarea 1.3 lo mide en `carga`. Si hay diferencias, se corrige el dato y no la fórmula.
- **[Texto de marca o referencia con variantes (mayúsculas o espacios)]** → se agrupa por `upper(trim())`. Las variantes reales que aparezcan se listan para unificarlas en el catálogo.
- **[DOT de cuatro dígitos con año ambiguo, por ejemplo llantas anteriores al 2000]** → se interpreta desde el 2000, y una fecha posterior al registro se marca como inválida.
- **[PDF de miles de páginas]** → se genera por trozos en segundo plano. Si pasa de un tamaño razonable, se ofrece partirlo por tipo de vehículo o por zona.
- **[Reglas de sugerencia que se contradicen]** → se muestran todas, ordenadas por prioridad, cada una con su regla. Con los documentos del usuario se ajustan las prioridades.

## Migration Plan

Las columnas `dot_semana` y `dot_anio`, sus índices, el relleno, las tablas de reglas, la siembra de reglas iniciales y la tabla de trabajos de informes se crean en `_migrar_esquema` dentro del advisory lock. Son cambios aditivos. Las rutas existentes conservan su contrato: `rendimiento` sin `dimensiones` sigue respondiendo como hoy. Para revertir, se vuelve a la versión anterior; las columnas y tablas nuevas quedan sin uso.

## Open Questions

- El contenido de las reglas definitivas de sugerencia: sale de los documentos que el usuario entregará y se carga como configuración, sin cambiar el motor.
- El logo para el informe: si la empresa ya tiene uno guardado en la plataforma, se usa ese; si no, se agrega su carga en la configuración de la empresa.
